"use client";

import { useState } from "react";
import { CRON_PRESETS } from "@/lib/cronPresets";
import type { CronJob, CronJobInput, CronSchedule, CronJobPayload } from "@/lib/types";

interface CronJobEditorProps {
  agentId: string;
  existingJob?: CronJob | null;
  onSave: (input: CronJobInput) => Promise<void>;
  onCancel: () => void;
}

export default function CronJobEditor({
  agentId,
  existingJob,
  onSave,
  onCancel,
}: CronJobEditorProps) {
  const [name, setName] = useState(existingJob?.name ?? "");
  const [cronExpr, setCronExpr] = useState(existingJob?.schedule.expr ?? "0 10 * * *");
  const [tz, setTz] = useState(existingJob?.schedule.tz ?? "Asia/Shanghai");
  const [message, setMessage] = useState(existingJob?.payload.message ?? "");
  const [timeout, setTimeout_] = useState(existingJob?.payload.timeoutSeconds ?? 300);
  const [enabled, setEnabled] = useState(existingJob?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const applyPreset = (presetId: string) => {
    const preset = CRON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.input.name);
    setCronExpr(preset.input.schedule.expr);
    setTz(preset.input.schedule.tz);
    setMessage(preset.input.payload.message);
    setTimeout_(preset.input.payload.timeoutSeconds ?? 300);
  };

  const handleSave = async () => {
    setSaving(true);
    const schedule: CronSchedule = { kind: "cron", expr: cronExpr, tz };
    const payload: CronJobPayload = { kind: "agentTurn", message, timeoutSeconds: timeout };
    await onSave({ name, enabled, schedule, payload });
    setSaving(false);
  };

  const inputStyle = {
    background: "var(--bg-primary)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="rounded-lg border p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          {existingJob ? "Edit Cron Job" : "New Cron Job"}
          <span className="font-normal text-xs ml-2" style={{ color: "var(--text-muted)" }}>
            {agentId}
          </span>
        </h3>

        {/* Presets */}
        {!existingJob && (
          <div className="mb-4">
            <div className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
              Quick Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--accent)",
                    background: "var(--accent-subtle)",
                  }}
                  title={p.description}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Name */}
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
            Job Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded border outline-none"
            style={inputStyle}
            placeholder="e.g. Moltbook Daily Post"
          />
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Cron Expression
            </label>
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border outline-none font-mono"
              style={inputStyle}
              placeholder="0 10 * * *"
            />
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              min hour day month weekday
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Timezone
            </label>
            <input
              type="text"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded border outline-none"
              style={inputStyle}
              placeholder="Asia/Shanghai"
            />
          </div>
        </div>

        {/* Message */}
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
            Instructions (message sent to agent)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full text-xs px-3 py-2 rounded border outline-none resize-y"
            style={{
              ...inputStyle,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              lineHeight: "1.5",
            }}
            placeholder="What should the agent do when this job fires?"
          />
        </div>

        {/* Timeout + enabled */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Timeout (seconds)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(parseInt(e.target.value) || 300)}
              className="w-full text-sm px-3 py-2 rounded border outline-none"
              style={inputStyle}
              min={30}
              max={3600}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                Enabled
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-4 py-2 rounded border cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !message.trim() || saving}
            className="text-xs px-4 py-2 rounded cursor-pointer disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "Saving..." : existingJob ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
