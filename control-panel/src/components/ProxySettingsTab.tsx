"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProxyConfig, ProxyHealthResult } from "@/lib/types";

export default function ProxySettingsTab() {
  const [config, setConfig] = useState<ProxyConfig | null>(null);
  const [healthData, setHealthData] = useState<ProxyHealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Webshare integration
  const [wsApiKey, setWsApiKey] = useState("");
  const [wsTesting, setWsTesting] = useState(false);
  const [wsAssigning, setWsAssigning] = useState(false);
  const [wsProxyCount, setWsProxyCount] = useState<number | null>(null);
  const [wsAssignments, setWsAssignments] = useState<{ agentId: string; ip: string; country: string }[]>([]);
  const [wsMessage, setWsMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [host, setHost] = useState("");
  const [port, setPort] = useState("7777");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [proxyType, setProxyType] = useState("http-connect");
  const [sessionPrefix, setSessionPrefix] = useState("openclaw");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/proxy/config");
        const data: ProxyConfig = await res.json();
        setConfig(data);
        const dp = data.defaultProvider;
        setHost(dp.host || "");
        setPort(String(dp.port || 7777));
        setUsername(dp.username || "");
        setPassword(dp.password === "••••••" ? "" : dp.password || "");
        setProxyType(dp.type || "http-connect");
        setSessionPrefix(dp.sessionPrefix || "openclaw");
      } catch {
        setMessage({ type: "err", text: "Failed to load proxy config" });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Partial<ProxyConfig> = {
        defaultProvider: {
          type: proxyType,
          host,
          port: parseInt(port) || 7777,
          username,
          password: password || (config?.defaultProvider?.password === "••••••" ? "••••••" : ""),
          sessionMode: "sticky",
          sessionPrefix,
        },
      };

      const res = await fetch("/api/proxy/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Provider settings saved" });
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
      const res = await fetch("/api/proxy/apply", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Docker Compose regenerated and containers restarting" });
      } else {
        setMessage({ type: "err", text: data.error || "Apply failed" });
      }
    } catch {
      setMessage({ type: "err", text: "Network error" });
    }
    setApplying(false);
  };

  const fetchHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch("/api/proxy/health");
      const data = await res.json();
      setHealthData(data.proxies || []);
    } catch {
      setMessage({ type: "err", text: "Failed to fetch proxy health" });
    }
    setCheckingHealth(false);
  }, []);

  const handleToggleAgent = async (agentId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/proxy/agent/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (data.success && config) {
        setConfig({
          ...config,
          agents: {
            ...config.agents,
            [agentId]: { ...config.agents[agentId], enabled: !currentEnabled },
          },
        });
      }
    } catch { /* ignore */ }
  };

  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        setAgents((data.agents || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
      } catch { /* ignore */ }
    })();
  }, []);

  const handleWebshareTest = async () => {
    if (!wsApiKey.trim()) return;
    setWsTesting(true);
    setWsMessage(null);
    setWsProxyCount(null);
    try {
      const res = await fetch(`/api/proxy/webshare?apiKey=${encodeURIComponent(wsApiKey.trim())}`);
      const data = await res.json();
      if (data.error) {
        setWsMessage({ type: "err", text: data.error });
      } else {
        setWsProxyCount(data.count);
        setWsMessage({ type: "ok", text: `✓ Connected — ${data.count} valid proxies available` });
      }
    } catch {
      setWsMessage({ type: "err", text: "Failed to reach Webshare API" });
    }
    setWsTesting(false);
  };

  const handleWebshareAssign = async () => {
    if (!wsApiKey.trim()) return;
    setWsAssigning(true);
    setWsMessage(null);
    setWsAssignments([]);
    try {
      const res = await fetch("/api/proxy/webshare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: wsApiKey.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setWsMessage({ type: "err", text: data.error });
      } else {
        setWsAssignments(data.assignments ?? []);
        setWsMessage({
          type: "ok",
          text: `✓ Assigned ${data.proxiesAvailable} proxies across ${data.agentsConfigured} agents. Click Apply & Restart below to activate.`,
        });
      }
    } catch {
      setWsMessage({ type: "err", text: "Network error" });
    }
    setWsAssigning(false);
  };

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading proxy configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Webshare.io Auto-assign ─────────────────────────────── */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Webshare.io Auto-assign
          </h3>
          <a
            href="https://proxy.webshare.io/userapi/access"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: "var(--accent)" }}
          >
            Get API key ↗
          </a>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Paste your Webshare API key and click <strong>Auto-assign</strong> — each agent will be given its own
          dedicated proxy IP and credentials automatically. No manual setup needed even for 200+ agents.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="password"
            value={wsApiKey}
            onChange={(e) => setWsApiKey(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            placeholder="Webshare API key"
            onKeyDown={(e) => e.key === "Enter" && handleWebshareTest()}
          />
          <button
            onClick={handleWebshareTest}
            disabled={wsTesting || !wsApiKey.trim()}
            className="text-xs px-3 py-2 rounded border cursor-pointer disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
          >
            {wsTesting ? "Testing..." : "Test"}
          </button>
          <button
            onClick={handleWebshareAssign}
            disabled={wsAssigning || !wsApiKey.trim()}
            className="text-xs px-4 py-2 rounded cursor-pointer disabled:opacity-50 font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {wsAssigning ? "Assigning..." : "Auto-assign"}
          </button>
        </div>

        {wsMessage && (
          <div
            className="text-xs px-3 py-2 rounded mb-3"
            style={{
              background: wsMessage.type === "ok" ? "var(--green-subtle)" : "rgba(255,0,0,0.1)",
              color: wsMessage.type === "ok" ? "var(--green)" : "var(--red)",
            }}
          >
            {wsMessage.text}
          </div>
        )}

        {wsAssignments.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Assignment preview ({wsAssignments.length} agents):
            </div>
            {wsAssignments.map((a) => (
              <div
                key={a.agentId}
                className="flex items-center justify-between px-2 py-1 rounded text-xs"
                style={{ background: "var(--bg-primary)" }}
              >
                <span style={{ color: "var(--text-secondary)" }}>{a.agentId}</span>
                <span className="font-mono" style={{ color: "var(--accent)" }}>
                  {a.ip}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                >
                  {a.country}
                </span>
              </div>
            ))}
          </div>
        )}

        {wsProxyCount !== null && wsAssignments.length === 0 && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {wsProxyCount} proxies ready. Click <strong>Auto-assign</strong> to distribute them across your agents.
          </div>
        )}
      </div>

      {/* Provider settings */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Default Proxy Provider
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Configure your residential/datacenter proxy service credentials. These apply to all agents with proxy enabled
          unless overridden per-agent. Use <code>{"{session}"}</code> in the username for sticky sessions.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Proxy Type</label>
            <select
              value={proxyType}
              onChange={(e) => setProxyType(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="http-connect">HTTP Connect</option>
              <option value="http-relay">HTTP Relay</option>
              <option value="socks5">SOCKS5</option>
              <option value="socks4">SOCKS4</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Session Prefix</label>
            <input
              type="text"
              value={sessionPrefix}
              onChange={(e) => setSessionPrefix(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="openclaw"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="gate.smartproxy.com"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="7777"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
              Username <span style={{ color: "var(--accent)" }}>({"{session}"} = agent ID)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="user-session-{session}"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="Enter password (leave blank to keep current)"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--accent)", color: "white", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save Provider"}
          </button>
        </div>
      </div>

      {/* Per-agent proxy toggle */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Per-Agent Proxy
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Toggle proxy on/off per agent. Each proxied agent gets a sidecar container with transparent routing.
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={checkingHealth}
            className="text-xs px-3 py-1.5 rounded border cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
          >
            {checkingHealth ? "Checking..." : "Check Health"}
          </button>
        </div>

        <div className="space-y-2">
          {agents.map((agent) => {
            const isEnabled = config?.agents?.[agent.id]?.enabled ?? false;
            const healthInfo = healthData.find((h) => h.agentId === agent.id);

            return (
              <div
                key={agent.id}
                className="flex items-center justify-between px-3 py-2 rounded border"
                style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAgent(agent.id, isEnabled)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
                    style={{ background: isEnabled ? "var(--accent)" : "var(--bg-secondary)" }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
                      style={{
                        background: "white",
                        transform: isEnabled ? "translateX(18px)" : "translateX(3px)",
                      }}
                    />
                  </button>
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {agent.name}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {agent.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {healthInfo?.proxyEnabled && (
                    <>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: healthInfo.proxyHealthy ? "var(--green)" : "var(--red)" }}
                      />
                      {healthInfo.publicIp && (
                        <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>
                          {healthInfo.publicIp}
                        </span>
                      )}
                    </>
                  )}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: isEnabled ? "var(--accent-subtle)" : "var(--bg-secondary)",
                      color: isEnabled ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {isEnabled ? "Proxied" : "Direct"}
                  </span>
                </div>
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              No agents found
            </div>
          )}
        </div>
      </div>

      {/* Apply */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Apply Changes
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          After changing provider settings or toggling agents, click Apply to regenerate Docker Compose
          and restart all containers with the new proxy configuration.
        </p>
        <button
          onClick={handleApply}
          disabled={applying}
          className="text-xs px-4 py-2 rounded cursor-pointer font-medium"
          style={{ background: "var(--accent)", color: "white", opacity: applying ? 0.6 : 1 }}
        >
          {applying ? "Applying..." : "Apply & Restart All Containers"}
        </button>
      </div>

      {message && (
        <div
          className="text-xs px-3 py-2 rounded"
          style={{
            background: message.type === "ok" ? "var(--green-subtle)" : "var(--red-subtle, rgba(255,0,0,0.1))",
            color: message.type === "ok" ? "var(--green)" : "var(--red)",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
