"use client";

import { useState, useEffect } from "react";
import JsonEditor from "./JsonEditor";

export default function AgentConfigTab() {
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/fleet")
      .then((r) => r.json())
      .then((data) => {
        const ids: string[] = data.agentIds || [];
        setAgentIds(ids);
        if (ids.length > 0) {
          setSelectedAgent(ids[0]);
          loadConfig(ids[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loadConfig = async (agentId: string) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/config/agent/${agentId}`);
      const data = await res.json();
      setContent(data.content || "");
    } catch {
      setStatus({ type: "error", msg: "Failed to load config" });
    }
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId);
    loadConfig(agentId);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/config/agent/${selectedAgent}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", msg: `Saved ${selectedAgent}. Restart to apply.` });
      } else {
        setStatus({ type: "error", msg: data.error || "Save failed" });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error" });
    }
    setSaving(false);
  };

  const handleApplyToAll = async () => {
    setApplyingAll(true);
    setStatus(null);
    try {
      const res = await fetch("/api/config/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.updated?.length) {
        setStatus({
          type: "success",
          msg: `Pushed ${selectedAgent}'s config to ${data.updated.length} agent(s). Restart to apply.`,
        });
      }
      if (data.errors?.length) {
        setStatus({ type: "error", msg: `Errors: ${data.errors.join(", ")}` });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error" });
    }
    setApplyingAll(false);
  };

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Edit a single agent&apos;s config for testing. Once satisfied, push it to all agents.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Agent:</span>
          <select
            value={selectedAgent}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {agentIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>

      <JsonEditor value={content} onChange={setContent} height="450px" />

      <div className="flex items-center justify-between mt-4">
        <div>
          {status && (
            <span
              className="text-xs"
              style={{ color: status.type === "success" ? "var(--green)" : "var(--red)" }}
            >
              {status.msg}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleApplyToAll}
            disabled={applyingAll || saving}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer border disabled:opacity-50"
            style={{
              borderColor: "var(--accent)",
              color: "var(--accent)",
              background: "var(--accent-subtle)",
            }}
          >
            {applyingAll ? "Pushing..." : "Apply to All Agents"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || applyingAll}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "Saving..." : `Save ${selectedAgent}`}
          </button>
        </div>
      </div>
    </div>
  );
}
