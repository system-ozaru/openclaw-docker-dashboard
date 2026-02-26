import { readdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import type { AgentConfig, AgentStatus, FleetOverview, ModelOption, MoltbookClaimStatus } from "./types";
import { isZeabur } from "./fleetMode";
import * as zeabur from "./zeaburService";
import { sendRequest } from "./wsGateway";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");

// --- Agent logical ID → Zeabur metadata mapping ---
const agentMap = new Map<string, { serviceId: string; port: number; token: string }>();

export function getAgentMeta(agentId: string) {
  return agentMap.get(agentId);
}

function parseIdentityField(content: string, field: string): string {
  const regex = new RegExp(`^- \\*\\*${field}:\\*\\*\\s*(.+)$`, "m");
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

// ===================== Docker mode =====================

async function dockerDiscoverAgent(agentId: string): Promise<AgentConfig> {
  const agentDir = path.join(AGENTS_DIR, agentId);
  const configPath = path.join(agentDir, "openclaw.json");
  const identityPath = path.join(agentDir, "workspace", "IDENTITY.md");
  const moltbookCredPath = path.join(
    agentDir, "workspace", "skills", "moltbook", ".credentials"
  );

  const configRaw = await readFile(configPath, "utf-8");
  const config = JSON.parse(configRaw);

  let name = agentId;
  let vibe = "";
  let emoji = "";
  try {
    const identity = await readFile(identityPath, "utf-8");
    name = parseIdentityField(identity, "Name") || agentId;
    vibe = parseIdentityField(identity, "Vibe");
    emoji = parseIdentityField(identity, "Emoji");
  } catch { /* identity file missing is fine */ }

  let moltbookName: string | null = null;
  let moltbookRegistered = false;
  let moltbookClaimUrl: string | null = null;
  let moltbookClaimStatus: MoltbookClaimStatus = "unclaimed";
  try {
    const creds = await readFile(moltbookCredPath, "utf-8");
    const keyMatch = creds.match(/^MOLTBOOK_API_KEY=(.+)$/m);
    const nameMatch = creds.match(/^MOLTBOOK_AGENT_NAME=(.+)$/m);
    const claimUrlMatch = creds.match(/^MOLTBOOK_CLAIM_URL=(.+)$/m);
    if (keyMatch?.[1]) {
      moltbookRegistered = true;
      moltbookName = nameMatch?.[1] ?? null;
      moltbookClaimUrl = claimUrlMatch?.[1] ?? null;
      moltbookClaimStatus = "pending_claim";
    }
  } catch { /* no moltbook credentials */ }

  const heartbeatEvery = config.agents?.defaults?.heartbeat?.every ?? null;

  let cronJobCount = 0;
  try {
    const cronPath = path.join(agentDir, "cron", "jobs.json");
    const cronRaw = await readFile(cronPath, "utf-8");
    const cronData = JSON.parse(cronRaw);
    cronJobCount = (cronData.jobs ?? []).filter((j: { enabled?: boolean }) => j.enabled).length;
  } catch { /* no cron file */ }

  const currentModel = config.agents?.defaults?.model?.primary ?? "unknown";
  const availableModels: ModelOption[] = [];
  const providers = config.models?.providers ?? {};
  for (const [providerKey, provider] of Object.entries(providers)) {
    const p = provider as { models?: { id: string; name: string }[] };
    for (const model of p.models ?? []) {
      availableModels.push({
        id: model.id,
        name: model.name,
        provider: providerKey,
        fullId: `${providerKey}/${model.id}`,
      });
    }
  }

  return {
    id: agentId,
    name,
    vibe,
    emoji,
    port: config.gateway?.port ?? 0,
    gatewayToken: config.gateway?.auth?.token ?? "",
    moltbookName,
    moltbookRegistered,
    moltbookClaimUrl,
    moltbookClaimStatus,
    currentModel,
    availableModels,
    heartbeatEvery,
    cronJobCount,
  };
}

async function dockerSetAgentModel(agentId: string, modelFullId: string): Promise<void> {
  const configPath = path.join(AGENTS_DIR, agentId, "openclaw.json");
  const configRaw = await readFile(configPath, "utf-8");
  const config = JSON.parse(configRaw);
  if (!config.agents) config.agents = {};
  if (!config.agents.defaults) config.agents.defaults = {};
  if (!config.agents.defaults.model) config.agents.defaults.model = {};
  config.agents.defaults.model.primary = modelFullId;
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

async function dockerCheckHealth(port: number): Promise<{ running: boolean; healthy: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://host.docker.internal:${port}/__openclaw__/health`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return { running: true, healthy: res.ok };
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`http://localhost:${port}/`, { signal: controller.signal });
      clearTimeout(timeout);
      return { running: res.ok || res.status === 401, healthy: res.ok };
    } catch {
      return { running: false, healthy: false };
    }
  }
}

