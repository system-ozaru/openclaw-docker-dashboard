"use client";

import { useState } from "react";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface CreatedAgent {
  agentId: string;
  name: string;
  port: number;
  success: boolean;
  error?: string;
}

export default function CreateAgentModal({ open, onClose, onCreated }: CreateAgentModalProps) {
  const [count, setCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [name, setName] = useState("");
  const [vibe, setVibe] = useState("");
  const [interests, setInterests] = useState("");
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<CreatedAgent[] | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    setCreating(true);
    setProgress(`Creating ${count} agent${count > 1 ? "s" : ""}...`);
    setResults(null);

    try {
      const res = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          name: count === 1 && name ? name : undefined,
          vibe: vibe || undefined,
          interests: interests || undefined,
        }),
      });
      const data = await res.json();

      if (data.created) {
        setResults([...(data.created || []), ...(data.failed || [])]);
        setProgress(`${data.totalCreated} created, ${data.totalFailed} failed`);
        onCreated();
      } else {
        setProgress(data.error || "Creation failed");
      }
    } catch {
      setProgress("Network error");
    }
    setCreating(false);
  };

  const handleClose = () => {
    setCount(1);
    setName("");
    setVibe("");
    setInterests("");
    setShowAdvanced(false);
    setCreating(false);
    setProgress("");
    setResults(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && !creating && handleClose()}
    >
      <div
        className="rounded-xl border w-full max-w-md"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Create Agents
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Generate new agents with random personas. All fields optional.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Number of agents
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                disabled={creating}
                className="flex-1 accent-[var(--accent)]"
              />
              <span
                className="text-lg font-bold w-8 text-center"
                style={{ color: "var(--accent)" }}
              >
                {count}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            {showAdvanced ? "▾ Hide options" : "▸ Customize (optional)"}
          </button>

          {showAdvanced && (
            <div className="space-y-3">
              {count === 1 && (
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Random if empty"
                    disabled={creating}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              )}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Vibe (applied to all)
                </label>
                <input
                  type="text"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  placeholder="Random per agent if empty"
                  disabled={creating}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Interests (applied to all)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Random per agent if empty"
                  disabled={creating}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          )}

          {(creating || results) && (
            <div
              className="rounded-lg border p-3"
              style={{
                background: results ? "var(--bg-card)" : "var(--yellow-subtle)",
                borderColor: results ? "var(--border)" : "var(--yellow)",
              }}
            >
              {creating && !results && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--yellow)", borderTopColor: "transparent" }} />
                  <span className="text-sm" style={{ color: "var(--yellow)" }}>
                    {progress}
                  </span>
                </div>
              )}
              {results && (
                <div className="space-y-1">
                  <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    {progress}
                  </div>
                  {results.map((r) => (
                    <div key={r.agentId} className="flex items-center justify-between text-xs">
                      <span style={{ color: r.success ? "var(--green)" : "var(--red)" }}>
                        {r.success ? "✓" : "✕"} {r.name}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {r.success ? `${r.agentId} · port ${r.port}` : r.error?.slice(0, 40)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="p-5 border-t flex justify-end gap-2"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={handleClose}
            disabled={creating}
            className="px-4 py-2 rounded-md text-sm cursor-pointer disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
          >
            {results ? "Done" : "Cancel"}
          </button>
          {!results && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {creating ? "Creating..." : `Create ${count} Agent${count > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
