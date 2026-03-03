"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProxyHealthResult } from "@/lib/types";

interface ProxyPanelProps {
  agentId: string;
  proxyEnabled?: boolean;
}

export default function ProxyPanel({ agentId, proxyEnabled }: ProxyPanelProps) {
  const [health, setHealth] = useState<ProxyHealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(proxyEnabled ?? false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/health/${agentId}`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }, [agentId, enabled]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleToggle = async () => {
    setToggling(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/agent/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setEnabled(!enabled);
        setMessage(!enabled ? "Proxy enabled — click Apply to restart containers" : "Proxy disabled — click Apply to restart containers");
      }
    } catch {
      setMessage("Failed to update proxy config");
    }
    setToggling(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/proxy/apply", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Proxy changes applied — containers restarting");
        setTimeout(fetchHealth, 10000);
      } else {
        setMessage(data.error || "Failed to apply");
      }
    } catch {
      setMessage("Failed to apply proxy changes");
    }
    setApplying(false);
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Proxy
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
            style={{
              background: enabled ? "var(--accent)" : "var(--bg-secondary)",
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
              style={{
                background: "white",
                transform: enabled ? "translateX(18px)" : "translateX(3px)",
              }}
            />
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {enabled && (
        <div className="space-y-2">
          {loading && !health ? (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Checking proxy health...
            </div>
          ) : health?.proxyEnabled ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: health.proxyHealthy ? "var(--green)" : "var(--red)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {health.proxyHealthy ? "Proxy connected" : "Proxy unreachable"}
                </span>
              </div>

              {health.publicIp && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Public IP: <span style={{ color: "var(--accent)" }}>{health.publicIp}</span>
                </div>
              )}

              {health.latencyMs != null && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Latency: {health.latencyMs}ms
                </div>
              )}

              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Type: {health.proxyType} &middot; {health.proxyHost}:{health.proxyPort}
              </div>

              {health.session && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Session: {health.session}
                </div>
              )}

              <button
                onClick={fetchHealth}
                disabled={loading}
                className="text-xs px-2 py-0.5 rounded border cursor-pointer mt-1"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                }}
              >
                {loading ? "Checking..." : "Refresh"}
              </button>
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Proxy enabled but container not running. Click Apply to start.
            </div>
          )}
        </div>
      )}

      {message && (
        <div
          className="text-xs mt-2 px-2 py-1 rounded"
          style={{
            background: "var(--accent-subtle)",
            color: "var(--accent)",
          }}
        >
          {message}
        </div>
      )}

      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleApply}
          disabled={applying}
          className="text-xs px-3 py-1.5 rounded cursor-pointer"
          style={{
            background: "var(--accent)",
            color: "white",
            opacity: applying ? 0.6 : 1,
          }}
        >
          {applying ? "Applying..." : "Apply & Restart"}
        </button>
        <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
          Regenerates compose and restarts containers
        </span>
      </div>
    </div>
  );
}
