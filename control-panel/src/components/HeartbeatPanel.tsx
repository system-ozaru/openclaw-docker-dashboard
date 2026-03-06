"use client";

import { useState, useEffect, useCallback } from "react";
import type { HeartbeatConfig } from "@/lib/types";

const INTERVAL_PRESETS = ["30m", "55m", "1h", "2h"];

interface HeartbeatPanelProps {
  agentId: string;
  showApplyAll?: boolean;
}

export default function HeartbeatPanel({ agentId, showApplyAll }: HeartbeatPanelProps) {
  const [config, setConfig] = useState<HeartbeatConfig | null>(null);
  const [heartbeatMd, setHeartbeatMd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMd, setEditingMd] = useState(false);
  const [mdDraft, setMdDraft] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/heartbeat`);
      const data = await res.json();
      setConfig(data.config ?? { every: "55m", target: "none" });
      setHeartbeatMd(data.heartbeatMd ?? "");
    } catch { /* ignore */ }
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async (endpoint: string, payload: Record<string, unknown>) => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedMsg("Saved");
        setTimeout(() => setSavedMsg(null), 2000);
        fetchConfig();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleIntervalChange = (every: string) => {
    const updated = { ...config!, every };
    setConfig(updated);
    save(`/api/agents/${agentId}/heartbeat`, { config: updated });
  };

  const handleDisable = () => {
    const updated = { ...config!, every: "0m" };
    setConfig(updated);
    save(`/api/agents/${agentId}/heartbeat`, { config: updated });
  };

  const handleSaveMd = () => {
    save(`/api/agents/${agentId}/heartbeat`, { heartbeatMd: mdDraft });
    setHeartbeatMd(mdDraft);
    setEditingMd(false);
  };

  const handleApplyAll = () => {
    if (!config) return;
    save("/api/fleet/heartbeat", { config, heartbeatMd });
  };

  if (loading) {
    return (
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        Loading heartbeat config...
      </div>
    );
  }

  const isEnabled = config?.every && config.every !== "0m";
  const intervalLabel = config?.every || "55m";

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Heartbeat
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: isEnabled ? "var(--green-subtle)" : "var(--bg-primary)",
              color: isEnabled ? "var(--green)" : "var(--text-muted)",
            }}
          >
            {isEnabled ? `Every ${intervalLabel}` : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className="text-xs" style={{ color: "var(--green)" }}>{savedMsg}</span>
          )}
          {saving && (
            <div
              className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          )}
        </div>
      </div>

      {/* Interval presets */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {INTERVAL_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handleIntervalChange(preset)}
            className="text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors"
            style={{
              borderColor: intervalLabel === preset ? "var(--accent)" : "var(--border)",
              background: intervalLabel === preset ? "var(--accent-subtle)" : "transparent",
              color: intervalLabel === preset ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {preset}
          </button>
        ))}
        <input
          type="text"
          value={intervalLabel}
          onChange={(e) => setConfig({ ...config!, every: e.target.value })}
          onBlur={() => save(`/api/agents/${agentId}/heartbeat`, { config })}
          onKeyDown={(e) => {
            if (e.key === "Enter") save(`/api/agents/${agentId}/heartbeat`, { config });
          }}
          className="w-16 text-xs px-2 py-1 rounded border outline-none text-center"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
          placeholder="55m"
        />
        {isEnabled && (
          <button
            onClick={handleDisable}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--red)" }}
          >
            Disable
          </button>
        )}
        {!isEnabled && (
          <button
            onClick={() => handleIntervalChange("55m")}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--green)" }}
          >
            Enable
          </button>
        )}
      </div>

      {/* HEARTBEAT.md */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            HEARTBEAT.md
          </span>
          <button
            onClick={() => {
              if (editingMd) {
                setEditingMd(false);
              } else {
                setMdDraft(heartbeatMd);
                setEditingMd(true);
              }
            }}
            className="text-xs cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            {editingMd ? "Cancel" : "Edit"}
          </button>
        </div>
        {editingMd ? (
          <div>
            <textarea
              value={mdDraft}
              onChange={(e) => setMdDraft(e.target.value)}
              rows={6}
              className="w-full text-xs p-2 rounded border outline-none resize-y"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            />
            <button
              onClick={handleSaveMd}
              className="mt-1.5 text-xs px-3 py-1 rounded cursor-pointer"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Save
            </button>
          </div>
        ) : (
          <pre
            className="text-xs p-2 rounded overflow-auto max-h-24"
            style={{
              background: "var(--bg-primary)",
              color: heartbeatMd.trim() ? "var(--text-secondary)" : "var(--text-muted)",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              lineHeight: "1.5",
            }}
          >
            {heartbeatMd.trim() || "(empty -- heartbeat will be skipped)"}
          </pre>
        )}
      </div>

      {showApplyAll && (
        <button
          onClick={handleApplyAll}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-50 mt-1"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
        >
          Apply to All Agents
        </button>
      )}
    </div>
  );
}
