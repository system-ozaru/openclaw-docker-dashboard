export type BroadcastJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export type AgentJobStatus =
  | "queued"
  | "waking"
  | "sending"
  | "success"
  | "timeout"
  | "error"
  | "skipped";

export interface BroadcastConfig {
  batchSize: number;
  delayBetweenBatchesMs: number;
  timeoutPerAgentMs: number;
  maxRetries: number;
  autoWake: boolean;
  autoSleepAfterMin: number;
  targetFilter: "all" | "running" | "selected" | "random";
  selectedAgentIds?: string[];
  randomCount?: number;
  sessionId?: string;
}

export const DEFAULT_BROADCAST_CONFIG: BroadcastConfig = {
  batchSize: 5,
  delayBetweenBatchesMs: 3000,
  timeoutPerAgentMs: 120000,
  maxRetries: 1,
  autoWake: true,
  autoSleepAfterMin: 5,
  targetFilter: "all",
};

export interface AgentJobResult {
  agentId: string;
  agentName: string;
  emoji: string;
  status: AgentJobStatus;
  responseText?: string;
  durationMs?: number;
  model?: string;
  error?: string;
  retryCount: number;
}

export interface BroadcastJob {
  id: string;
  sessionId: string;
  message: string;
  config: BroadcastConfig;
  status: BroadcastJobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  totalAgents: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  results: AgentJobResult[];
}

export interface BroadcastProgressEvent {
  type: "agent_update" | "batch_start" | "batch_complete" | "job_complete" | "snapshot";
  jobId: string;
  agentResult?: AgentJobResult;
  batchIndex?: number;
  totalBatches?: number;
  job?: BroadcastJob;
}
