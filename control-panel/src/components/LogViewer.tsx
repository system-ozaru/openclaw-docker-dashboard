"use client";

import { useState, useEffect, useRef } from "react";

interface LogViewerProps {
  agentId: string;
}

export default function LogViewer({ agentId }: LogViewerProps) {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/logs`);
      const data = await res.json();
      setLogs(data.logs || "No logs available");
    } catch {
      setLogs("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [agentId]);

  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        height: "min(480px, calc(70vh - var(--bottom-nav-height)))",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Container Logs
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{
              color: autoScroll ? "var(--green)" : "var(--text-muted)",
              background: autoScroll ? "var(--green-subtle)" : "transparent",
            }}
          >
            {autoScroll ? "Auto-scroll" : "Paused"}
          </button>
          <button
            onClick={fetchLogs}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
          >
            Refresh
          </button>
        </div>
      </div>
      <pre
        ref={preRef}
        className="p-4 text-xs overflow-auto flex-1"
        style={{
          color: "var(--text-secondary)",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          lineHeight: "1.6",
        }}
      >
        {loading ? "Loading..." : logs}
      </pre>
    </div>
  );
}
