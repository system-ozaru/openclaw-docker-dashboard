"use client";

import { useState } from "react";
import { CRON_PRESETS } from "@/lib/cronPresets";
import type { CronJob, CronJobInput, CronSchedule, CronJobPayload } from "@/lib/types";

// ─── Timezone list ────────────────────────────────────────────────────────────
const TZ_OPTIONS = [
  { label: "UTC-12  (International Date Line West)", value: "Etc/GMT+12" },
  { label: "UTC-11  (Midway Island)", value: "Pacific/Midway" },
  { label: "UTC-10  (Hawaii)", value: "Pacific/Honolulu" },
  { label: "UTC-9   (Alaska)", value: "America/Anchorage" },
  { label: "UTC-8   (Pacific Time — LA / Vancouver)", value: "America/Los_Angeles" },
  { label: "UTC-7   (Mountain Time — Denver / Phoenix)", value: "America/Denver" },
  { label: "UTC-6   (Central Time — Chicago / Mexico City)", value: "America/Chicago" },
  { label: "UTC-5   (Eastern Time — New York / Toronto)", value: "America/New_York" },
  { label: "UTC-4   (Atlantic — Halifax / Caracas)", value: "America/Halifax" },
  { label: "UTC-3   (Buenos Aires / São Paulo)", value: "America/Argentina/Buenos_Aires" },
  { label: "UTC-1   (Azores)", value: "Atlantic/Azores" },
  { label: "UTC+0   (London / Dublin / Lisbon)", value: "Europe/London" },
  { label: "UTC+1   (Paris / Berlin / Rome / Madrid)", value: "Europe/Paris" },
  { label: "UTC+2   (Helsinki / Athens / Cairo / Johannesburg)", value: "Europe/Helsinki" },
  { label: "UTC+3   (Moscow / Nairobi / Riyadh)", value: "Europe/Moscow" },
  { label: "UTC+4   (Dubai / Baku / Tbilisi)", value: "Asia/Dubai" },
  { label: "UTC+4:30 (Kabul)", value: "Asia/Kabul" },
  { label: "UTC+5   (Karachi / Islamabad / Tashkent)", value: "Asia/Karachi" },
  { label: "UTC+5:30 (India — Mumbai / Delhi)", value: "Asia/Kolkata" },
  { label: "UTC+5:45 (Nepal)", value: "Asia/Kathmandu" },
  { label: "UTC+6   (Dhaka / Almaty)", value: "Asia/Dhaka" },
  { label: "UTC+6:30 (Yangon)", value: "Asia/Yangon" },
  { label: "UTC+7   (Bangkok / Jakarta / Hanoi)", value: "Asia/Bangkok" },
  { label: "UTC+8   (Beijing / Singapore / KL / Manila / Perth)", value: "Asia/Shanghai" },
  { label: "UTC+9   (Tokyo / Seoul)", value: "Asia/Tokyo" },
  { label: "UTC+9:30 (Adelaide)", value: "Australia/Adelaide" },
  { label: "UTC+10  (Sydney / Melbourne / Brisbane)", value: "Australia/Sydney" },
  { label: "UTC+11  (Solomon Islands)", value: "Pacific/Guadalcanal" },
  { label: "UTC+12  (Auckland / Fiji)", value: "Pacific/Auckland" },
];

// ─── Cron builder helpers ─────────────────────────────────────────────────────
type Freq = "hourly" | "daily" | "weekly" | "monthly" | "custom";
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseCron(expr: string): {
  freq: Freq; minute: number; hour: number; dow: number; dom: number;
} {
  const p = expr.trim().split(/\s+/);
  if (p.length !== 5) return { freq: "custom", minute: 0, hour: 10, dow: 1, dom: 1 };
  const [min, hr, dom, , wd] = p;
  const m = parseInt(min) || 0;
  const h = parseInt(hr) || 10;
  if (hr === "*" && dom === "*" && wd === "*") return { freq: "hourly", minute: m, hour: h, dow: 1, dom: 1 };
  if (dom === "*" && wd === "*") return { freq: "daily", minute: m, hour: h, dow: 1, dom: 1 };
  if (dom === "*" && wd !== "*") return { freq: "weekly", minute: m, hour: h, dow: parseInt(wd) || 1, dom: 1 };
  if (dom !== "*" && wd === "*") return { freq: "monthly", minute: m, hour: h, dow: 1, dom: parseInt(dom) || 1 };
  return { freq: "custom", minute: m, hour: h, dow: 1, dom: 1 };
}

