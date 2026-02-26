import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { MoltbookClaimStatus } from "./types";
import { isZeabur } from "./fleetMode";
import { getAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");
const MOLTBOOK_API = "https://www.moltbook.com/api/v1";
const ZEABUR_CRED_PATH = "/home/openclaw/.openclaw/workspace/skills/moltbook/.credentials";

export interface MoltbookStatus {
  claimStatus: MoltbookClaimStatus;
  claimUrl: string | null;
  agentName: string | null;
}

function credPath(agentId: string): string {
  return path.join(
    AGENTS_DIR, agentId, "workspace", "skills", "moltbook", ".credentials"
  );
}

async function readApiKey(agentId: string): Promise<string | null> {
  try {
    let creds: string;
    if (isZeabur()) {
      const meta = getAgentMeta(agentId);
      if (!meta) return null;
      creds = await zeabur.executeCommand(meta.serviceId, ["cat", ZEABUR_CRED_PATH]);
    } else {
      creds = await readFile(credPath(agentId), "utf-8");
    }
    const match = creds.match(/^MOLTBOOK_API_KEY=(.+)$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function cacheClaimUrl(agentId: string, claimUrl: string): Promise<void> {
  try {
    if (isZeabur()) {
      const meta = getAgentMeta(agentId);
      if (!meta) return;
      let creds = await zeabur.executeCommand(meta.serviceId, ["cat", ZEABUR_CRED_PATH]);
      if (creds.match(/^MOLTBOOK_CLAIM_URL=/m)) {
        creds = creds.replace(/^MOLTBOOK_CLAIM_URL=.*$/m, `MOLTBOOK_CLAIM_URL=${claimUrl}`);
      } else {
        creds = creds.trimEnd() + `\nMOLTBOOK_CLAIM_URL=${claimUrl}\n`;
      }
      await zeabur.executeCommand(meta.serviceId, [
        "sh", "-c", `cat > ${ZEABUR_CRED_PATH} << 'CREDEOF'\n${creds}\nCREDEOF`
      ]);
      return;
    }
    const filePath = credPath(agentId);
    let creds = await readFile(filePath, "utf-8");
    if (creds.match(/^MOLTBOOK_CLAIM_URL=/m)) {
      creds = creds.replace(/^MOLTBOOK_CLAIM_URL=.*$/m, `MOLTBOOK_CLAIM_URL=${claimUrl}`);
    } else {
      creds = creds.trimEnd() + `\nMOLTBOOK_CLAIM_URL=${claimUrl}\n`;
    }
    await writeFile(filePath, creds, "utf-8");
  } catch { /* best-effort caching */ }
}

export async function fetchMoltbookStatus(agentId: string): Promise<MoltbookStatus> {
  const apiKey = await readApiKey(agentId);
  if (!apiKey) {
    return { claimStatus: "unclaimed", claimUrl: null, agentName: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${MOLTBOOK_API}/agents/status`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { claimStatus: "unknown", claimUrl: null, agentName: null };
    }

    const data = await res.json();
    const claimUrl = data.claim_url ?? null;
    const agentName = data.agent?.name ?? null;
    let claimStatus: MoltbookClaimStatus = "unknown";

    if (data.status === "pending_claim") claimStatus = "pending_claim";
    else if (data.status === "active" || data.status === "claimed") claimStatus = "claimed";

    if (claimUrl) {
      await cacheClaimUrl(agentId, claimUrl);
    }

    return { claimStatus, claimUrl, agentName };
  } catch {
    return { claimStatus: "unknown", claimUrl: null, agentName: null };
  }
}

export async function fetchBulkMoltbookStatus(
  agentIds: string[]
): Promise<Record<string, MoltbookStatus>> {
  const results = await Promise.allSettled(
    agentIds.map(async (id) => ({ id, status: await fetchMoltbookStatus(id) }))
  );

  const map: Record<string, MoltbookStatus> = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      map[r.value.id] = r.value.status;
    }
  }
  return map;
}
