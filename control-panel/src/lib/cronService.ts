import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { CronJob, CronJobInput } from "./types";
import { isZeabur, isRelay } from "./fleetMode";
import { ensureAgentMeta } from "./agentDiscovery";
import { sendRequest } from "./wsGateway";
import { relayPost } from "./relayClient";

const FLEET_ROOT = path.resolve(process.cwd(), "..");
const AGENTS_DIR = path.join(FLEET_ROOT, "agents");
const CRON_FILE = "/home/openclaw/.openclaw/cron/jobs.json";

function jobsPath(agentId: string): string {
  return path.join(AGENTS_DIR, agentId, "cron", "jobs.json");
}

interface JobsFile {
  version: number;
  jobs: CronJob[];
}

async function relayExec(agentId: string, command: string): Promise<string> {
  const res = await relayPost<{ output: string }>(
    `/api/agents/${agentId}/exec`, { command }
  );
  return res.output;
}

async function relayReadJobsFile(agentId: string): Promise<JobsFile> {
  try {
    const raw = await relayExec(
      agentId,
      `cat ${CRON_FILE} 2>/dev/null || echo '{"version":1,"jobs":[]}'`
    );
    return JSON.parse(raw);
  } catch {
    return { version: 1, jobs: [] };
  }
}

async function relayWriteJobsFile(agentId: string, data: JobsFile): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const b64 = Buffer.from(json + "\n").toString("base64");
  await relayExec(
    agentId,
    `mkdir -p $(dirname ${CRON_FILE}) && echo '${b64}' | base64 -d > ${CRON_FILE}`
  );
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

export async function listJobs(agentId: string): Promise<CronJob[]> {
  if (isRelay()) {
    const data = await relayReadJobsFile(agentId);
    return data.jobs;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
    const result = await sendRequest<{ jobs?: CronJob[] }>(
      meta.serviceId, meta.port, meta.token, "cron.list"
    );
    return result.jobs ?? [];
  }
  const data = await readJobsFile(agentId);
  return data.jobs;
}

export async function getJob(agentId: string, jobId: string): Promise<CronJob | null> {
  const jobs = await listJobs(agentId);
  return jobs.find((j) => j.id === jobId) ?? null;
}

export async function createJob(agentId: string, input: CronJobInput): Promise<CronJob> {
  if (isRelay()) {
    const data = await relayReadJobsFile(agentId);
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
    await relayWriteJobsFile(agentId, data);
    return job;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
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
  if (isRelay()) {
    const data = await relayReadJobsFile(agentId);
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
    await relayWriteJobsFile(agentId, data);
    return job;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
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
  if (isRelay()) {
    const data = await relayReadJobsFile(agentId);
    const before = data.jobs.length;
    data.jobs = data.jobs.filter((j) => j.id !== jobId);
    if (data.jobs.length === before) return false;
    await relayWriteJobsFile(agentId, data);
    return true;
  }
  if (isZeabur()) {
    const meta = await ensureAgentMeta(agentId);
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
