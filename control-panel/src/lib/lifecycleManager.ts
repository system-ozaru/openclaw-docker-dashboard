import { controlContainer } from "./agentGateway";
import { isZeabur } from "./fleetMode";
import { getAgentMeta } from "./agentDiscovery";
import * as zeabur from "./zeaburService";

interface IdleTimer {
  agentId: string;
  timer: ReturnType<typeof setTimeout>;
  idleSince: number;
}

const idleTimers = new Map<string, IdleTimer>();

export async function ensureAgentRunning(
  agentId: string,
  port: number,
  maxWaitMs = 30000
): Promise<boolean> {
  if (isZeabur()) {
    const meta = getAgentMeta(agentId);
    if (!meta) return false;
    const healthy = await checkZeaburHealth(meta.serviceId, port);
    if (healthy) return true;
    await zeabur.controlService(meta.serviceId, "resume");
    return pollUntilHealthyZeabur(meta.serviceId, port, maxWaitMs);
  }
  const healthy = await checkHealth(port);
  if (healthy) return true;
  await controlContainer(agentId, "start");
  return pollUntilHealthy(port, maxWaitMs);
}

export function scheduleAutoSleep(agentId: string, afterMinutes: number) {
  cancelAutoSleep(agentId);
  if (afterMinutes <= 0) return;

  const timer = setTimeout(async () => {
    idleTimers.delete(agentId);
    try {
      await controlContainer(agentId, "stop");
    } catch { /* container may already be stopped */ }
  }, afterMinutes * 60 * 1000);

  idleTimers.set(agentId, {
    agentId,
    timer,
    idleSince: Date.now(),
  });
}

export function cancelAutoSleep(agentId: string) {
  const existing = idleTimers.get(agentId);
  if (existing) {
    clearTimeout(existing.timer);
    idleTimers.delete(agentId);
  }
}

export function getIdleTimers(): Map<string, IdleTimer> {
  return new Map(idleTimers);
}

async function checkHealth(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://host.docker.internal:${port}/__openclaw__/health`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return res.ok;
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`http://localhost:${port}/`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok || res.status === 401;
    } catch {
      return false;
    }
  }
}

async function pollUntilHealthy(
  port: number,
  maxWaitMs: number
): Promise<boolean> {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < maxWaitMs) {
    await sleep(interval);
    if (await checkHealth(port)) return true;
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkZeaburHealth(serviceId: string, port: number): Promise<boolean> {
  try {
    const url = `${zeabur.getInternalUrl(serviceId, port)}/__openclaw__/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function pollUntilHealthyZeabur(
  serviceId: string,
  port: number,
  maxWaitMs: number
): Promise<boolean> {
  const start = Date.now();
  const interval = 2000;
  while (Date.now() - start < maxWaitMs) {
    await sleep(interval);
    if (await checkZeaburHealth(serviceId, port)) return true;
  }
  return false;
}
