import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { HeartbeatConfig, HeartbeatInfo } from "./types";
import { isZeabur } from "./fleetMode";
import { ensureAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";
import { sendRequest } from "./wsGateway";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");

function configPath(agentId: string): string {
  return path.join(AGENTS_DIR, agentId, "openclaw.json");
}

function heartbeatMdPath(agentId: string): string {
  return path.join(AGENTS_DIR, agentId, "workspace", "HEARTBEAT.md");
}

async function readConfig(agentId: string): Promise<Record<string, unknown>> {
  const raw = await readFile(configPath(agentId), "utf-8");
  return JSON.parse(raw);
}

async function writeConfig(agentId: string, config: Record<string, unknown>): Promise<void> {
  await writeFile(configPath(agentId), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export async function getHeartbeatConfig(agentId: string): Promise<HeartbeatInfo> {
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    const config = await sendRequest<Record<string, unknown>>(
      meta.serviceId, meta.port, meta.token, "config.get"
    );
    const agents = config.agents as Record<string, unknown> | undefined;
    const defaults = agents?.defaults as Record<string, unknown> | undefined;
    const hb = defaults?.heartbeat as HeartbeatConfig | undefined;

    let heartbeatMd = "";
    try {
      heartbeatMd = await zeabur.executeCommand(meta.serviceId, [
        "cat", "/home/openclaw/.openclaw/workspace/HEARTBEAT.md"
      ]);
    } catch { /* file missing */ }

    return { config: hb ?? null, heartbeatMd };
  }

  const config = await readConfig(agentId);
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const hb = defaults?.heartbeat as HeartbeatConfig | undefined;

  let heartbeatMd = "";
  try {
    heartbeatMd = await readFile(heartbeatMdPath(agentId), "utf-8");
  } catch { /* file missing */ }

  return { config: hb ?? null, heartbeatMd };
}

export async function setHeartbeatConfig(
  agentId: string,
  heartbeat: HeartbeatConfig
): Promise<void> {
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    await sendRequest(meta.serviceId, meta.port, meta.token, "config.set", {
      path: "agents.defaults.heartbeat", value: heartbeat,
    });
    return;
  }
  const config = await readConfig(agentId);
  if (!config.agents) config.agents = {};
  const agents = config.agents as Record<string, unknown>;
  if (!agents.defaults) agents.defaults = {};
  const defaults = agents.defaults as Record<string, unknown>;
  defaults.heartbeat = heartbeat;
  await writeConfig(agentId, config);
}

export async function setHeartbeatMd(agentId: string, content: string): Promise<void> {
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    await zeabur.executeCommand(meta.serviceId, [
      "sh", "-c", `cat > /home/openclaw/.openclaw/workspace/HEARTBEAT.md << 'HBEOF'\n${content}\nHBEOF`
    ]);
    return;
  }
  await writeFile(heartbeatMdPath(agentId), content, "utf-8");
}

export async function listAgentIds(): Promise<string[]> {
  if (isZeabur()) {
    const services = await zeabur.listAgentServices();
    return services.map((s) => s.name).sort();
  }
  const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith("agent-"))
    .map((e) => e.name)
    .sort();
}

export async function setFleetHeartbeat(heartbeat: HeartbeatConfig): Promise<void> {
  const ids = await listAgentIds();
  await Promise.all(ids.map((id) => setHeartbeatConfig(id, heartbeat)));
}

export async function setFleetHeartbeatMd(content: string): Promise<void> {
  const ids = await listAgentIds();
  await Promise.all(ids.map((id) => setHeartbeatMd(id, content)));
}
