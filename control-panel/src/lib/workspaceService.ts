import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isZeabur } from "./fleetMode";
import { getAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");
const ZEABUR_WS_ROOT = "/home/openclaw/.openclaw/workspace";

function workspacePath(agentId: string): string {
  return path.join(AGENTS_DIR, agentId, "workspace");
}

export interface WorkspaceFile {
  name: string;
  relativePath: string;
  group: "workspace" | "skill";
}

export async function listWorkspaceFiles(agentId: string): Promise<WorkspaceFile[]> {
  if (isZeabur()) {
    const meta = getAgentMeta(agentId);
    if (!meta) throw new Error(`No cached metadata for agent: ${agentId}`);
    const files: WorkspaceFile[] = [];
    try {
      const output = await zeabur.executeCommand(meta.serviceId, [
        "find", ZEABUR_WS_ROOT, "-name", "*.md", "-type", "f"
      ]);
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        const rel = line.replace(`${ZEABUR_WS_ROOT}/`, "");
        const isSkill = rel.startsWith("skills/");
        files.push({
          name: isSkill ? rel.replace("skills/", "") : rel,
          relativePath: rel,
          group: isSkill ? "skill" : "workspace",
        });
      }
    } catch { /* workspace missing */ }
    return files;
  }

  const wsDir = workspacePath(agentId);
  const files: WorkspaceFile[] = [];

  try {
    const entries = await readdir(wsDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push({ name: entry, relativePath: entry, group: "workspace" });
      }
    }
  } catch { /* workspace missing */ }

  try {
    const skillsDir = path.join(wsDir, "skills");
    const skillDirs = await readdir(skillsDir, { withFileTypes: true });
    for (const sd of skillDirs) {
      if (!sd.isDirectory()) continue;
      const skillPath = path.join(skillsDir, sd.name);
      const skillEntries = await readdir(skillPath);
      for (const entry of skillEntries) {
        if (entry.endsWith(".md")) {
          const rel = `skills/${sd.name}/${entry}`;
          files.push({ name: `${sd.name}/${entry}`, relativePath: rel, group: "skill" });
        }
      }
    }
  } catch { /* no skills */ }

  return files;
}

export async function readWorkspaceFile(agentId: string, relativePath: string): Promise<string> {
  const sanitized = relativePath.replace(/\.\./g, "");
  if (isZeabur()) {
    const meta = getAgentMeta(agentId);
    if (!meta) throw new Error(`No cached metadata for agent: ${agentId}`);
    return zeabur.executeCommand(meta.serviceId, ["cat", `${ZEABUR_WS_ROOT}/${sanitized}`]);
  }
  const filePath = path.join(workspacePath(agentId), sanitized);
  return readFile(filePath, "utf-8");
}

export async function writeWorkspaceFile(
  agentId: string,
  relativePath: string,
  content: string
): Promise<void> {
  const sanitized = relativePath.replace(/\.\./g, "");
  if (isZeabur()) {
    const meta = getAgentMeta(agentId);
    if (!meta) throw new Error(`No cached metadata for agent: ${agentId}`);
    await zeabur.executeCommand(meta.serviceId, [
      "sh", "-c", `cat > ${ZEABUR_WS_ROOT}/${sanitized} << 'WSEOF'\n${content}\nWSEOF`
    ]);
    return;
  }
  const filePath = path.join(workspacePath(agentId), sanitized);
  await writeFile(filePath, content, "utf-8");
}
