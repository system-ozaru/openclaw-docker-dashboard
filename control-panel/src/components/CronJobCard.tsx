"use client";

import type { CronJob } from "@/lib/types";

interface CronJobCardProps {
  job: CronJob;
  onToggle: (jobId: string, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onDelete: (jobId: string) => void;
}

function describeSchedule(expr: string): string {
  const parts = expr.split(" ");
  if (parts.length !== 5) return expr;
  const [min, hour, , , dow] = parts;

  if (hour === "*" && min.startsWith("*/")) return `Every ${min.slice(2)} min`;
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)}h at :${min.padStart(2, "0")}`;
  if (hour !== "*" && dow === "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  if (dow !== "*") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNames = dow.split(",").map((d) => days[parseInt(d)] ?? d).join(", ");
    return `${dayNames} at ${hour}:${min.padStart(2, "0")}`;
  }
  return expr;
}

function formatTime(ms?: number): string {
  if (!ms) return "Never";
  const d = new Date(ms);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CronJobCard({ job, onToggle, onEdit, onDelete }: CronJobCardProps) {
  const statusColor = !job.state.lastStatus
    ? "var(--text-muted)"
    : job.state.lastStatus === "ok"
      ? "var(--green)"
      : "var(--red)";

  return (
    <div
      className="rounded-lg border p-3 transition-colors"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        opacity: job.enabled ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggle(job.id, !job.enabled)}
            className="w-8 h-4 rounded-full relative cursor-pointer shrink-0 transition-colors"
            style={{
              background: job.enabled ? "var(--accent)" : "var(--bg-primary)",
              border: `1px solid ${job.enabled ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
              style={{
                background: "white",
                left: job.enabled ? "14px" : "2px",
              }}
            />
          </button>
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {job.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(job)}
            className="text-xs px-1.5 cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(job.id)}
            className="text-xs px-1.5 cursor-pointer"
            style={{ color: "var(--red)" }}
          >
            Del
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{describeSchedule(job.schedule.expr)}</span>
        <span>{job.schedule.tz}</span>
      </div>

      <div className="flex items-center gap-3 text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
        <span>
          Last:{" "}
          <span style={{ color: statusColor }}>
            {job.state.lastStatus ?? "—"}
          </span>
          {job.state.lastRunAtMs ? ` (${formatTime(job.state.lastRunAtMs)})` : ""}
        </span>
        {job.state.nextRunAtMs && (
          <span>Next: {formatTime(job.state.nextRunAtMs)}</span>
        )}
      </div>

      {job.state.consecutiveErrors && job.state.consecutiveErrors > 0 && (
        <div className="text-xs mt-1" style={{ color: "var(--red)" }}>
          {job.state.consecutiveErrors} consecutive error{job.state.consecutiveErrors > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
