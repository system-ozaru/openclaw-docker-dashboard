import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { CronJob, CronJobInput } from "./types";
import { isZeabur } from "./fleetMode";
import { getAgentMeta } from "./agentDiscovery";
import { sendRequest } from "./wsGateway";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");

function jobsPath(agentId: string): string {
  return path.join(AGENTS_DIR, agentId, "cron", "jobs.json");
}

interface JobsFile {
  version: number;
  jobs: CronJob[];
}

async function readJobsFile(agentId: string): Promise<JobsFile> {
  try {
    const raw = await readFile(jobsPath(agentId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, jobs: [] };
  }
}

async function writeJobsFile(agentId: string, data: JobsFile): Promise<void> {
  const filePath = jobsPath(agentId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function requireMeta(agentId: string) {
  const meta = getAgentMeta(agentId);
  if (!meta) throw new Error(`No cached metadata for agent: ${agentId}`);
  return meta;
}

export async function listJobs(agentId: string): Promise<CronJob[]> {
  if (isZeabur()) {
    const meta = requireMeta(agentId);
    const result = await sendRequest<{ jobs?: CronJob[] }>(
      meta.serviceId, meta.port, meta.token, "cron.list"
    );
    return result.jobs ?? [];
  }
  const data = await readJobsFile(agentId);
  return data.jobs;
}

export async function getJob(agentId: string, jobId: string): Promise<CronJob | null> {
  if (isZeabur()) {
    const jobs = await listJobs(agentId);
    return jobs.find((j) => j.id === jobId) ?? null;
  }
  const data = await readJobsFile(agentId);
  return data.jobs.find((j) => j.id === jobId) ?? null;
}

export async function createJob(agentId: string, input: CronJobInput): Promise<CronJob> {
  if (isZeabur()) {
    const meta = requireMeta(agentId);
    const result = await sendRequest<CronJob>(
      meta.serviceId, meta.port, meta.token, "cron.add", { job: input }
    );
    return result;
  }
  const data = await readJobsFile(agentId);
  const now = Date.now();
  const job: CronJob = {
    id: crypto.randomUUID(),
    agentId: "main",
    name: input.name,
    enabled: input.enabled ?? true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: input.schedule,
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: input.payload,
    delivery: input.delivery ?? { mode: "none" },
    state: {},
  };
  data.jobs.push(job);
  await writeJobsFile(agentId, data);
  return job;
}

export async function updateJob(
  agentId: string,
  jobId: string,
  updates: Partial<CronJobInput> & { enabled?: boolean }
): Promise<CronJob | null> {
  if (isZeabur()) {
    const meta = requireMeta(agentId);
    const result = await sendRequest<CronJob | null>(
      meta.serviceId, meta.port, meta.token, "cron.update", { jobId, updates }
    );
    return result;
  }
  const data = await readJobsFile(agentId);
  const idx = data.jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;
  const job = data.jobs[idx];
  if (updates.name !== undefined) job.name = updates.name;
  if (updates.enabled !== undefined) job.enabled = updates.enabled;
  if (updates.schedule) job.schedule = updates.schedule;
  if (updates.payload) job.payload = updates.payload;
  if (updates.delivery) job.delivery = updates.delivery;
  job.updatedAtMs = Date.now();
  data.jobs[idx] = job;
  await writeJobsFile(agentId, data);
  return job;
}

export async function deleteJob(agentId: string, jobId: string): Promise<boolean> {
  if (isZeabur()) {
    const meta = requireMeta(agentId);
    await sendRequest(meta.serviceId, meta.port, meta.token, "cron.remove", { jobId });
    return true;
  }
  const data = await readJobsFile(agentId);
  const before = data.jobs.length;
  data.jobs = data.jobs.filter((j) => j.id !== jobId);
  if (data.jobs.length === before) return false;
  await writeJobsFile(agentId, data);
  return true;
}
