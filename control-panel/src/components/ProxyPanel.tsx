"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProxyConfig, ProxyHealthResult } from "@/lib/types";

interface ProxyPanelProps {
  agentId: string;
  proxyEnabled?: boolean;
}

export default function ProxyPanel({ agentId, proxyEnabled }: ProxyPanelProps) {
  const [health, setHealth] = useState<ProxyHealthResult | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(proxyEnabled ?? false);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Provider form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("7777");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [proxyType, setProxyType] = useState("http-connect");

  // Sync enabled state when parent prop updates (e.g. from polling)
  useEffect(() => {
    if (proxyEnabled !== undefined) setEnabled(proxyEnabled);
  }, [proxyEnabled]);

  // Load current provider config + actual per-agent proxy status
  useEffect(() => {
    (async () => {
      try {
        const [configRes, healthRes] = await Promise.all([
          fetch("/api/proxy/config"),
          fetch(`/api/proxy/health/${agentId}`),
        ]);
        const data: ProxyConfig = await configRes.json();
        const dp = data.defaultProvider;
        setHost(dp.host || "");
        setPort(String(dp.port || 7777));
        setUsername(dp.username || "");
        setPassword(dp.password === "••••••" ? "" : dp.password || "");
        setProxyType(dp.type || "http-connect");

        const healthData = await healthRes.json();
        if (typeof healthData.proxyEnabled === "boolean") {
          setEnabled(healthData.proxyEnabled);
        }
      } catch { /* ignore */ }
    })();
  }, [agentId]);

  const fetchHealth = useCallback(async () => {
    if (!enabled) return;
    setLoadingHealth(true);
    try {
      const res = await fetch(`/api/proxy/health/${agentId}`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    }
    setLoadingHealth(false);
  }, [agentId, enabled]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

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
        setMessage({ type: "ok", text: !enabled ? "Proxy enabled — click Apply to restart" : "Proxy disabled — click Apply to restart" });
      }
    } catch {
      setMessage({ type: "err", text: "Failed to update proxy config" });
    }
    setToggling(false);
  };

  const handleSaveProvider = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/proxy/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: {
            type: proxyType,
            host,
            port: parseInt(port) || 7777,
            username,
            password: password || "••••••",
            sessionMode: "sticky",
            sessionPrefix: "openclaw",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Provider saved — click Apply to restart" });
        setShowForm(false);
      } else {
        setMessage({ type: "err", text: data.error || "Save failed" });
      }
    } catch {
      setMessage({ type: "err", text: "Network error" });
    }
    setSaving(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/proxy/apply/${agentId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Applied — container restarting" });
        setTimeout(fetchHealth, 10000);
      } else {
        setMessage({ type: "err", text: data.error || "Apply failed" });
      }
    } catch {
      setMessage({ type: "err", text: "Failed to apply" });
    }
    setApplying(false);
  };

  const s = {
    input: {
      background: "var(--bg-primary)",
      borderColor: "var(--border)",
      color: "var(--text-primary)",
    } as React.CSSProperties,
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Proxy
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
            style={{ background: enabled ? "var(--accent)" : "var(--bg-secondary)" }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
              style={{ background: "white", transform: enabled ? "translateX(18px)" : "translateX(3px)" }}
            />
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {/* Provider config (always shown, collapsible) */}
      <div className="mb-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs flex items-center gap-1 cursor-pointer"
          style={{ color: "var(--accent)" }}
        >
          {showForm ? "▾" : "▸"} {host ? `Provider: ${host}:${port}` : "Configure Proxy Provider"}
        </button>

        {showForm && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Type</label>
                <select
                  value={proxyType}
                  onChange={(e) => setProxyType(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-xs outline-none"
                  style={s.input}
                >
                  <option value="http-connect">HTTP Connect</option>
                  <option value="http-relay">HTTP Relay</option>
                  <option value="socks5">SOCKS5</option>
                  <option value="socks4">SOCKS4</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-xs outline-none"
                  style={s.input}
                  placeholder="7777"
                />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none"
                style={s.input}
                placeholder="gate.smartproxy.com"
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                Username{" "}
                <span style={{ color: "var(--accent)" }}>
                  — use <code>{"{session}"}</code> for per-agent IPs
                </span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none"
                style={s.input}
                placeholder={`user-{session}  →  becomes: user-openclaw-${agentId}`}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none"
                style={s.input}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div
              className="text-xs pt-0.5 px-2 py-1.5 rounded"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
            >
              Each agent gets its own IP — the <code>{"{session}"}</code> in the username is replaced with the agent ID (e.g. <code>openclaw-{agentId}</code>), giving it a unique sticky session from the provider. Provider credentials are shared; IPs are not.
            </div>
            <button
              onClick={handleSaveProvider}
              disabled={saving || !host.trim()}
              className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {saving ? "Saving..." : "Save Provider"}
            </button>
          </div>
        )}
      </div>

      {/* Health info when enabled */}
      {enabled && (
        <div className="space-y-1.5 mb-3">
          {loadingHealth && !health ? (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Checking proxy health...</div>
          ) : health?.proxyEnabled ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: health.proxyHealthy ? "var(--green)" : "var(--red)" }}
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
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Latency: {health.latencyMs}ms</div>
              )}
              <button
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="text-xs px-2 py-0.5 rounded border cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
              >
                {loadingHealth ? "Checking..." : "Refresh"}
              </button>
            </>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Proxy enabled but container not running. Click Apply to start.
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className="text-xs mb-3 px-2 py-1 rounded"
          style={{
            background: message.type === "ok" ? "var(--accent-subtle)" : "rgba(255,0,0,0.1)",
            color: message.type === "ok" ? "var(--accent)" : "var(--red)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Apply footer */}
      <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleApply}
          disabled={applying}
          className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {applying ? "Applying..." : "Apply & Restart"}
        </button>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Restarts only this agent and its proxy sidecar
        </span>
      </div>
    </div>
  );
}