async function dockerGetAgentStatus(agentId: string): Promise<AgentStatus> {
  const config = await dockerDiscoverAgent(agentId);
  const { running, healthy } = await dockerCheckHealth(config.port);
  return { ...config, containerStatus: running ? "running" : "stopped", healthy };
}

async function dockerGetFleetOverview(): Promise<FleetOverview> {
  const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
  const agentDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("agent-"))
    .map((e) => e.name)
    .sort();
  const agents = await Promise.all(agentDirs.map(dockerGetAgentStatus));
  const totalRunning = agents.filter((a) => a.containerStatus === "running").length;
  return { agents, totalRunning, totalStopped: agents.length - totalRunning, totalAgents: agents.length };
}

// ===================== Zeabur mode =====================

const ZEABUR_GATEWAY_PORT_DEFAULT = 18789;

function resolveGatewayPort(vars: Record<string, string>): number {
  const p = parseInt(vars.OPENCLAW_GATEWAY_PORT ?? "", 10);
  return isNaN(p) ? ZEABUR_GATEWAY_PORT_DEFAULT : p;
}

function resolveGatewayToken(vars: Record<string, string>): string {
  // OPENCLAW_GATEWAY_TOKEN may be a Zeabur variable reference like ${PASSWORD}
  const raw = vars.OPENCLAW_GATEWAY_TOKEN ?? "";
  const match = raw.match(/^\$\{(.+)\}$/);
  if (match) return vars[match[1]] ?? "";
  return raw || vars.PASSWORD || "";
}

