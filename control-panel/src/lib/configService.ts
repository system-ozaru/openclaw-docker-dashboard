import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isZeabur, isRelay } from "./fleetMode";
import { ensureAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";
import { sendRequest } from "./wsGateway";
import { relayGet, relayPost, relayPut } from "./relayClient";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");
const TEMPLATE_PATH = path.join(FLEET_ROOT, "templates", "openclaw.json.tpl");

const UNIQUE_FIELDS = ["gateway.port", "gateway.auth.token"] as const;

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  return dotPath.split(".").reduce(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    obj as unknown
  );
}

function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

export async function readTemplate(): Promise<string> {
  if (isRelay()) {
    const res = await relayGet<{ template: string }>("/api/config/template");
    return res.template;
  }
  return readFile(TEMPLATE_PATH, "utf-8");
}

export async function writeTemplate(content: string): Promise<void> {
  if (isRelay()) {
    await relayPut("/api/config/template", { template: content });
    return;
  }
  JSON.parse(content.replace(/\$\{[^}]+\}/g, '"__placeholder__"'));
  await writeFile(TEMPLATE_PATH, content, "utf-8");
}

export async function readAgentConfig(agentId: string): Promise<string> {
  if (isRelay()) {
    const res = await relayGet<{ config: string }>(`/api/config/agent/${agentId}`);
    return res.config;
  }
  if (isZeabur()) {
    try {
      const meta = await ensureAgentMeta(agentId);
      const config = await sendRequest<Record<string, unknown>>(
        meta.serviceId, meta.port, meta.token, "config.get"
      );
      return JSON.stringify(config, null, 2);
    } catch { /* fall through to executeCommand */ }
    const services = await zeabur.listAgentServices();
    const svc = services.find((s) => s.name === agentId);
    if (svc) {
      const output = await zeabur.executeCommand(svc.serviceId, [
        "cat", "/home/openclaw/.openclaw/openclaw.json"
      ]);
      return output;
    }
    throw new Error(`Agent not found: ${agentId}`);
  }
  const configPath = path.join(AGENTS_DIR, agentId, "openclaw.json");
  return readFile(configPath, "utf-8");
}

export async function writeAgentConfig(
  agentId: string,
  content: string
): Promise<void> {
  JSON.parse(content); // validate
  if (isRelay()) {
    await relayPut(`/api/config/agent/${agentId}`, { config: content });
    return;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    const parsed = JSON.parse(content);
    await sendRequest(meta.serviceId, meta.port, meta.token, "config.patch", { config: parsed });
    return;
  }
  const configPath = path.join(AGENTS_DIR, agentId, "openclaw.json");
  await writeFile(configPath, content, "utf-8");
}

export async function listAgentIds(): Promise<string[]> {
  if (isRelay()) {
    const res = await relayGet<{ agents: { id: string }[] }>("/api/agents");
    return (res.agents ?? []).map((a) => a.id).sort();
  }
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

export async function applyConfigToAllAgents(
  sourceJson: string
): Promise<{ updated: string[]; errors: string[] }> {
  if (isRelay()) {
    return relayPost<{ updated: string[]; errors: string[] }>("/api/config/fleet", { config: sourceJson });
  }

  const sourceConfig = JSON.parse(sourceJson);
  const agentIds = await listAgentIds();
  const updated: string[] = [];
  const errors: string[] = [];

  if (isZeabur()) {
    for (const agentId of agentIds) {
      try {
        const meta = await ensureAgentMeta(agentId);
        await sendRequest(meta.serviceId, meta.port, meta.token, "config.patch", {
          config: sourceConfig,
        });
        updated.push(agentId);
      } catch (err) {
        errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { updated, errors };
  }

  for (const agentId of agentIds) {
    try {
      const existing = JSON.parse(await readAgentConfig(agentId));
      const uniqueValues: Record<string, unknown> = {};
      for (const field of UNIQUE_FIELDS) {
        uniqueValues[field] = getNestedValue(existing, field);
      }

      const merged = JSON.parse(JSON.stringify(sourceConfig));
      for (const field of UNIQUE_FIELDS) {
        if (uniqueValues[field] !== undefined) {
          setNestedValue(merged, field, uniqueValues[field]);
        }
      }
      merged.agents.defaults.workspace = "/home/openclaw/.openclaw/workspace";

      const configPath = path.join(AGENTS_DIR, agentId, "openclaw.json");
      await writeFile(configPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
      updated.push(agentId);
    } catch (err) {
      errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { updated, errors };
}

export async function bulkSetModel(
  agentIds: string[],
  modelFullId: string
): Promise<{ updated: string[]; errors: string[] }> {
  if (isRelay()) {
    return relayPost<{ updated: string[]; errors: string[] }>("/api/fleet/model", { agentIds, model: modelFullId });
  }

  const updated: string[] = [];
  const errors: string[] = [];

  if (isZeabur()) {
    for (const agentId of agentIds) {
      try {
        const meta = await ensureAgentMeta(agentId);
        await sendRequest(meta.serviceId, meta.port, meta.token, "config.set", {
          path: "agents.defaults.model.primary", value: modelFullId,
        });
        updated.push(agentId);
      } catch (err) {
        errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { updated, errors };
  }

  for (const agentId of agentIds) {
    try {
      const configPath = path.join(AGENTS_DIR, agentId, "openclaw.json");
      const config = JSON.parse(await readFile(configPath, "utf-8"));
      if (!config.agents) config.agents = {};
      if (!config.agents.defaults) config.agents.defaults = {};
      if (!config.agents.defaults.model) config.agents.defaults.model = {};
      config.agents.defaults.model.primary = modelFullId;
      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      updated.push(agentId);
    } catch (err) {
      errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { updated, errors };
}