function buildCron(freq: Freq, minute: number, hour: number, dow: number, dom: number): string {
  switch (freq) {
    case "hourly":  return `${minute} * * * *`;
    case "daily":   return `${minute} ${hour} * * *`;
    case "weekly":  return `${minute} ${hour} * * ${dow}`;
    case "monthly": return `${minute} ${hour} ${dom} * *`;
    default:        return "";
  }
}

function humanCron(freq: Freq, minute: number, hour: number, dow: number, dom: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const t = `${h12}:${pad(minute)} ${ampm}`;
  switch (freq) {
    case "hourly":  return `Every hour at :${pad(minute)}`;
    case "daily":   return `Every day at ${t}`;
    case "weekly":  return `Every ${DOW_LABELS[dow]} at ${t}`;
    case "monthly": return `Day ${dom} of every month at ${t}`;
    default:        return "Custom schedule";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface CronJobEditorProps {
  agentId: string;
  existingJob?: CronJob | null;
  onSave: (input: CronJobInput) => Promise<void>;
  onCancel: () => void;
}

export default function CronJobEditor({ agentId, existingJob, onSave, onCancel }: CronJobEditorProps) {
  const parsed = parseCron(existingJob?.schedule.expr ?? "0 10 * * *");

  const [name, setName] = useState(existingJob?.name ?? "");
  const [tz, setTz] = useState(existingJob?.schedule.tz ?? "Asia/Shanghai");
  const [message, setMessage] = useState(existingJob?.payload.message ?? "");
  const [timeout, setTimeout_] = useState(existingJob?.payload.timeoutSeconds ?? 300);
  const [enabled, setEnabled] = useState(existingJob?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  // Cron builder state
  const [freq, setFreq] = useState<Freq>(existingJob ? parsed.freq : "daily");
  const [minute, setMinute] = useState(parsed.minute);
  const [hour, setHour] = useState(parsed.hour);
  const [dow, setDow] = useState(parsed.dow);
  const [dom, setDom] = useState(parsed.dom);
  const [customExpr, setCustomExpr] = useState(existingJob?.schedule.expr ?? "0 10 * * *");

  const cronExpr = freq === "custom" ? customExpr : buildCron(freq, minute, hour, dow, dom);

  const applyPreset = (presetId: string) => {
    const preset = CRON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.input.name);
    setTz(preset.input.schedule.tz);
    setMessage(preset.input.payload.message);
    setTimeout_(preset.input.payload.timeoutSeconds ?? 300);
    const p2 = parseCron(preset.input.schedule.expr);
    setFreq(p2.freq);
    setMinute(p2.minute);
    setHour(p2.hour);
    setDow(p2.dow);
    setDom(p2.dom);
    setCustomExpr(preset.input.schedule.expr);
  };

  const handleSave = async () => {
    setSaving(true);
    const schedule: CronSchedule = { kind: "cron", expr: cronExpr, tz };
    const payload: CronJobPayload = { kind: "agentTurn", message, timeoutSeconds: timeout };
    await onSave({ name, enabled, schedule, payload });
    setSaving(false);
  };

  const s = {
    input: {
      background: "var(--bg-primary)",
      borderColor: "var(--border)",
      color: "var(--text-primary)",
    } as React.CSSProperties,
  };

  const freqOptions: { id: Freq; label: string }[] = [
    { id: "hourly",  label: "Every Hour" },
    { id: "daily",   label: "Every Day" },
    { id: "weekly",  label: "Every Week" },
    { id: "monthly", label: "Every Month" },
    { id: "custom",  label: "Custom" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="rounded-lg border p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          {existingJob ? "Edit Cron Job" : "New Cron Job"}
          <span className="font-normal text-xs ml-2" style={{ color: "var(--text-muted)" }}>{agentId}</span>
        </h3>

        {/* Presets */}
        {!existingJob && (
          <div className="mb-4">
            <div className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>Quick Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--accent-subtle)" }}
                  title={p.description}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Job Name */}
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Job Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded border outline-none"
            style={s.input}
            placeholder="e.g. Daily Morning Post"
          />
        </div>

        {/* ── Schedule Builder ─────────────────────────────────────── */}
        <div
          className="mb-4 rounded-lg border p-3"
          style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
        >
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Schedule</div>

          {/* Frequency pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {freqOptions.map((f) => (
              <button
                key={f.id}
                onClick={() => setFreq(f.id)}
                className="text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors"
                style={{
                  borderColor: freq === f.id ? "var(--accent)" : "var(--border)",
                  background: freq === f.id ? "var(--accent)" : "transparent",
                  color: freq === f.id ? "white" : "var(--text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Controls per frequency */}
          {freq !== "custom" && (
            <div className="space-y-3">
              {/* Day of week (weekly only) */}
              {freq === "weekly" && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Day of Week</div>
                  <div className="flex gap-1">
                    {DOW_LABELS.map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDow(idx)}
                        className="flex-1 text-xs py-1.5 rounded border cursor-pointer transition-colors"
                        style={{
                          borderColor: dow === idx ? "var(--accent)" : "var(--border)",
                          background: dow === idx ? "var(--accent)" : "transparent",
                          color: dow === idx ? "white" : "var(--text-secondary)",
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month (monthly only) */}
              {freq === "monthly" && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Day of Month</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={28}
                      value={dom}
                      onChange={(e) => setDom(parseInt(e.target.value))}
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <span className="text-sm font-mono w-8 text-center" style={{ color: "var(--text-primary)" }}>
                      {dom}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Capped at 28 to work every month
                  </div>
                </div>
              )}

              {/* Time (not for hourly) */}
              {freq !== "hourly" && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Time</div>
                  <div className="flex gap-2 items-center">
                    {/* Hour */}
                    <select
                      value={hour}
                      onChange={(e) => setHour(parseInt(e.target.value))}
                      className="flex-1 text-sm px-2 py-2 rounded border outline-none"
                      style={s.input}
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const h12 = i % 12 === 0 ? 12 : i % 12;
                        const ampm = i < 12 ? "AM" : "PM";
                        return (
                          <option key={i} value={i}>
                            {String(h12).padStart(2, "0")}:-- {ampm}
                          </option>
                        );
                      })}
                    </select>
                    <span style={{ color: "var(--text-muted)" }}>:</span>
                    {/* Minute */}
                    <select
                      value={minute}
                      onChange={(e) => setMinute(parseInt(e.target.value))}
                      className="flex-1 text-sm px-2 py-2 rounded border outline-none"
                      style={s.input}
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Minute offset (hourly) */}
              {freq === "hourly" && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                    At how many minutes past each hour?
                  </div>
                  <select
                    value={minute}
                    onChange={(e) => setMinute(parseInt(e.target.value))}
                    className="w-full text-sm px-2 py-2 rounded border outline-none"
                    style={s.input}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>:{String(m).padStart(2, "0")} (e.g. 1:00, 2:00…)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Custom cron */}
          {freq === "custom" && (
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                Cron Expression
              </div>
              <input
                type="text"
                value={customExpr}
                onChange={(e) => setCustomExpr(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded border outline-none font-mono"
                style={s.input}
                placeholder="0 10 * * *"
              />
              <div className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                min&nbsp;&nbsp;hour&nbsp;&nbsp;day-of-month&nbsp;&nbsp;month&nbsp;&nbsp;day-of-week
              </div>
            </div>
          )}

          {/* Human-readable summary */}
          {freq !== "custom" && (
            <div
              className="mt-3 text-xs px-2.5 py-1.5 rounded"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
            >
              {humanCron(freq, minute, hour, dow, dom)}
            </div>
          )}

          {/* Raw expr preview */}
          <div className="mt-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            cron: <span style={{ color: "var(--text-secondary)" }}>{cronExpr}</span>
          </div>
        </div>

        {/* Timezone */}
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Timezone</label>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded border outline-none"
            style={s.input}
          >
            {TZ_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Instructions */}
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
            Instructions (message sent to agent)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            className="w-full text-xs px-3 py-2 rounded border outline-none resize-y"
            style={{
              ...s.input,
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
              style={s.input}
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
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>Enabled</span>
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
