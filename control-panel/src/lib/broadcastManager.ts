import { discoverAgent, getFleetOverview } from "./agentDiscovery";
import { sendAgentMessage } from "./agentGateway";
import { ensureAgentRunning, scheduleAutoSleep, cancelAutoSleep } from "./lifecycleManager";
import { saveJob as persistJob, loadAll as loadPersistedJobs } from "./broadcastStore";
import type {
  BroadcastJob,
  BroadcastConfig,
  AgentJobResult,
  BroadcastProgressEvent,
} from "./broadcastTypes";

type ProgressListener = (event: BroadcastProgressEvent) => void;

const activeJobs = new Map<string, BroadcastJob>();
const jobListeners = new Map<string, Set<ProgressListener>>();
const jobHistory: BroadcastJob[] = [];
const MAX_HISTORY = 200;

let hydrated = false;

async function hydrateFromStore() {
  if (hydrated) return;
  hydrated = true;
  try {
    const persisted = await loadPersistedJobs();
    for (const job of persisted) {
      if (!jobHistory.some((j) => j.id === job.id)) {
        jobHistory.push(job);
      }
    }
    jobHistory.sort((a, b) => b.createdAt - a.createdAt);
    if (jobHistory.length > MAX_HISTORY) jobHistory.length = MAX_HISTORY;
  } catch { /* store unavailable — start with empty history */ }
}

hydrateFromStore();

