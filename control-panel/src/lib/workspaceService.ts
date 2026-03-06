import { readdir, readFile, writeFile, stat } from "fs/promises";
import path from "path";
import { isZeabur, isRelay } from "./fleetMode";
import { ensureAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";
import { relayGet, relayPut } from "./relayClient";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");
const ZEABUR_AGENT_ROOT = "/home/openclaw/.openclaw";

function agentRoot(agentId: string): string {
  return path.join(AGENTS_DIR, agentId);
}

export type FileGroup = "config" | "workspace" | "skill" | "internal";

export interface WorkspaceFile {
  name: string;
  relativePath: string;
  group: FileGroup;
  readonly?: boolean;
}

const SKIP_DIRS = new Set(["canvas", "logs", "node_modules", ".openclaw"]);
const SKIP_EXTENSIONS = new Set([".bak", ".log"]);
const SKIP_FILES = new Set(["update-check.json"]);

function classifyFile(relPath: string): { group: FileGroup; name: string; readonly?: boolean } | null {
  const parts = relPath.split("/");
  const fileName = parts[parts.length - 1];

  if (SKIP_FILES.has(fileName)) return null;
  if (SKIP_EXTENSIONS.has(path.extname(fileName))) return null;
  if (parts.some((p) => SKIP_DIRS.has(p))) return null;

  if (parts[0] === "workspace") {
    const wsRel = parts.slice(1).join("/");
    if (parts[1] === "skills" && parts.length > 2) {
      return { group: "skill", name: parts.slice(2).join("/") };
    }
    return { group: "workspace", name: wsRel };
  }

  if (relPath === "openclaw.json" || parts[0] === "cron") {
    return { group: "config", name: relPath };
  }

  if (parts[0] === "agents" && parts.length > 1) {
    if (relPath.endsWith(".jsonl")) return null;
    return { group: "internal", name: relPath, readonly: true };
  }

  if (parts[0] === "devices" || parts[0] === "identity" || parts[0] === "credentials") {
    return { group: "internal", name: relPath, readonly: true };
  }

  return null;
}

async function scanDir(dir: string, prefix: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          results.push(...await scanDir(path.join(dir, entry.name), rel));
        }
      } else {
        results.push(rel);
      }
    }
  } catch { /* dir missing */ }
  return results;
}

export async function listWorkspaceFiles(agentId: string): Promise<WorkspaceFile[]> {
  if (isRelay()) {
    const res = await relayGet<{ files: WorkspaceFile[] }>(`/api/agents/${agentId}/files`);
    return res.files;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    const files: WorkspaceFile[] = [];
    try {
      const output = await zeabur.executeCommand(meta.serviceId, [
        "find", ZEABUR_AGENT_ROOT,
        "-type", "f",
        "-not", "-path", "*/canvas/*",
        "-not", "-path", "*/logs/*",
        "-not", "-path", "*/.openclaw/*",
        "-not", "-name", "*.bak",
        "-not", "-name", "*.log",
        "-not", "-name", "update-check.json",
        "-not", "-name", "*.jsonl",
      ]);
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        const rel = line.replace(`${ZEABUR_AGENT_ROOT}/`, "");
        const classified = classifyFile(rel);
        if (!classified) continue;
        files.push({
          name: classified.name,
          relativePath: rel,
          group: classified.group,
          readonly: classified.readonly,
        });
      }
    } catch { /* agent root missing */ }
    return files;
  }

  const root = agentRoot(agentId);
  const allPaths = await scanDir(root, "");
  const files: WorkspaceFile[] = [];
  for (const rel of allPaths) {
    const classified = classifyFile(rel);
    if (!classified) continue;
    files.push({
      name: classified.name,
      relativePath: rel,
      group: classified.group,
      readonly: classified.readonly,
    });
  }
  return files;
}

export async function readWorkspaceFile(agentId: string, relativePath: string): Promise<string> {
  const sanitized = relativePath.replace(/\.\./g, "");
  if (isRelay()) {
    const res = await relayGet<{ content: string }>(`/api/agents/${agentId}/files/read?path=${encodeURIComponent(sanitized)}`);
    return res.content;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    return zeabur.executeCommand(meta.serviceId, ["cat", `${ZEABUR_AGENT_ROOT}/${sanitized}`]);
  }
  const filePath = path.join(agentRoot(agentId), sanitized);
  return readFile(filePath, "utf-8");
}

export async function writeWorkspaceFile(
  agentId: string,
  relativePath: string,
  content: string
): Promise<void> {
  const sanitized = relativePath.replace(/\.\./g, "");
  if (isRelay()) {
    await relayPut(`/api/agents/${agentId}/files/write`, { path: sanitized, content });
    return;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    await zeabur.executeCommand(meta.serviceId, [
      "sh", "-c", `cat > ${ZEABUR_AGENT_ROOT}/${sanitized} << 'WSEOF'\n${content}\nWSEOF`
    ]);
    return;
  }
  const filePath = path.join(agentRoot(agentId), sanitized);
  await writeFile(filePath, content, "utf-8");
}
