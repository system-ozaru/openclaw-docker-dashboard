"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProxyConfig, ProxyHealthResult } from "@/lib/types";

const LS_WS_KEY = "openclaw_webshare_api_key";

interface WsProxy {
  id: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  country: string;
}

export default function ProxySettingsTab() {
  const [config, setConfig] = useState<ProxyConfig | null>(null);
  const [healthData, setHealthData] = useState<ProxyHealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  // Default provider fields
  const [host, setHost] = useState("");
  const [port, setPort] = useState("7777");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [proxyType, setProxyType] = useState("http-connect");
  const [sessionPrefix, setSessionPrefix] = useState("openclaw");

  // Webshare integration
  const [wsApiKey, setWsApiKey] = useState("");
  const [wsShowKey, setWsShowKey] = useState(false);
  const [wsTesting, setWsTesting] = useState(false);
  const [wsAssigning, setWsAssigning] = useState(false);
  const [wsProxies, setWsProxies] = useState<WsProxy[]>([]);
  const [wsAssignments, setWsAssignments] = useState<{ agentId: string; ip: string; country: string }[]>([]);
  const [wsMessage, setWsMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Per-agent expand / view
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [checkingAgentId, setCheckingAgentId] = useState<string | null>(null);
  const [applyingAgentId, setApplyingAgentId] = useState<string | null>(null);

  // Per-agent manual override editing
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editHost, setEditHost] = useState("");
  const [editPort, setEditPort] = useState("7777");
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editTesting, setEditTesting] = useState(false);
  const [editTestResult, setEditTestResult] = useState<{ success: boolean; ip?: string; country?: string; org?: string; latencyMs?: number; error?: string } | null>(null);

  // Load saved API key from localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_WS_KEY) : null;
    if (saved) setWsApiKey(saved);
  }, []);

  const handleWsApiKeyChange = (v: string) => {
    setWsApiKey(v);
    if (typeof window !== "undefined") {
      if (v.trim()) localStorage.setItem(LS_WS_KEY, v.trim());
      else localStorage.removeItem(LS_WS_KEY);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [configRes, agentsRes] = await Promise.all([
          fetch("/api/proxy/config"),
          fetch("/api/agents"),
        ]);
        const configData: ProxyConfig = await configRes.json();
        const agentsData = await agentsRes.json();
        setConfig(configData);
        const dp = configData.defaultProvider;
        setHost(dp.host || "");
        setPort(String(dp.port || 7777));
        setUsername(dp.username || "");
        setPassword(dp.password === "••••••" ? "" : dp.password || "");
        setProxyType(dp.type || "http-connect");
        setSessionPrefix(dp.sessionPrefix || "openclaw");
        setAgents((agentsData.agents || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
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
      const res = await fetch("/api/proxy/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: {
            type: proxyType, host,
            port: parseInt(port) || 7777, username,
            password: password || (config?.defaultProvider?.password === "••••••" ? "••••••" : ""),
            sessionMode: "sticky", sessionPrefix,
          },
        }),
      });
      const data = await res.json();
      setMessage(data.success ? { type: "ok", text: "Provider settings saved" } : { type: "err", text: data.error || "Save failed" });
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
      setMessage(data.success
        ? { type: "ok", text: "Docker Compose regenerated and containers restarting" }
        : { type: "err", text: data.error || "Apply failed" });
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

  const fetchAgentHealth = async (agentId: string) => {
    setCheckingAgentId(agentId);
    try {
      const res = await fetch(`/api/proxy/health/${agentId}`);
      const data = await res.json();
      setHealthData((prev) => {
        const filtered = prev.filter((h) => h.agentId !== agentId);
        return [...filtered, data];
      });
    } catch { /* ignore */ }
    setCheckingAgentId(null);
  };

  const toggleExpand = (agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) { next.delete(agentId); setEditingAgent(null); }
      else next.add(agentId);
      return next;
    });
  };

  const applyAgent = async (agentId: string) => {
    setApplyingAgentId(agentId);
    try {
      const res = await fetch(`/api/proxy/apply/${agentId}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) setMessage({ type: "err", text: data.error || "Apply failed" });
    } catch {
      setMessage({ type: "err", text: "Network error during apply" });
    }
    setApplyingAgentId(null);
  };

  const handleToggleAgent = async (agentId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/proxy/agent/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (data.success && config) {
        setConfig({ ...config, agents: { ...config.agents, [agentId]: { ...config.agents[agentId], enabled: !currentEnabled } } });
      }
    } catch { /* ignore */ }
  };

  // Webshare — load full proxy list
  const handleWebshareLoad = async () => {
    if (!wsApiKey.trim()) return;
    setWsTesting(true);
    setWsMessage(null);
    setWsProxies([]);
    try {
      const res = await fetch(`/api/proxy/webshare?apiKey=${encodeURIComponent(wsApiKey.trim())}`);
      const data = await res.json();
      if (data.error) {
        setWsMessage({ type: "err", text: data.error });
      } else {
        setWsProxies(data.proxies ?? []);
        setWsMessage({ type: "ok", text: `✓ Loaded ${data.count} proxies — now expand any agent row to assign one` });
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
        setWsMessage({ type: "ok", text: `✓ Assigned ${data.proxiesAvailable} proxies to ${data.agentsConfigured} agents. Click Apply & Restart to activate.` });
        // Refresh config so per-agent rows update
        const configRes = await fetch("/api/proxy/config");
        const configData: ProxyConfig = await configRes.json();
        setConfig(configData);
      }
    } catch {
      setWsMessage({ type: "err", text: "Network error" });
    }
    setWsAssigning(false);
  };

  // Manual per-agent edit
  const startEditAgent = (agentId: string) => {
    const override = config?.agents?.[agentId];
    const p = override?.provider;
    setEditHost(p?.host || "");
    setEditPort(String(p?.port || 7777));
    setEditUser(p?.username || "");
    setEditPass("");
    setEditTestResult(null);
    setEditingAgent(agentId);
  };

  const handleTestProxy = async () => {
    if (!editHost.trim()) return;
    setEditTesting(true);
    setEditTestResult(null);
    try {
      const res = await fetch("/api/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: editHost,
          port: parseInt(editPort) || 7777,
          username: editUser,
          password: editPass,
          type: "http-connect",
        }),
      });
      const data = await res.json();
      setEditTestResult(data);
    } catch {
      setEditTestResult({ success: false, error: "Network error" });
    }
    setEditTesting(false);
  };

  const handleSaveAgentProxy = async (agentId: string) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/proxy/agent/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          provider: {
            type: "http-connect",
            host: editHost,
            port: parseInt(editPort) || 7777,
            username: editUser,
            password: editPass || undefined,
            sessionMode: "sticky",
            sessionPrefix: "openclaw",
          },
        }),
      });
      const data = await res.json();
      if (data.success && config) {
        setConfig({
          ...config,
          agents: {
            ...config.agents,
            [agentId]: {
              ...config.agents[agentId],
              enabled: true,
              provider: { type: "http-connect", host: editHost, port: parseInt(editPort) || 7777, username: editUser, password: editPass || "••••••", sessionMode: "sticky", sessionPrefix: "openclaw" },
            },
          },
        });
        setEditingAgent(null);
      }
    } catch { /* ignore */ }
    setEditSaving(false);
  };

  const inStyle = { background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" } as React.CSSProperties;

  if (loading) return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading proxy configuration...</div>;

  return (
    <div className="space-y-6">

      {/* ── Webshare.io Auto-assign ───────────────────────────────────── */}
      <div className="rounded-lg border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Webshare.io Auto-assign</h3>
          <a href="https://proxy.webshare.io/userapi/access" target="_blank" rel="noopener noreferrer"
            className="text-xs underline" style={{ color: "var(--accent)" }}>Get API key ↗</a>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Paste your Webshare API key — each agent gets its own dedicated IP automatically. Saved locally in your browser.
        </p>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex rounded border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <input
              type={wsShowKey ? "text" : "password"}
              value={wsApiKey}
              onChange={(e) => handleWsApiKeyChange(e.target.value)}
              className="flex-1 px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
              placeholder="Webshare API key (saved in browser)"
              onKeyDown={(e) => e.key === "Enter" && handleWebshareLoad()}
            />
            <button
              onClick={() => setWsShowKey(!wsShowKey)}
              className="px-3 text-xs border-l cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-primary)" }}
            >
              {wsShowKey ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={handleWebshareLoad}
            disabled={wsTesting || !wsApiKey.trim()}
            className="text-xs px-3 py-2 rounded border cursor-pointer disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
          >
            {wsTesting ? "Loading..." : wsProxies.length > 0 ? `Reload (${wsProxies.length})` : "Load Proxies"}
          </button>
          <button
            onClick={handleWebshareAssign}
            disabled={wsAssigning || !wsApiKey.trim()}
            className="text-xs px-4 py-2 rounded cursor-pointer disabled:opacity-50 font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {wsAssigning ? "Assigning..." : "Auto-assign All"}
          </button>
        </div>

        {wsMessage && (
          <div className="text-xs px-3 py-2 rounded mb-3"
            style={{ background: wsMessage.type === "ok" ? "var(--green-subtle)" : "rgba(255,0,0,0.1)", color: wsMessage.type === "ok" ? "var(--green)" : "var(--red)" }}>
            {wsMessage.text}
          </div>
        )}

        {wsProxies.length > 0 && wsAssignments.length === 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Available proxies — expand an agent row below to assign one:
            </div>
            {wsProxies.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-1 rounded text-xs" style={{ background: "var(--bg-primary)" }}>
                <span className="font-mono flex-1" style={{ color: "var(--text-primary)" }}>{p.ip}:{p.port}</span>
                <span className="font-mono" style={{ color: "var(--text-muted)" }}>{p.username}</span>
                <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{p.country}</span>
              </div>
            ))}
          </div>
        )}

        {wsAssignments.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Auto-assignment result:</div>
            {wsAssignments.map((a) => (
              <div key={a.agentId} className="flex items-center gap-3 px-2 py-1 rounded text-xs" style={{ background: "var(--bg-primary)" }}>
                <span className="w-24 shrink-0" style={{ color: "var(--text-secondary)" }}>{a.agentId}</span>
                <span className="font-mono flex-1" style={{ color: "var(--accent)" }}>{a.ip}</span>
                <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{a.country}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Per-Agent Proxy ───────────────────────────────────────────── */}
      <div className="rounded-lg border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Per-Agent Proxy</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Click any agent row to view its proxy settings. Use <strong>Edit</strong> to change credentials, <strong>Check</strong> to ping the live exit IP.
          </p>
        </div>

        <div className="space-y-2">
          {agents.map((agent) => {
            const isEnabled = config?.agents?.[agent.id]?.enabled ?? false;
            const override = config?.agents?.[agent.id];
            // Per-agent dedicated credentials (if any)
            const hasOwnProvider = !!(override?.provider?.host);
            // Effective credentials = own provider first, else fall back to defaultProvider
            const effectiveHost = override?.provider?.host || config?.defaultProvider?.host || null;
            const effectivePort = override?.provider?.port || config?.defaultProvider?.port || null;
            const effectiveUser = override?.provider?.username || config?.defaultProvider?.username || null;
            const effectivePass = override?.provider?.password || config?.defaultProvider?.password || null;
            const noHostConfigured = isEnabled && !effectiveHost;
            const healthInfo = healthData.find((h) => h.agentId === agent.id);
            const isExpanded = expandedAgents.has(agent.id);
            const isEditing = editingAgent === agent.id;
            const isCheckingThis = checkingAgentId === agent.id;
            const isApplyingThis = applyingAgentId === agent.id;

            return (
              <div key={agent.id} className="rounded border" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                {/* Main row — click to expand */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                  onClick={() => toggleExpand(agent.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Toggle switch — stop propagation so clicking it doesn't toggle expand */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleAgent(agent.id, isEnabled); }}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0"
                      style={{ background: isEnabled ? "var(--accent)" : "var(--bg-secondary)" }}
                    >
                      <span className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
                        style={{ background: "white", transform: isEnabled ? "translateX(18px)" : "translateX(3px)" }} />
                    </button>
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{agent.name}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{agent.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Effective host:port summary */}
                    {effectiveHost ? (
                      <span className="text-xs font-mono" style={{ color: hasOwnProvider ? "var(--accent)" : "var(--text-muted)" }}>
                        {effectiveHost}:{effectivePort}
                        {!hasOwnProvider && <span className="ml-1">(shared)</span>}
                      </span>
                    ) : (
                      isEnabled
                        ? <span className="text-xs font-semibold" style={{ color: "var(--red)" }}>⚠ No host set</span>
                        : null
                    )}

                    {/* Live health dot + public IP after check */}
                    {healthInfo?.proxyEnabled && (
                      <>
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: healthInfo.proxyHealthy ? "var(--green)" : "var(--red)" }} />
                        {healthInfo.publicIp && (
                          <span className="text-xs font-mono" style={{ color: "var(--green)" }}>{healthInfo.publicIp}</span>
                        )}
                      </>
                    )}

                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: noHostConfigured ? "rgba(255,0,0,0.1)" : isEnabled ? "var(--accent-subtle)" : "var(--bg-secondary)",
                        color: noHostConfigured ? "var(--red)" : isEnabled ? "var(--accent)" : "var(--text-muted)"
                      }}>
                      {noHostConfigured ? "No host" : isEnabled ? "Proxied" : "Direct"}
                    </span>

                    {/* Chevron */}
                    <span className="text-xs" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t px-3 pb-3 pt-3 space-y-3" style={{ borderColor: "var(--border)" }}>

                    {/* View mode — current settings */}
                    {!isEditing && (
                      <>
                        {/* Source label */}
                        <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          {hasOwnProvider
                            ? <span style={{ color: "var(--accent)" }}>Dedicated proxy (this agent only)</span>
                            : <span>Using <strong>shared default provider</strong> — set a dedicated proxy below to override</span>
                          }
                        </div>

                        {noHostConfigured && (
                          <div className="text-xs px-3 py-2 rounded mb-2"
                            style={{ background: "rgba(255,0,0,0.1)", color: "var(--red)" }}>
                            ⚠ No proxy host is configured. The proxy is enabled but will not route traffic until you set a host.
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                          <div className="flex gap-2">
                            <span style={{ color: "var(--text-muted)", width: 72, flexShrink: 0 }}>Host</span>
                            <span className="font-mono" style={{ color: effectiveHost ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {effectiveHost || "—"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "var(--text-muted)", width: 72, flexShrink: 0 }}>Port</span>
                            <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                              {effectivePort || "—"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "var(--text-muted)", width: 72, flexShrink: 0 }}>Username</span>
                            <span className="font-mono" style={{ color: effectiveUser ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {effectiveUser || "—"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "var(--text-muted)", width: 72, flexShrink: 0 }}>Password</span>
                            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                              {effectivePass ? "••••••" : "—"}
                            </span>
                          </div>
                          {healthInfo && (
                            <div className="flex gap-2 col-span-2 items-center flex-wrap">
                              <span style={{ color: "var(--text-muted)", width: 72, flexShrink: 0 }}>Health</span>
                              {!healthInfo.proxyEnabled ? (
                                <span style={{ color: "var(--red)" }}>✗ Proxy not active — click Apply &amp; Restart first</span>
                              ) : !healthInfo.containerRunning ? (
                                <span style={{ color: "var(--red)" }}>✗ Sidecar container not running — click Apply &amp; Restart</span>
                              ) : healthInfo.publicIp ? (
                                <>
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--green)" }} />
                                  <span className="font-mono font-bold" style={{ color: "var(--green)" }}>{healthInfo.publicIp}</span>
                                  {healthInfo.latencyMs != null && <span style={{ color: "var(--text-muted)" }}>{healthInfo.latencyMs}ms</span>}
                                </>
                              ) : (
                                <span style={{ color: "var(--red)" }}>✗ Container running but proxy unreachable (bad credentials?)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick-assign from loaded Webshare pool */}
                        {wsProxies.length > 0 && (
                          <div className="pt-1">
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                              Assign from Webshare pool ({wsProxies.length} available):
                            </label>
                            <div className="flex gap-2">
                              <select
                                id={`ws-pick-${agent.id}`}
                                className="flex-1 rounded border px-2 py-1.5 text-xs outline-none"
                                style={inStyle}
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">— choose a proxy —</option>
                                {wsProxies.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.ip}:{p.port} ({p.country}) — {p.username}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const sel = document.getElementById(`ws-pick-${agent.id}`) as HTMLSelectElement;
                                  const proxy = wsProxies.find(x => x.id === sel?.value);
                                  if (!proxy) return;
                                  const res = await fetch(`/api/proxy/agent/${agent.id}`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      enabled: true,
                                      provider: { type: "http-connect", host: proxy.ip, port: proxy.port, username: proxy.username, password: proxy.password, sessionMode: "sticky", sessionPrefix: "openclaw" },
                                    }),
                                  });
                                  const data = await res.json();
                                  if (data.success && config) {
                                    setConfig({ ...config, agents: { ...config.agents, [agent.id]: { ...config.agents[agent.id], enabled: true, provider: { type: "http-connect", host: proxy.ip, port: proxy.port, username: proxy.username, password: proxy.password, sessionMode: "sticky", sessionPrefix: "openclaw" } } } });
                                  }
                                }}
                                className="text-xs px-3 py-1.5 rounded cursor-pointer shrink-0"
                                style={{ background: "var(--accent)", color: "white" }}
                              >
                                Assign
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); applyAgent(agent.id); }}
                            disabled={isApplyingThis}
                            className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-50 font-medium"
                            style={{ background: "var(--accent)", color: "white" }}
                          >
                            {isApplyingThis ? "Applying..." : "Apply to Docker"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); fetchAgentHealth(agent.id); }}
                            disabled={isCheckingThis}
                            className="text-xs px-3 py-1.5 rounded border cursor-pointer disabled:opacity-50"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
                          >
                            {isCheckingThis ? "Checking..." : "Check Health"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditAgent(agent.id); }}
                            className="text-xs px-3 py-1.5 rounded border cursor-pointer"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
                          >
                            Enter manually
                          </button>
                        </div>
                      </>
                    )}

                    {/* Edit mode */}
                    {isEditing && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          Editing proxy for {agent.id}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Host / IP</label>
                            <input type="text" value={editHost} onChange={(e) => setEditHost(e.target.value)}
                              className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={inStyle}
                              placeholder="1.2.3.4 or gate.proxy.com" />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Port</label>
                            <input type="number" value={editPort} onChange={(e) => setEditPort(e.target.value)}
                              className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={inStyle} placeholder="7777" />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Username</label>
                            <input type="text" value={editUser} onChange={(e) => setEditUser(e.target.value)}
                              className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={inStyle} placeholder="username" />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Password</label>
                            <input type="password" value={editPass} onChange={(e) => setEditPass(e.target.value)}
                              className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={inStyle}
                              placeholder="Leave blank to keep current" />
                          </div>
                        </div>
                        {wsProxies.length > 0 && (
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Quick-pick from Webshare</label>
                            <select onChange={(e) => {
                              const p = wsProxies.find(x => x.id === e.target.value);
                              if (p) { setEditHost(p.ip); setEditPort(String(p.port)); setEditUser(p.username); setEditPass(p.password); }
                            }}
                              className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={inStyle}>
                              <option value="">— select a proxy —</option>
                              {wsProxies.map((p) => (
                                <option key={p.id} value={p.id}>{p.ip}:{p.port} ({p.country})</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingAgent(null); }}
                            className="text-xs px-3 py-1.5 rounded border cursor-pointer"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTestProxy(); }}
                            disabled={editTesting || !editHost.trim()}
                            className="text-xs px-3 py-1.5 rounded border cursor-pointer disabled:opacity-50"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
                          >
                            {editTesting ? "Testing..." : "Test Proxy"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveAgentProxy(agent.id); }}
                            disabled={editSaving || !editHost.trim()}
                            className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "white" }}
                          >
                            {editSaving ? "Saving..." : "Save & Enable"}
                          </button>
                        </div>

                        {editTestResult && (
                          <div
                            className="text-xs px-3 py-2 rounded flex items-center gap-3 flex-wrap"
                            style={{
                              background: editTestResult.success ? "var(--green-subtle)" : "rgba(255,0,0,0.1)",
                              color: editTestResult.success ? "var(--green)" : "var(--red)",
                            }}
                          >
                            {editTestResult.success ? (
                              <>
                                <span>✓ Connected</span>
                                {editTestResult.ip && <span className="font-mono font-bold">{editTestResult.ip}</span>}
                                {editTestResult.country && (
                                  <span className="px-1.5 py-0.5 rounded"
                                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                                    {editTestResult.country}
                                  </span>
                                )}
                                {editTestResult.org && <span style={{ color: "var(--text-muted)" }}>{editTestResult.org}</span>}
                                {editTestResult.latencyMs != null && <span style={{ color: "var(--text-muted)" }}>{editTestResult.latencyMs}ms</span>}
                              </>
                            ) : (
                              <span>✗ {editTestResult.error || "Proxy unreachable"}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>No agents found</div>
          )}
        </div>
      </div>

      {/* ── Default Provider ─────────────────────────────────────────── */}
      <div className="rounded-lg border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Default Proxy Provider</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Fallback credentials for agents without a dedicated proxy. Use <code>{"{session}"}</code> in username for per-agent sticky IPs.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Proxy Type</label>
            <select value={proxyType} onChange={(e) => setProxyType(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle}>
              <option value="http-connect">HTTP Connect</option>
              <option value="http-relay">HTTP Relay</option>
              <option value="socks5">SOCKS5</option>
              <option value="socks4">SOCKS4</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Session Prefix</label>
            <input type="text" value={sessionPrefix} onChange={(e) => setSessionPrefix(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle} placeholder="openclaw" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Host</label>
            <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle} placeholder="gate.smartproxy.com" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Port</label>
            <input type="number" value={port} onChange={(e) => setPort(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle} placeholder="7777" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
              Username <span style={{ color: "var(--accent)" }}>({"{session}"} = agent ID)</span>
            </label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle} placeholder="user-{session}" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none" style={inStyle}
              placeholder="Leave blank to keep current" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="mt-4 text-xs px-4 py-1.5 rounded cursor-pointer disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}>
          {saving ? "Saving..." : "Save Provider"}
        </button>
      </div>

      {/* ── Apply ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Apply Changes</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          After changing provider settings or toggling agents, click Apply to regenerate Docker Compose and restart containers.
        </p>
        <button onClick={handleApply} disabled={applying}
          className="text-xs px-4 py-2 rounded cursor-pointer font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}>
          {applying ? "Applying..." : "Apply & Restart All Containers"}
        </button>
      </div>

      {message && (
        <div className="text-xs px-3 py-2 rounded"
          style={{ background: message.type === "ok" ? "var(--green-subtle)" : "rgba(255,0,0,0.1)", color: message.type === "ok" ? "var(--green)" : "var(--red)" }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
