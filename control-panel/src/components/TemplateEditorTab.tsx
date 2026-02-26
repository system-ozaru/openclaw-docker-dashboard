"use client";

import { useState, useEffect } from "react";
import JsonEditor from "./JsonEditor";

export default function TemplateEditorTab() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/template")
      .then((r) => r.json())
      .then((d) => setContent(d.content || ""))
      .catch(() => setStatus({ type: "error", msg: "Failed to load template" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/config/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", msg: "Template saved. New agents will use this config." });
      } else {
        setStatus({ type: "error", msg: data.error || "Save failed" });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading template...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Edit the base config template. Uses <code style={{ color: "var(--accent)" }}>${"{VARIABLE}"}</code> placeholders
          that get filled when creating new agents. Existing agents are not affected.
        </p>
      </div>

      <JsonEditor value={content} onChange={setContent} height="450px" />

      <div className="flex items-center justify-between mt-4">
        <div>
          {status && (
            <span
              className="text-xs"
              style={{ color: status.type === "success" ? "var(--green)" : "var(--red)" }}
            >
              {status.msg}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}
