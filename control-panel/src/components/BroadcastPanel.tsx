"use client";

import { useState } from "react";
import BroadcastConfigDrawer from "./BroadcastConfigDrawer";
import BroadcastJobMonitor from "./BroadcastJobMonitor";
import BroadcastAgentPicker from "./BroadcastAgentPicker";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcastTypes";
import type { BroadcastConfig, BroadcastJob } from "@/lib/broadcastTypes";
import type { AgentStatus } from "@/lib/types";

interface BroadcastPanelProps {
  agents: AgentStatus[];
  agentCount: number;
  runningCount: number;
}

type ViewState = "compose" | "monitoring";

export default function BroadcastPanel({
  agents,
  agentCount,
  runningCount,
}: BroadcastPanelProps) {
  const [view, setView] = useState<ViewState>("compose");
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<BroadcastConfig>({
    ...DEFAULT_BROADCAST_CONFIG,
    randomCount: Math.min(5, agentCount),
  });
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [conversationSessionId, setConversationSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastJob[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const targetCount = resolveTargetCount();

  const handleBroadcast = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const payload: BroadcastConfig = {
        ...config,
        sessionId: conversationSessionId ?? undefined,
      };
      if (config.targetFilter === "selected") {
        payload.selectedAgentIds = Array.from(pickedIds);
      }
      const res = await fetch("/api/fleet/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), config: payload }),
      });
      const job = await res.json();
      if (job.id) {
        setActiveJobId(job.id);
        setConversationSessionId(job.sessionId);
        setView("monitoring");
      }
    } finally {
      setSending(false);
    }
  };

  const handleFollowUp = (followUpMessage: string, sessionId: string, agentIds: string[]) => {
    setConversationSessionId(sessionId);
    setConfig((c) => ({
      ...c,
      targetFilter: "selected",
      selectedAgentIds: agentIds,
      sessionId,
    }));
    setPickedIds(new Set(agentIds));
    launchBroadcast(followUpMessage, sessionId, agentIds);
  };

  const launchBroadcast = async (msg: string, sessionId: string, agentIds: string[]) => {
    const payload: BroadcastConfig = {
      ...config,
      targetFilter: "selected",
      selectedAgentIds: agentIds,
      sessionId,
    };
    const res = await fetch("/api/fleet/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, config: payload }),
    });
    const job = await res.json();
    if (job.id) {
      setActiveJobId(job.id);
      setView("monitoring");
    }
  };

  const handleMonitorClose = () => {
    setActiveJobId(null);
    setMessage("");
    setView("compose");
    fetchHistory();
  };

  const handleNewConversation = () => {
    setConversationSessionId(null);
    setActiveJobId(null);
    setMessage("");
    setConfig((c) => ({ ...c, sessionId: undefined }));
    setView("compose");
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/fleet/broadcast");
      const data = await res.json();
      setHistory(data.jobs ?? []);
    } catch { /* ignore */ }
  };

  if (view === "monitoring" && activeJobId) {
    return (
      <PanelShell>
        <BroadcastJobMonitor
          jobId={activeJobId}
          onClose={handleMonitorClose}
          onFollowUp={handleFollowUp}
          agents={agents}
        />
        {conversationSessionId && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleNewConversation}
              className="text-xs px-3 py-1.5 rounded border cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              New Conversation
            </button>
          </div>
        )}
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Broadcast Message
          </h2>
          {conversationSessionId && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "var(--green-subtle)", color: "var(--green)" }}
            >
              continuing session
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {conversationSessionId && (
            <button
              onClick={handleNewConversation}
              className="text-xs px-2 py-1 rounded cursor-pointer"
              style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
            >
              New Session
            </button>
          )}
          <button
            onClick={() => { fetchHistory(); setShowHistory(!showHistory); }}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--text-muted)", background: "var(--bg-hover)" }}
          >
            {showHistory ? "Hide History" : "History"}
          </button>
        </div>
      </div>

      {showHistory && <HistoryList history={history} onSelect={viewHistoryJob} />}

      <div className="space-y-4">
        <TargetSelector
          value={config.targetFilter}
          onChange={(f) => setConfig((c) => ({ ...c, targetFilter: f }))}
          agentCount={agentCount}
          runningCount={runningCount}
          selectedCount={pickedIds.size}
          randomCount={config.randomCount ?? 5}
          onRandomCountChange={(n) => setConfig((c) => ({ ...c, randomCount: n }))}
        />

        {config.targetFilter === "selected" && (
          <BroadcastAgentPicker
            agents={agents}
            selectedIds={pickedIds}
            onChange={setPickedIds}
          />
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type the message to broadcast to all agents..."
          rows={4}
          className="w-full rounded-lg border p-3 text-sm resize-none outline-none"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />

        <BroadcastConfigDrawer
          config={config}
          onChange={setConfig}
          agentCount={targetCount}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Will send to {targetCount} agent{targetCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleBroadcast}
            disabled={!message.trim() || sending || targetCount === 0}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {sending ? "Starting..." : `Broadcast to ${targetCount} Agents`}
          </button>
        </div>
      </div>
    </PanelShell>
  );

  function resolveTargetCount(): number {
    switch (config.targetFilter) {
      case "running": return runningCount;
      case "selected": return pickedIds.size;
      case "random": return Math.min(config.randomCount ?? 5, agentCount);
      default: return agentCount;
    }
  }

  function viewHistoryJob(job: BroadcastJob) {
    setActiveJobId(job.id);
    setConversationSessionId(job.sessionId);
    setView("monitoring");
    setShowHistory(false);
  }
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-3 sm:p-5"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

function TargetSelector({
  value, onChange, agentCount, runningCount, selectedCount,
  randomCount, onRandomCountChange,
}: {
  value: string;
  onChange: (v: "all" | "running" | "selected" | "random") => void;
  agentCount: number;
  runningCount: number;
  selectedCount: number;
  randomCount: number;
  onRandomCountChange: (n: number) => void;
}) {
  const options: { key: "all" | "running" | "selected" | "random"; label: string; count: number }[] = [
    { key: "all", label: "All", count: agentCount },
    { key: "running", label: "Running", count: runningCount },
    { key: "selected", label: "Pick", count: selectedCount },
    { key: "random", label: "Random", count: Math.min(randomCount, agentCount) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border"
            style={{
              background: value === opt.key ? "var(--accent-subtle)" : "transparent",
              borderColor: value === opt.key ? "var(--accent)" : "var(--border)",
              color: value === opt.key ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {value === "random" && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Pick</span>
          <input
            type="number"
            min={1}
            max={agentCount}
            value={randomCount}
            onChange={(e) => onRandomCountChange(Math.max(1, Math.min(agentCount, Number(e.target.value) || 1)))}
            className="w-16 text-center text-xs rounded border px-2 py-1"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            random agents from {agentCount} total
          </span>
        </div>
      )}
    </div>
  );
}

function HistoryList({
  history, onSelect,
}: {
  history: BroadcastJob[]; onSelect: (j: BroadcastJob) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="text-xs py-3 mb-4" style={{ color: "var(--text-muted)" }}>
        No broadcast history yet.
      </div>
    );
  }

  return (
    <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
      {history.slice(0, 20).map((job) => (
        <button
          key={job.id}
          onClick={() => onSelect(job)}
          className="w-full text-left px-3 py-2 rounded border text-xs cursor-pointer transition-colors"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="truncate flex-1 pr-2" style={{ color: "var(--text-primary)" }}>
              {job.message.slice(0, 60)}{job.message.length > 60 ? "..." : ""}
            </span>
            <span style={{
              color: job.status === "completed" ? "var(--green)"
                : job.status === "failed" ? "var(--red)"
                : "var(--text-muted)",
            }}>
              {job.status}
            </span>
          </div>
          <div className="flex gap-2 mt-1" style={{ color: "var(--text-muted)" }}>
            <span>{job.totalAgents} agents</span>
            <span>{job.successCount} ok</span>
            <span>{job.errorCount} err</span>
            <span>{new Date(job.createdAt).toLocaleString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