async function zeaburCheckHealth(serviceId: string, port: number): Promise<{ running: boolean; healthy: boolean }> {
  try {
    const url = `${zeabur.getInternalUrl(serviceId, port)}/__openclaw__/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return { running: true, healthy: res.ok };
  } catch {
    return { running: false, healthy: false };
  }
}

function extractConfigFields(config: Record<string, unknown>): {
  currentModel: string;
  availableModels: ModelOption[];
  heartbeatEvery: string | null;
  port: number;
  gatewayToken: string;
} {
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const model = defaults?.model as Record<string, unknown> | undefined;
  const hb = defaults?.heartbeat as Record<string, unknown> | undefined;
  const gw = config.gateway as Record<string, unknown> | undefined;
  const auth = gw?.auth as Record<string, unknown> | undefined;

  const currentModel = (model?.primary as string) ?? "unknown";
  const availableModels: ModelOption[] = [];
  const providers = (config.models as Record<string, unknown>)?.providers as Record<string, unknown> ?? {};
  for (const [providerKey, provider] of Object.entries(providers)) {
    const p = provider as { models?: { id: string; name: string }[] };
    for (const m of p.models ?? []) {
      availableModels.push({ id: m.id, name: m.name, provider: providerKey, fullId: `${providerKey}/${m.id}` });
    }
  }

  return {
    currentModel,
    availableModels,
    heartbeatEvery: (hb?.every as string) ?? null,
    port: (gw?.port as number) ?? ZEABUR_GATEWAY_PORT_DEFAULT,
    gatewayToken: (auth?.token as string) ?? "",
  };
}

async function zeaburDiscoverAgent(agentId: string): Promise<AgentConfig> {
  const services = await zeabur.listAgentServices();
  const svc = services.find((s) => s.name === agentId || s.serviceId === agentId);
  if (!svc) throw new Error(`Agent service not found: ${agentId}`);

  // Get config via WS
  let config: Record<string, unknown> = {};
  let cronJobCount = 0;
  let gatewayPort = ZEABUR_GATEWAY_PORT_DEFAULT;
  let gatewayToken = "";
  try {
    const vars = await zeabur.getServiceVariables(svc.serviceId);
    gatewayPort = resolveGatewayPort(vars);
    gatewayToken = resolveGatewayToken(vars);
    config = await sendRequest<Record<string, unknown>>(
      svc.serviceId, gatewayPort, gatewayToken, "config.get"
    );
    // config.get returns { path, exists, raw } — parse the raw JSON
    if (typeof (config as { raw?: string }).raw === "string") {
      try { config = JSON.parse((config as { raw: string }).raw); } catch { /* keep as-is */ }
    }

    // Cache in agent map
    agentMap.set(agentId, { serviceId: svc.serviceId, port: gatewayPort, token: gatewayToken });

    try {
      const cronResult = await sendRequest<{ jobs?: { enabled?: boolean }[] }>(
        svc.serviceId, gatewayPort, gatewayToken, "cron.list"
      );
      cronJobCount = (cronResult.jobs ?? []).filter((j) => j.enabled).length;
    } catch { /* cron not available */ }
  } catch { /* agent may be offline — use defaults */ }

  const { currentModel, availableModels, heartbeatEvery } = extractConfigFields(config);

  // Read IDENTITY.md via executeCommand
  let name = agentId;
  let vibe = "";
  let emoji = "";
  try {
    const identity = await zeabur.executeCommand(svc.serviceId, [
      "cat", "/home/openclaw/.openclaw/workspace/IDENTITY.md"
    ]);
    name = parseIdentityField(identity, "Name") || agentId;
    vibe = parseIdentityField(identity, "Vibe");
    emoji = parseIdentityField(identity, "Emoji");
  } catch { /* identity missing */ }

  // Read moltbook credentials
  let moltbookName: string | null = null;
  let moltbookRegistered = false;
  let moltbookClaimUrl: string | null = null;
  let moltbookClaimStatus: MoltbookClaimStatus = "unclaimed";
  try {
    const creds = await zeabur.executeCommand(svc.serviceId, [
      "cat", "/home/openclaw/.openclaw/workspace/skills/moltbook/.credentials"
    ]);
    const keyMatch = creds.match(/^MOLTBOOK_API_KEY=(.+)$/m);
    const nameMatch = creds.match(/^MOLTBOOK_AGENT_NAME=(.+)$/m);
    const claimUrlMatch = creds.match(/^MOLTBOOK_CLAIM_URL=(.+)$/m);
    if (keyMatch?.[1]) {
      moltbookRegistered = true;
      moltbookName = nameMatch?.[1] ?? null;
      moltbookClaimUrl = claimUrlMatch?.[1] ?? null;
      moltbookClaimStatus = "pending_claim";
    }
  } catch { /* no moltbook credentials */ }

  const details = await zeabur.getServiceDetails(svc.serviceId);
  const publicDomain = details.domains?.[0]?.domain ?? undefined;

  return {
    id: agentId,
    name,
    vibe,
    emoji,
    port: gatewayPort,
    gatewayToken,
    moltbookName,
    moltbookRegistered,
    moltbookClaimUrl,
    moltbookClaimStatus,
    currentModel,
    availableModels,
    heartbeatEvery,
    cronJobCount,
    serviceId: svc.serviceId,
    internalHostname: svc.internalHostname,
    publicDomain,
  };
}

async function zeaburGetAgentStatus(agentId: string): Promise<AgentStatus> {
  const config = await zeaburDiscoverAgent(agentId);
  const { running, healthy } = await zeaburCheckHealth(config.serviceId!, config.port);
  return { ...config, containerStatus: running ? "running" : "stopped", healthy };
}

async function zeaburGetFleetOverview(): Promise<FleetOverview> {
  const services = await zeabur.listAgentServices();
  const CONCURRENCY = 20;
  const agents: AgentStatus[] = [];

  for (let i = 0; i < services.length; i += CONCURRENCY) {
    const batch = services.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (svc) => {
        try {
          return await zeaburGetAgentStatus(svc.name);
        } catch {
          return {
            id: svc.name,
            name: svc.name,
            vibe: "",
            emoji: "",
            port: ZEABUR_GATEWAY_PORT_DEFAULT,
            gatewayToken: "",
            moltbookName: null,
            moltbookRegistered: false,
            moltbookClaimUrl: null,
            moltbookClaimStatus: "unknown" as MoltbookClaimStatus,
            currentModel: "unknown",
            availableModels: [],
            heartbeatEvery: null,
            cronJobCount: 0,
            serviceId: svc.serviceId,
            internalHostname: svc.internalHostname,
            containerStatus: svc.status === "RUNNING" ? "running" as const : "stopped" as const,
            healthy: false,
          };
        }
      })
    );
    agents.push(...results);
  }

  const totalRunning = agents.filter((a) => a.containerStatus === "running").length;
  return { agents, totalRunning, totalStopped: agents.length - totalRunning, totalAgents: agents.length };
}

async function zeaburSetAgentModel(agentId: string, modelFullId: string): Promise<void> {
  const meta = agentMap.get(agentId);
  if (!meta) throw new Error(`No cached metadata for agent: ${agentId}`);
  await sendRequest(
    meta.serviceId, meta.port, meta.token,
    "config.set",
    { path: "agents.defaults.model.primary", value: modelFullId }
  );
}

// ===================== Public API — delegates by mode =====================

export async function discoverAgent(agentId: string): Promise<AgentConfig> {
  return isZeabur() ? zeaburDiscoverAgent(agentId) : dockerDiscoverAgent(agentId);
}

export async function setAgentModel(agentId: string, modelFullId: string): Promise<void> {
  return isZeabur() ? zeaburSetAgentModel(agentId, modelFullId) : dockerSetAgentModel(agentId, modelFullId);
}

export async function getAgentStatus(agentId: string): Promise<AgentStatus> {
  return isZeabur() ? zeaburGetAgentStatus(agentId) : dockerGetAgentStatus(agentId);
}

export async function getFleetOverview(): Promise<FleetOverview> {
  return isZeabur() ? zeaburGetFleetOverview() : dockerGetFleetOverview();
}
