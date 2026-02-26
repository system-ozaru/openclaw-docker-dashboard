import { readdir, readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import type { BroadcastJob, AgentJobResult } from "./broadcastTypes";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const DEFAULT_STORE_DIR = path.join(FLEET_ROOT, "data", "broadcast");
const STORE_DIR = process.env.BROADCAST_STORE_PATH || DEFAULT_STORE_DIR;
const MAX_AGE_DAYS = 7;

let dirReady = false;

async function ensureDir() {
  if (dirReady) return;
  await mkdir(STORE_DIR, { recursive: true });
  dirReady = true;
}

function stripResponseText(results: AgentJobResult[]): AgentJobResult[] {
  return results.map(({ responseText, ...rest }) => rest);
}

export async function saveJob(job: BroadcastJob): Promise<void> {
  try {
    await ensureDir();
    const sanitized: BroadcastJob = {
      ...job,
      results: stripResponseText(job.results),
    };
    const filePath = path.join(STORE_DIR, `${job.id}.json`);
    await writeFile(filePath, JSON.stringify(sanitized, null, 2), "utf-8");
    pruneExpired().catch(() => {});
  } catch { /* fire-and-forget — don't break the broadcast flow */ }
}

export async function loadAll(): Promise<BroadcastJob[]> {
  try {
    await ensureDir();
    const entries = await readdir(STORE_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith(".json"));

    const jobs: BroadcastJob[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(path.join(STORE_DIR, file), "utf-8");
        const job: BroadcastJob = JSON.parse(raw);
        jobs.push(job);
      } catch { /* skip malformed files */ }
    }

    jobs.sort((a, b) => b.createdAt - a.createdAt);
    return jobs;
  } catch {
    return [];
  }
}

export async function pruneExpired(): Promise<number> {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let pruned = 0;

  try {
    await ensureDir();
    const entries = await readdir(STORE_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(STORE_DIR, file);
        const raw = await readFile(filePath, "utf-8");
        const job: { completedAt?: number; createdAt?: number } = JSON.parse(raw);
        const timestamp = job.completedAt ?? job.createdAt ?? 0;

        if (timestamp > 0 && timestamp < cutoff) {
          await unlink(filePath);
          pruned++;
        }
      } catch { /* skip files we can't parse */ }
    }
  } catch { /* directory issues — ignore */ }

  return pruned;
}
