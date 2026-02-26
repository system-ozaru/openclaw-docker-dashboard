interface FleetStatsProps {
  totalAgents: number;
  totalRunning: number;
  totalStopped: number;
}

export default function FleetStats({
  totalAgents,
  totalRunning,
  totalStopped,
}: FleetStatsProps) {
  const stats = [
    { label: "Total Agents", value: totalAgents, color: "var(--text-primary)" },
    { label: "Running", value: totalRunning, color: "var(--green)" },
    { label: "Stopped", value: totalStopped, color: "var(--text-muted)" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border p-4"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            {stat.label}
          </div>
          <div className="text-2xl font-bold" style={{ color: stat.color }}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
