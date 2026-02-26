"use client";

import type { AgentStatus } from "@/lib/types";

interface BroadcastAgentPickerProps {
  agents: AgentStatus[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

export default function BroadcastAgentPicker({
  agents,
  selectedIds,
  onChange,
}: BroadcastAgentPickerProps) {
  const allSelected = agents.length > 0 && selectedIds.size === agents.length;

  const toggleAgent = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(agents.map((a) => a.id)));
    }
  };

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Select agents ({selectedIds.size}/{agents.length})
        </span>
        <button
          onClick={toggleAll}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
        {agents.map((agent) => {
          const checked = selectedIds.has(agent.id);
          const running = agent.containerStatus === "running";

          return (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs text-left cursor-pointer transition-colors"
              style={{
                background: checked ? "var(--accent-subtle)" : "var(--bg-primary)",
                borderColor: checked ? "var(--accent)" : "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <span className="text-sm">{agent.emoji || "🤖"}</span>
              <span className="truncate flex-1">{agent.name}</span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: running ? "var(--green)" : "var(--text-muted)" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
