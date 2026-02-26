export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  fullId: string;
}

export type MoltbookClaimStatus = "unclaimed" | "pending_claim" | "claimed" | "unknown";

export interface AgentConfig {
  id: string;
  name: string;
  vibe: string;
  emoji: string;
  port: number;
  gatewayToken: string;
  moltbookName: string | null;
  moltbookRegistered: boolean;
  moltbookClaimUrl: string | null;
  moltbookClaimStatus: MoltbookClaimStatus;
  currentModel: string;
  availableModels: ModelOption[];
  heartbeatEvery: string | null;
  cronJobCount: number;
  serviceId?: string;
  internalHostname?: string;
  publicDomain?: string;
}

export interface AgentStatus extends AgentConfig {
  containerStatus: "running" | "stopped" | "error" | "unknown";
  healthy: boolean;
}

export interface FleetOverview {
  agents: AgentStatus[];
  totalRunning: number;
  totalStopped: number;
  totalAgents: number;
}

export interface MessagePayload {
  text: string;
  isFinal: boolean;
}

export interface MessageResult {
  payloads: MessagePayload[];
  durationMs: number;
  model: string;
}

// --- Heartbeat ---

export interface HeartbeatActiveHours {
  start: string;
  end: string;
  timezone?: string;
}

export interface HeartbeatConfig {
  every: string;
  target?: string;
  model?: string;
  activeHours?: HeartbeatActiveHours;
}

export interface HeartbeatInfo {
  config: HeartbeatConfig | null;
  heartbeatMd: string;
}

// --- Cron Jobs ---

export interface CronSchedule {
  kind: "cron";
  expr: string;
  tz: string;
  staggerMs?: number;
}

export interface CronJobPayload {
  kind: "agentTurn";
  message: string;
  model?: string;
  timeoutSeconds?: number;
}

export interface CronJobDelivery {
  mode: "none" | "announce";
  channel?: string;
  to?: string;
}

export interface CronJobState {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error";
  lastDurationMs?: number;
  consecutiveErrors?: number;
  lastError?: string;
}

export interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: CronSchedule;
  sessionTarget: string;
  wakeMode: string;
  payload: CronJobPayload;
  delivery: CronJobDelivery;
  state: CronJobState;
}

export interface CronJobInput {
  name: string;
  enabled?: boolean;
  schedule: CronSchedule;
  payload: CronJobPayload;
  delivery?: CronJobDelivery;
}
