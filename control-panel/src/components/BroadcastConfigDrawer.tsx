"use client";

import type { BroadcastConfig } from "@/lib/broadcastTypes";

interface BroadcastConfigDrawerProps {
  config: BroadcastConfig;
  onChange: (config: BroadcastConfig) => void;
  agentCount: number;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono" style={{ color: "var(--text-primary)" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        style={{ height: "4px" }}
      />
    </div>
  );
}

export default function BroadcastConfigDrawer({
  config,
  onChange,
  agentCount,
}: BroadcastConfigDrawerProps) {
  const update = (partial: Partial<BroadcastConfig>) =>
    onChange({ ...config, ...partial });

  const batchCount = Math.ceil(agentCount / config.batchSize);
  const estimatedSeconds =
    batchCount * (config.timeoutPerAgentMs / 1000) +
    (batchCount - 1) * (config.delayBetweenBatchesMs / 1000);

  return (
    <div
      className="rounded-lg border p-4 space-y-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}>
          Broadcast Settings
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {agentCount} agent{agentCount !== 1 ? "s" : ""} targeted
        </span>
      </div>

      <div className="space-y-3">
        <SliderRow
          label="Batch Size"
          value={config.batchSize}
          min={1} max={Math.max(agentCount, 1)} step={1} unit=""
          onChange={(v) => update({ batchSize: v })}
        />
        <SliderRow
          label="Delay Between Batches"
          value={config.delayBetweenBatchesMs / 1000}
          min={0} max={30} step={1} unit="s"
          onChange={(v) => update({ delayBetweenBatchesMs: v * 1000 })}
        />
        <SliderRow
          label="Timeout Per Agent"
          value={config.timeoutPerAgentMs / 1000}
          min={15} max={300} step={15} unit="s"
          onChange={(v) => update({ timeoutPerAgentMs: v * 1000 })}
        />
        <SliderRow
          label="Max Retries"
          value={config.maxRetries}
          min={0} max={3} step={1} unit=""
          onChange={(v) => update({ maxRetries: v })}
        />
      </div>

      <div
        className="border-t pt-3 space-y-2"
        style={{ borderColor: "var(--border)" }}
      >
        <h4 className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}>
          Lifecycle
        </h4>

        <label className="flex items-center gap-2 text-xs cursor-pointer"
               style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={config.autoWake}
            onChange={(e) => update({ autoWake: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          Auto-wake stopped agents
        </label>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer"
                 style={{ color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={config.autoSleepAfterMin > 0}
              onChange={(e) => update({ autoSleepAfterMin: e.target.checked ? 5 : 0 })}
              className="accent-[var(--accent)]"
            />
            Auto-sleep after idle
          </label>
          {config.autoSleepAfterMin > 0 && (
            <input
              type="number"
              min={1} max={60}
              value={config.autoSleepAfterMin}
              onChange={(e) => update({ autoSleepAfterMin: Number(e.target.value) || 5 })}
              className="w-14 text-center text-xs rounded border px-1 py-0.5"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}
          {config.autoSleepAfterMin > 0 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>min</span>
          )}
        </div>
      </div>

      <div
        className="border-t pt-3 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        {batchCount} batch{batchCount !== 1 ? "es" : ""} &middot;
        est. max ~{Math.ceil(estimatedSeconds)}s
      </div>
    </div>
  );
}
