"use client";

import { useState } from "react";

interface BulkActionsProps {
  onFleetAction: (action: string) => Promise<void>;
}

export default function BulkActions({ onFleetAction }: BulkActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    await onFleetAction(action);
    setLoading(null);
  };

  const actions = [
    { key: "start", label: "Start All", color: "var(--green)", bg: "var(--green-subtle)" },
    { key: "stop", label: "Stop All", color: "var(--text-secondary)", bg: "transparent" },
    { key: "restart", label: "Restart All", color: "var(--yellow)", bg: "var(--yellow-subtle)" },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={() => handleAction(action.key)}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded border text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
          style={{
            borderColor: "var(--border)",
            color: action.color,
            background: action.bg,
          }}
        >
          {loading === action.key ? "..." : action.label}
        </button>
      ))}
    </div>
  );
}
