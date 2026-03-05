"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PayloadMsg {
  text: string;
  isFinal: boolean;
}

interface ChatMessage {
  role: "user" | "agent";
  payloads?: PayloadMsg[];
  text?: string;
  durationMs?: number;
  model?: string;
  isHistory?: boolean;
}

interface SessionInfo {
  key: string;
  sessionId: string;
  updatedAt: number;
  model?: string;
}

interface ChatPanelProps {
  agentId: string;
  agentName: string;
  onModelChanged?: (model: string) => void;
}

function formatSessionLabel(s: SessionInfo): string {
  const shortKey = s.key.replace("agent:main:", "");
  const date = new Date(s.updatedAt);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${shortKey} (${day} ${time})`;
}

export default function ChatPanel({ agentId, agentName, onModelChanged }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveModel, setLiveModel] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("control-panel");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSessionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/sessions`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch { /* ignore */ }
  }, [agentId]);

  const loadHistory = useCallback(async (sessionId: string) => {
    setLoadingHistory(true);
    setMessages([]);
    setHistoryCount(0);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/history?sessionId=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();
      const histMsgs: ChatMessage[] = (data.messages ?? []).map(
        (m: { role: string; text: string }) => ({
          role: m.role === "user" ? "user" : "agent",
          text: m.text,
          payloads: m.role === "assistant"
            ? [{ text: m.text, isFinal: true }]
            : undefined,
          isHistory: true,
        })
      );
      setMessages(histMsgs);
      setHistoryCount(histMsgs.length);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }, [agentId]);

  useEffect(() => {
    fetchSessions();
    loadHistory("control-panel");
  }, [fetchSessions, loadHistory]);

  const handleSwitchSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowSessionPicker(false);
    loadHistory(sessionId);
  };

  const handleNewSession = () => {
    const newId = `cp-${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setHistoryCount(0);
    setShowSessionPicker(false);
    fetchSessions();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const res = await fetch(`/api/agents/${agentId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: activeSessionId }),
      });
      const data = await res.json();

      if (data.model && data.model !== "unknown") {
        setLiveModel(data.model);
        onModelChanged?.(data.model);
      }

      if (data.newSessionId) {
        setActiveSessionId(data.newSessionId);
        setHistoryCount(0);
        fetchSessions();
      }

      const payloads: PayloadMsg[] = data.payloads || [
        { text: data.text || data.error || "No response", isFinal: true },
      ];

      setMessages((prev) => {
        const msgs = data.newSessionId
          ? [{ role: "user" as const, text }]
          : prev;
        return [
          ...msgs,
          { role: "agent", payloads, durationMs: data.durationMs, model: data.model },
        ];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", payloads: [{ text: "Error: failed to reach agent", isFinal: true }] },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderAgentMessage = (msg: ChatMessage, msgIdx: number) => {
    if (msg.isHistory) {
      return (
        <div key={msgIdx} className="flex justify-start">
          <div
            className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
            style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }}
          >
            {msg.text}
          </div>
        </div>
      );
    }

    const payloads = msg.payloads || [{ text: msg.text || "", isFinal: true }];
    return (
      <div key={msgIdx} className="space-y-1.5">
        {payloads.map((p, i) => (
          <div key={i} className="flex justify-start">
            <div
              className="max-w-[85%] rounded-lg px-3 py-2"
              style={{
                background: p.isFinal ? "var(--bg-hover)" : "transparent",
                border: p.isFinal ? "none" : "1px solid var(--border)",
                color: p.isFinal ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: p.isFinal ? "0.875rem" : "0.75rem",
              }}
            >
              {!p.isFinal && <span className="text-xs mr-1.5" style={{ opacity: 0.5 }}>⟳</span>}
              <span className="whitespace-pre-wrap">{p.text}</span>
            </div>
          </div>
        ))}
        {msg.durationMs !== undefined && msg.durationMs > 0 && (
          <div className="text-xs pl-1" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            {(msg.durationMs / 1000).toFixed(1)}s
            {msg.model && ` · ${msg.model.split("/").pop()}`}
            {payloads.length > 1 && ` · ${payloads.length} steps`}
          </div>
        )}
      </div>
    );
  };

  const activeLabel = activeSessionId === "control-panel"
    ? "control-panel"
    : activeSessionId.startsWith("cp-")
      ? `Session ${activeSessionId.slice(3)}`
      : activeSessionId;

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", height: "480px" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium shrink-0" style={{ color: "var(--text-primary)" }}>
            {agentName}
          </span>
          <div ref={pickerRef} className="relative">
            <button
              onClick={() => setShowSessionPicker(!showSessionPicker)}
              className="text-xs px-2 py-0.5 rounded cursor-pointer truncate max-w-[140px]"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              {activeLabel}
            </button>
            {showSessionPicker && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-lg border overflow-hidden z-50"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={handleNewSession}
                  className="w-full px-3 py-2 text-xs text-left cursor-pointer border-b"
                  style={{
                    color: "var(--accent)",
                    borderColor: "var(--border)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  + New Session
                </button>
                <div className="max-h-48 overflow-y-auto">
                  {sessions.map((s) => {
                    const sid = s.key.replace("agent:main:", "");
                    const isActive = sid === activeSessionId || s.sessionId === activeSessionId;
                    return (
                      <button
                        key={s.key}
                        onClick={() => handleSwitchSession(sid)}
                        className="w-full px-3 py-2 text-xs text-left cursor-pointer"
                        style={{
                          background: isActive ? "var(--accent-subtle)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--text-primary)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {formatSessionLabel(s)}
                      </button>
                    );
                  })}
                  {sessions.length === 0 && (
                    <div className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      No sessions yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {liveModel && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--accent)" }}>⬡</span>
              {liveModel.split("/").pop()}
            </span>
          )}
          <button
            onClick={handleNewSession}
            className="text-xs px-2 py-0.5 rounded cursor-pointer"
            style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
          >
            New
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingHistory && (
          <div className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Loading history...
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
            Send a message to start chatting
          </div>
        )}
        {messages.map((msg, i) => {
          const showSeparator =
            historyCount > 0 && i === historyCount && !loadingHistory;

          return (
            <div key={i}>
              {showSeparator && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    Live conversation
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>
              )}
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                    style={{
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      opacity: msg.isHistory ? 0.7 : 1,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ) : (
                renderAgentMessage(msg, i)
              )}
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              <div
                className="w-3 h-3 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Send a message..."
            className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
