"use client";

import { useState, useEffect } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export default function JsonEditor({
  value,
  onChange,
  readOnly = false,
  height = "400px",
}: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (value.includes("${")) {
        JSON.parse(value.replace(/\$\{[^}]+\}/g, '"__placeholder__"'));
      } else {
        JSON.parse(value);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [value]);

  const handleFormat = () => {
    try {
      if (value.includes("${")) return;
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      onChange(formatted);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {error && (
          <span className="text-xs" style={{ color: "var(--red)" }}>
            {error}
          </span>
        )}
        {!error && (
          <span className="text-xs" style={{ color: "var(--green)" }}>
            Valid JSON
          </span>
        )}
        {!readOnly && !value.includes("${") && (
          <button
            onClick={handleFormat}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
          >
            Format
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className="w-full rounded-lg border p-4 text-sm outline-none resize-none"
        style={{
          height,
          background: "var(--bg-primary)",
          borderColor: error ? "var(--red)" : "var(--border)",
          color: "var(--text-primary)",
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: "1.5",
          tabSize: 2,
        }}
      />
    </div>
  );
}
