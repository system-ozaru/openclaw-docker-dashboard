"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  durationMs?: number;
  model?: string;
}

type SendState = "idle" | "waking" | "sending";

interface BroadcastAgentChatProps {
  agentId: string;
  agentName: string;
  emoji: string;
  sessionId: string;
  initialResponse?: string;
  onClose: () => void;
}

export default function BroadcastAgentChat({
  agentId,
  agentName,
  emoji,
  sessionId,
  initialResponse,
  onClose,
}: BroadcastAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/agents/${agentId}/history?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;

        const history: ChatMessage[] = (data.messages ?? []).map(
          (m: { role: string; text: string }) => ({
            role: m.role === "user" ? ("user" as const) : ("agent" as const),
            text: m.text,
          })
        );

        if (history.length > 0) {
          setMessages(history);
        } else if (initialResponse) {
          setMessages([{ role: "agent", text: initialResponse }]);
        }
      } catch {
        if (!cancelled && initialResponse) {
          setMessages([{ role: "agent", text: initialResponse }]);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId, sessionId, initialResponse]);

  const handleSend = async () => {
    if (!input.trim() || sendState !== "idle") return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);

    setSendState("waking");
    try {
      const wakeRes = await fetch(`/api/agents/${agentId}/wake`, { method: "POST" });
      if (!wakeRes.ok) {
        const err = await wakeRes.json().catch(() => ({ error: "Wake failed" }));
        setMessages((prev) => [...prev, { role: "agent", text: `Error: ${err.error || "Failed to wake agent"}` }]);
        setSendState("idle");
        return;
      }

      setSendState("sending");
      const res = await fetch(`/api/agents/${agentId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();

      const responseText = data.payloads
        ?.filter((p: { text?: string; isFinal?: boolean }) => p.isFinal)
        .map((p: { text: string }) => p.text)
        .join("\n") || data.error || "No response";

      setMessages((prev) => [
        ...prev,
        { role: "agent", text: responseText, durationMs: data.durationMs, model: data.model },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Error: failed to reach agent" },
      ]);
    } finally {
      setSendState("idle");
    }
  };

  const stateLabel = sendState === "waking" ? "Waking up..." : sendState === "sending" ? "Thinking..." : null;

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", height: "360px" }}
    >
      <div
        className="px-3 py-2 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{emoji || "🤖"}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {agentName}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
            {sessionId}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={{ color: "var(--text-muted)", background: "var(--bg-hover)" }}
        >
          Close
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loadingHistory && (
          <div className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>
            Loading conversation...
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>
            Continue the broadcast conversation with {agentName}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap"
              style={{
                background: msg.role === "user" ? "var(--accent-subtle)" : "var(--bg-hover)",
                color: msg.role === "user" ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              {msg.text}
              {msg.durationMs != null && msg.durationMs > 0 && (
                <div className="mt-1" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {(msg.durationMs / 1000).toFixed(1)}s
                  {msg.model && ` · ${msg.model.split("/").pop()}`}
                </div>
              )}
            </div>
          </div>
        ))}
        {stateLabel && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              <div
                className="w-2.5 h-2.5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
              {stateLabel}
            </div>
          </div>
        )}
      </div>

      <div className="p-2 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message ${agentName}...`}
            disabled={sendState !== "idle"}
            className="flex-1 rounded border px-2.5 py-1.5 text-xs outline-none disabled:opacity-50"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sendState !== "idle" || !input.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
