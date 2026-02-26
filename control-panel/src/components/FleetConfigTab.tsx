"use client";

import { useState, useEffect } from "react";
import JsonEditor from "./JsonEditor";

export default function FleetConfigTab() {
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [sourceAgent, setSourceAgent] = useState<string>("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/config/fleet").then((r) => r.json()),
    ]).then(([fleetData]) => {
      const ids: string[] = fleetData.agentIds || [];
      setAgentIds(ids);
      if (ids.length > 0) {
        setSourceAgent(ids[0]);
        loadAgentConfig(ids[0]);
      }
      setLoading(false);
    });
  }, []);

  const loadAgentConfig = async (agentId: string) => {
    try {
      const res = await fetch(`/api/config/agent/${agentId}`);
      const data = await res.json();
      setContent(data.content || "");
    } catch {
      setStatus({ type: "error", msg: "Failed to load config" });
    }
  };

  const handleSourceChange = (agentId: string) => {
    setSourceAgent(agentId);
    loadAgentConfig(agentId);
    setStatus(null);
  };

  const handleApplyToAll = async () => {
    setApplying(true);
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
          msg: `Applied to ${data.updated.length} agent(s). Unique fields (port, token) preserved. Restart agents to apply.`,
        });
      }
      if (data.errors?.length) {
        setStatus({
          type: "error",
          msg: `Errors: ${data.errors.join(", ")}`,
        });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error" });
    }
    setApplying(false);
  };

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Edit a config then push it to <strong>all agents at once</strong>. Each agent&apos;s unique gateway port
          and token are preserved automatically.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Load config from:
          </span>
          <select
            value={sourceAgent}
            onChange={(e) => handleSourceChange(e.target.value)}
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
        <button
          onClick={handleApplyToAll}
          disabled={applying}
          className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {applying ? "Applying..." : "Apply to All Agents"}
        </button>
      </div>
    </div>
  );
}