export function createBroadcastJob(
  message: string,
  config: BroadcastConfig
): BroadcastJob {
  const sessionId = config.sessionId || `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const job: BroadcastJob = {
    id: generateId(),
    sessionId,
    message,
    config: { ...config, sessionId },
    status: "pending",
    createdAt: Date.now(),
    totalAgents: 0,
    processedCount: 0,
    successCount: 0,
    errorCount: 0,
    results: [],
  };
  activeJobs.set(job.id, job);
  runJob(job);
  return job;
}

export function cancelBroadcastJob(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  if (!job || job.status !== "running") return false;
  job.status = "cancelled";
  job.completedAt = Date.now();
  finalizeJob(job);
  return true;
}

export async function getJob(jobId: string): Promise<BroadcastJob | undefined> {
  await hydrateFromStore();
  return activeJobs.get(jobId) ?? jobHistory.find((j) => j.id === jobId);
}

export async function getAllJobs(): Promise<BroadcastJob[]> {
  await hydrateFromStore();
  const active = Array.from(activeJobs.values());
  return [...active, ...jobHistory].sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeToJob(
  jobId: string,
  listener: ProgressListener
): () => void {
  if (!jobListeners.has(jobId)) {
    jobListeners.set(jobId, new Set());
  }
  jobListeners.get(jobId)!.add(listener);
  return () => {
    jobListeners.get(jobId)?.delete(listener);
    if (jobListeners.get(jobId)?.size === 0) {
      jobListeners.delete(jobId);
    }
  };
}

function emit(jobId: string, event: BroadcastProgressEvent) {
  jobListeners.get(jobId)?.forEach((fn) => fn(event));
}

async function runJob(job: BroadcastJob) {
  try {
    const targetAgents = await resolveTargetAgents(job.config);
    job.totalAgents = targetAgents.length;
    job.status = "running";
    job.startedAt = Date.now();

    job.results = targetAgents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      emoji: a.emoji,
      status: "queued",
      retryCount: 0,
    }));

    const batches = chunkArray(targetAgents, job.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      if ((job.status as string) === "cancelled") break;

      emit(job.id, {
        type: "batch_start",
        jobId: job.id,
        batchIndex: i,
        totalBatches: batches.length,
      });

      await processBatch(job, batches[i]);

      emit(job.id, {
        type: "batch_complete",
        jobId: job.id,
        batchIndex: i,
        totalBatches: batches.length,
        job,
      });

      const isLastBatch = i === batches.length - 1;
      if (!isLastBatch && job.status === "running") {
        await sleep(job.config.delayBetweenBatchesMs);
      }
    }

    if (job.status === "running") {
      job.status = job.errorCount > 0 && job.successCount === 0 ? "failed" : "completed";
    }
  } catch (err) {
    job.status = "failed";
  } finally {
    job.completedAt = Date.now();
    emit(job.id, { type: "job_complete", jobId: job.id, job });
    scheduleAutoSleepForAll(job);
    finalizeJob(job);
  }
}

async function processBatch(
  job: BroadcastJob,
  agents: { id: string; name: string; emoji: string; port: number }[]
) {
  const promises = agents.map((agent) => processAgent(job, agent));
  await Promise.all(promises);
}

async function processAgent(
  job: BroadcastJob,
  agent: { id: string; name: string; emoji: string; port: number },
  retryNumber = 0
) {
  if ((job.status as string) === "cancelled") return;

  const result = job.results.find((r) => r.agentId === agent.id)!;

  if (job.config.autoWake) {
    result.status = "waking";
    emit(job.id, { type: "agent_update", jobId: job.id, agentResult: result });

    cancelAutoSleep(agent.id);
    const awake = await ensureAgentRunning(agent.id, agent.port);
    if (!awake) {
      result.status = "error";
      result.error = "Failed to wake container";
      job.processedCount++;
      job.errorCount++;
      emit(job.id, { type: "agent_update", jobId: job.id, agentResult: result });
      return;
    }
  }

  result.status = "sending";
  emit(job.id, { type: "agent_update", jobId: job.id, agentResult: result });

  const start = Date.now();
  try {
    const agentConfig = await discoverAgent(agent.id);
    const messageResult = await Promise.race([
      sendAgentMessage(
        agentConfig.port,
        agentConfig.gatewayToken,
        job.sessionId,
        job.message
      ),
      rejectAfterTimeout(job.config.timeoutPerAgentMs),
    ]);

    result.status = "success";
    result.durationMs = Date.now() - start;
    result.model = messageResult.model;
    result.responseText = messageResult.payloads
      .map((p) => p.text)
      .join("\n");
    job.successCount++;
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "BROADCAST_TIMEOUT";

    if (retryNumber < job.config.maxRetries) {
      result.retryCount = retryNumber + 1;
      await processAgent(job, agent, retryNumber + 1);
      return;
    }

    result.status = isTimeout ? "timeout" : "error";
    result.error = isTimeout
      ? `Timed out after ${job.config.timeoutPerAgentMs / 1000}s`
      : err instanceof Error ? err.message : String(err);
    result.durationMs = Date.now() - start;
    job.errorCount++;
  }

  job.processedCount++;
  emit(job.id, { type: "agent_update", jobId: job.id, agentResult: result });
}

async function resolveTargetAgents(config: BroadcastConfig) {
  const fleet = await getFleetOverview();
  let agents = fleet.agents;

  if (config.targetFilter === "running") {
    agents = agents.filter((a) => a.containerStatus === "running");
  } else if (config.targetFilter === "selected" && config.selectedAgentIds) {
    const ids = new Set(config.selectedAgentIds);
    agents = agents.filter((a) => ids.has(a.id));
  } else if (config.targetFilter === "random" && config.randomCount) {
    agents = shuffleArray([...agents]).slice(0, config.randomCount);
  }

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    port: a.port,
  }));
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scheduleAutoSleepForAll(job: BroadcastJob) {
  if (job.config.autoSleepAfterMin <= 0) return;
  for (const result of job.results) {
    if (result.status === "success" || result.status === "timeout") {
      scheduleAutoSleep(result.agentId, job.config.autoSleepAfterMin);
    }
  }
}

function finalizeJob(job: BroadcastJob) {
  activeJobs.delete(job.id);
  jobHistory.unshift(job);
  if (jobHistory.length > MAX_HISTORY) jobHistory.pop();
  persistJob(job).catch(() => {});
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function rejectAfterTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("BROADCAST_TIMEOUT")), ms)
  );
}

function generateId(): string {
  return `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
