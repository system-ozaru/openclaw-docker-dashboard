"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import BroadcastAgentChat from "./BroadcastAgentChat";
import type { BroadcastJob, BroadcastProgressEvent, AgentJobResult } from "@/lib/broadcastTypes";
import type { AgentStatus } from "@/lib/types";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

interface BroadcastJobMonitorProps {
  jobId: string;
  onClose: () => void;
  onFollowUp: (message: string, sessionId: string, agentIds: string[]) => void;
  agents?: AgentStatus[];
}

const STATUS_ICON: Record<string, string> = {
  queued: "⏸",
  waking: "🔄",
  sending: "⏳",
  success: "✅",
  timeout: "⏱",
  error: "❌",
  skipped: "⏭",
};

const STATUS_COLOR: Record<string, string> = {
  queued: "var(--text-muted)",
  waking: "var(--yellow)",
  sending: "var(--accent)",
  success: "var(--green)",
  timeout: "var(--yellow)",
  error: "var(--red)",
  skipped: "var(--text-muted)",
};

export default function BroadcastJobMonitor({
  jobId, onClose, onFollowUp, agents,
}: BroadcastJobMonitorProps) {
  const [job, setJob] = useState<BroadcastJob | null>(null);
  const [results, setResults] = useState<AgentJobResult[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [chatAgent, setChatAgent] = useState<AgentJobResult | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const [followUpSending, setFollowUpSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const agentStatusMap = new Map(agents?.map((a) => [a.id, a]) ?? []);

  const toggleExpanded = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }, []);

  useEffect(() => {
    fetch(`/api/fleet/broadcast/${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        setResults(data.results ?? []);
      });
  }, [jobId]);

  useEffect(() => {
    const es = new EventSource(`/api/fleet/broadcast/${jobId}/stream`);

    es.onmessage = (e) => {
      const event: BroadcastProgressEvent = JSON.parse(e.data);

      if (event.type === "snapshot" && event.job) {
        setJob(event.job);
        setResults(event.job.results);
        return;
      }

      if (event.type === "job_complete") {
        if (event.job) {
          setJob(event.job);
          setResults(event.job.results);
        }
        es.close();
        return;
      }

      if (event.job) {
        setJob(event.job);
      }

      if (event.type === "agent_update" && event.agentResult) {
        setResults((prev) =>
          prev.map((r) =>
            r.agentId === event.agentResult!.agentId ? event.agentResult! : r
          )
        );

        if (autoScrollRef.current && scrollRef.current) {
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
        }
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [jobId]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  if (!job) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
        Loading job...
      </div>
    );
  }

  const progressPct = job.totalAgents > 0
    ? Math.round((job.processedCount / job.totalAgents) * 100)
    : 0;

  const isFinished = ["completed", "cancelled", "failed"].includes(job.status);
  const successAgentIds = results.filter((r) => r.status === "success").map((r) => r.agentId);

  const handleFollowUp = async () => {
    if (!followUpText.trim() || followUpSending) return;
    setFollowUpSending(true);
    onFollowUp(followUpText.trim(), job.sessionId, successAgentIds);
    setFollowUpText("");
    setFollowUpSending(false);
  };

  if (chatAgent) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setChatAgent(null)}
          className="text-xs px-2 py-1 rounded cursor-pointer flex items-center gap-1"
          style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
        >
          ← Back to broadcast results
        </button>
        <BroadcastAgentChat
          agentId={chatAgent.agentId}
          agentName={chatAgent.agentName}
          emoji={chatAgent.emoji}
          sessionId={job.sessionId}
          initialResponse={chatAgent.responseText}
          onClose={() => setChatAgent(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Broadcast {isFinished ? statusLabel(job.status) : "in progress..."}
        </h3>
        <button
          onClick={onClose}
          className="text-xs px-2 py-1 rounded cursor-pointer"
          style={{ color: "var(--text-muted)", background: "var(--bg-hover)" }}
        >
          {isFinished ? "Close" : "Back"}
        </button>
      </div>

      <div
        className="text-xs px-3 py-2 rounded"
        style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
      >
        &ldquo;{job.message}&rdquo;
      </div>

      <ProgressBar
        processed={job.processedCount}
        total={job.totalAgents}
        success={job.successCount}
        errors={job.errorCount}
        percentage={progressPct}
      />

      <StatsRow job={job} isFinished={isFinished} />

      {!isFinished && (
        <button
          onClick={handleCancel}
          className="text-xs px-3 py-1.5 rounded border cursor-pointer"
          style={{ borderColor: "var(--red)", color: "var(--red)" }}
        >
          Cancel Broadcast
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="space-y-1 max-h-[36rem] overflow-y-auto"
      >
        {results.map((r) => (
          <AgentResultRow
            key={r.agentId}
            result={r}
            sessionId={job.sessionId}
            expanded={expandedAgents.has(r.agentId)}
            onToggle={() => toggleExpanded(r.agentId)}
            onChat={() => setChatAgent(r)}
            agentStatus={agentStatusMap.get(r.agentId)}
          />
        ))}
      </div>

      {isFinished && successAgentIds.length > 0 && (
        <div
          className="border-t pt-4 space-y-2"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Follow-up broadcast to {successAgentIds.length} responded agents
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
              placeholder="Send follow-up message..."
              className="flex-1 rounded border px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleFollowUp}
              disabled={!followUpText.trim() || followUpSending}
              className="px-4 py-2 rounded text-sm font-medium cursor-pointer disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );

  async function handleCancel() {
    await fetch(`/api/fleet/broadcast/${jobId}`, { method: "DELETE" });
  }
}

function StatsRow({ job, isFinished }: { job: BroadcastJob; isFinished: boolean }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isFinished) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isFinished]);

  return (
    <div className="flex gap-3 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
      <span>Total: {job.totalAgents}</span>
      <span style={{ color: "var(--green)" }}>Success: {job.successCount}</span>
      <span style={{ color: "var(--red)" }}>Errors: {job.errorCount}</span>
      {job.startedAt && (
        <span>Elapsed: {formatElapsed(job.startedAt, job.completedAt)}</span>
      )}
      {!isFinished && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse mt-1"
          style={{ background: "var(--accent)" }}
        />
      )}
    </div>
  );
}

function ProgressBar({
  processed, total, success, errors, percentage,
}: {
  processed: number; total: number; success: number; errors: number; percentage: number;
}) {
  const successPct = total > 0 ? (success / total) * 100 : 0;
  const errorPct = total > 0 ? (errors / total) * 100 : 0;

  return (
    <div>
      <div
        className="h-2 rounded-full overflow-hidden flex"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${successPct}%`, background: "var(--green)" }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${errorPct}%`, background: "var(--red)" }}
        />
      </div>
      <div className="text-right text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {processed}/{total} ({percentage}%)
      </div>
    </div>
  );
}

async function wakeAndSend(
  agentId: string,
  sessionId: string,
  message: string,
  onWaking: () => void
): Promise<{ text: string; error?: boolean }> {
  onWaking();
  try {
    const wakeRes = await fetch(`/api/agents/${agentId}/wake`, { method: "POST" });
    if (!wakeRes.ok) {
      const err = await wakeRes.json().catch(() => ({ error: "Wake failed" }));
      return { text: err.error || "Failed to wake agent", error: true };
    }
  } catch {
    return { text: "Failed to wake agent", error: true };
  }

  const res = await fetch(`/api/agents/${agentId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  const data = await res.json();

  if (data.error) return { text: data.error, error: true };

  const text = data.payloads
    ?.filter((p: { isFinal?: boolean }) => p.isFinal)
    .map((p: { text: string }) => p.text)
    .join("\n") || "No response";
  return { text };
}

function AgentStatusDot({ status }: { status?: AgentStatus }) {
  if (!status) return null;
  const isOnline = status.containerStatus === "running";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      title={isOnline ? "Online" : "Sleeping"}
      style={{ background: isOnline ? "var(--green)" : "var(--text-muted)" }}
    />
  );
}

function AgentResultRow({
  result, sessionId, expanded, onToggle, onChat, agentStatus,
}: {
  result: AgentJobResult; sessionId: string; expanded: boolean;
  onToggle: () => void; onChat: () => void; agentStatus?: AgentStatus;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyState, setReplyState] = useState<"idle" | "waking" | "sending">("idle");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const hasResponse = result.responseText && result.status === "success";
  const isActive = result.status === "waking" || result.status === "sending";
  const isBusy = replyState !== "idle";

  const scrollChatToBottom = useCallback(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }, []);

  useEffect(() => {
    if (!expanded || historyLoaded) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/agents/${result.agentId}/history?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const history: ChatMessage[] = (data.messages ?? []).map(
            (m: { role: string; text: string }) => ({
              role: m.role === "user" ? ("user" as const) : ("agent" as const),
              text: m.text,
            })
          );
          if (history.length > 0) {
            setMessages(history);
          } else if (result.responseText) {
            setMessages([{ role: "agent", text: result.responseText }]);
          }
        } else if (result.responseText) {
          setMessages([{ role: "agent", text: result.responseText }]);
        }
      } catch {
        if (!cancelled && result.responseText) {
          setMessages([{ role: "agent", text: result.responseText }]);
        }
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [expanded, historyLoaded, result.agentId, sessionId, result.responseText]);

  useEffect(() => {
    if (expanded && messages.length > 0) scrollChatToBottom();
  }, [expanded, messages, scrollChatToBottom]);

  const handleReply = async () => {
    if (!replyText.trim() || isBusy) return;
    const msg = replyText.trim();
    setReplyText("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setReplyState("waking");

    try {
      const { text, error } = await wakeAndSend(
        result.agentId, sessionId, msg,
        () => setReplyState("waking")
      );
      setReplyState("idle");
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: error ? `Error: ${text}` : text },
      ]);
    } catch {
      setReplyState("idle");
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Error: failed to reach agent" },
      ]);
    }
  };

  const isOnline = agentStatus?.containerStatus === "running";
  const statusLabel = agentStatus
    ? isOnline ? "online" : "sleeping"
    : undefined;

  return (
    <div
      className="rounded border px-3 py-2 transition-colors"
      style={{
        background: isActive
          ? "var(--accent-subtle)"
          : expanded
            ? "var(--bg-hover)"
            : "var(--bg-card)",
        borderColor: isActive ? "var(--accent)" : "var(--border)",
        cursor: hasResponse ? "pointer" : "default",
      }}
      onClick={hasResponse && !expanded ? onToggle : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{result.emoji || "🤖"}</span>
        <AgentStatusDot status={agentStatus} />
        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {result.agentName}
        </span>
        {statusLabel && (
          <span
            className="text-xs"
            style={{ color: isOnline ? "var(--green)" : "var(--text-muted)" }}
          >
            {statusLabel}
          </span>
        )}
        <span className="flex-1" />
        {hasResponse && expanded && (
          <button
            onClick={(e) => { e.stopPropagation(); onChat(); }}
            className="text-xs px-2 py-0.5 rounded cursor-pointer"
            style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
          >
            Full Chat
          </button>
        )}
        <span className="text-xs" style={{ color: STATUS_COLOR[result.status] }}>
          {STATUS_ICON[result.status]} {result.status}
        </span>
        {result.durationMs != null && (
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {result.retryCount > 0 && (
          <span className="text-xs" style={{ color: "var(--yellow)" }}>
            retry {result.retryCount}
          </span>
        )}
        {hasResponse && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-xs px-1 cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>

      {hasResponse && !expanded && (
        <div
          className="mt-1.5 text-xs truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {result.responseText}
        </div>
      )}

      {hasResponse && expanded && (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div
            ref={chatScrollRef}
            className="rounded p-2 max-h-52 overflow-y-auto space-y-1.5"
            style={{ background: "var(--bg-primary)" }}
          >
            {!historyLoaded && (
              <div className="text-center py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                Loading conversation...
              </div>
            )}
            {historyLoaded && messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap"
                  style={{
                    background: msg.role === "user" ? "var(--accent-subtle)" : "var(--bg-hover)",
                    color: msg.role === "user" ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isBusy && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
                >
                  <div
                    className="w-2 h-2 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                  {replyState === "waking" ? "Waking..." : "Thinking..."}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
              placeholder={`Reply to ${result.agentName}...`}
              disabled={isBusy}
              className="flex-1 rounded border px-2 py-1 text-xs outline-none disabled:opacity-50"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleReply}
              disabled={(!replyText.trim() && !isBusy) || isBusy}
              className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {replyState === "waking" ? "Waking..." : replyState === "sending" ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {result.error && (
        <div className="mt-1 text-xs" style={{ color: "var(--red)" }}>
          {result.error}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed": return "- Complete";
    case "cancelled": return "- Cancelled";
    case "failed": return "- Failed";
    default: return "";
  }
}

function formatElapsed(startMs: number, endMs?: number): string {
  const elapsed = (endMs ?? Date.now()) - startMs;
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
