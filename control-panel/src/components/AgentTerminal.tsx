"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AgentTerminalProps {
  agentId: string;
}

interface TerminalEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

const WELCOME = [
  { type: "system" as const, text: "OpenClaw Agent Terminal" },
  { type: "system" as const, text: 'Type any command (e.g. "openclaw status", "openclaw memory index", "ls")' },
  { type: "system" as const, text: 'Type "clear" to reset.\n' },
];

const HISTORY_MAX = 50;

export default function AgentTerminal({ agentId }: AgentTerminalProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>(WELCOME);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(scrollToBottom, [entries, scrollToBottom]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || running) return;

    setInput("");
    setHistoryIdx(-1);

    if (trimmed === "clear") {
      setEntries(WELCOME);
      return;
    }

    setCmdHistory((prev) => {
      const next = [trimmed, ...prev.filter((c) => c !== trimmed)];
      return next.slice(0, HISTORY_MAX);
    });

    setEntries((prev) => [...prev, { type: "input", text: trimmed }]);
    setRunning(true);

    try {
      const res = await fetch(`/api/agents/${agentId}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEntries((prev) => [...prev, { type: "error", text: data.error || `HTTP ${res.status}` }]);
      } else {
        setEntries((prev) => [...prev, { type: "output", text: data.output || "(no output)" }]);
      }
    } catch {
      setEntries((prev) => [...prev, { type: "error", text: "Failed to reach agent" }]);
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setInput(cmdHistory[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput("");
        return;
      }
      const next = historyIdx - 1;
      setHistoryIdx(next);
      setInput(cmdHistory[next]);
    }
  };

  const colorFor = (type: TerminalEntry["type"]) => {
    switch (type) {
      case "input":  return "var(--accent)";
      case "error":  return "var(--red)";
      case "system": return "var(--text-muted)";
      default:       return "var(--text-secondary)";
    }
  };

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        height: "min(480px, calc(70vh - var(--bottom-nav-height)))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--green)" }}>⬤</span>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Terminal
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {agentId}
          </span>
        </div>
        <button
          onClick={() => setEntries(WELCOME)}
          className="text-xs px-2 py-1 rounded cursor-pointer"
          style={{ color: "var(--text-muted)", background: "transparent" }}
        >
          Clear
        </button>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-4"
        style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}
        onClick={() => inputRef.current?.focus()}
      >
          {entries.map((entry, i) => (
          <div key={i} className="text-xs mb-0.5" style={{ lineHeight: "1.6" }}>
            {entry.type === "input" ? (
              <div>
                <span style={{ color: "var(--green)" }}>openclaw@{agentId}</span>
                <span style={{ color: "var(--text-muted)" }}>:~$ </span>
                <span style={{ color: colorFor(entry.type) }}>{entry.text}</span>
              </div>
            ) : (
              <pre
                className="whitespace-pre-wrap m-0"
                style={{ color: colorFor(entry.type) }}
              >
                {entry.text}
              </pre>
            )}
          </div>
        ))}
        {running && (
          <div className="text-xs" style={{ color: "var(--text-muted)", lineHeight: "1.6" }}>
            Running...
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t shrink-0"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        <span
          className="text-xs shrink-0"
          style={{
            color: "var(--green)",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
          }}
        >
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHistoryIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          disabled={running}
          placeholder={running ? "Running..." : "openclaw status, openclaw memory index, ls, cat file.txt ..."}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{
            color: "var(--text-primary)",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={handleSubmit}
          disabled={running || !input.trim()}
          className="text-xs px-3 py-1.5 rounded cursor-pointer shrink-0"
          style={{
            color: running || !input.trim() ? "var(--text-muted)" : "var(--accent)",
            background: running || !input.trim() ? "transparent" : "var(--accent-subtle)",
          }}
        >
          Run
        </button>
      </div>
    </div>
  );
}
