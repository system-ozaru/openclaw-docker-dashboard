interface StatusBadgeProps {
  status: "running" | "stopped" | "error" | "unknown";
  healthy?: boolean;
}

export default function StatusBadge({ status, healthy }: StatusBadgeProps) {
  const configs = {
    running: {
      dot: healthy ? "var(--green)" : "var(--yellow)",
      bg: healthy ? "var(--green-subtle)" : "var(--yellow-subtle)",
      text: healthy ? "var(--green)" : "var(--yellow)",
      label: healthy ? "Healthy" : "Running",
    },
    stopped: {
      dot: "var(--text-muted)",
      bg: "rgba(102,102,102,0.15)",
      text: "var(--text-muted)",
      label: "Stopped",
    },
    error: {
      dot: "var(--red)",
      bg: "var(--red-subtle)",
      text: "var(--red)",
      label: "Error",
    },
    unknown: {
      dot: "var(--text-muted)",
      bg: "rgba(102,102,102,0.15)",
      text: "var(--text-muted)",
      label: "Unknown",
    },
  };

  const c = configs[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  );
}
