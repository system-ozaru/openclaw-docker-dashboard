"use client";

import { useState, useEffect, useCallback } from "react";

interface FileEntry {
  name: string;
  relativePath: string;
  group: "workspace" | "skill";
}

interface WorkspaceFilesProps {
  agentId: string;
}

export default function WorkspaceFiles({ agentId }: WorkspaceFilesProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/workspace`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const loadFile = async (relativePath: string) => {
    setActiveFile(relativePath);
    setEditing(false);
    setSavedMsg(null);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/workspace?file=${encodeURIComponent(relativePath)}`
      );
      const data = await res.json();
      setContent(data.content ?? "");
    } catch {
      setContent("(failed to load)");
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/workspace`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: activeFile, content: draft }),
      });
      if (res.ok) {
        setContent(draft);
        setEditing(false);
        setSavedMsg("Saved");
        setTimeout(() => setSavedMsg(null), 2000);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const wsFiles = files.filter((f) => f.group === "workspace");
  const skillFiles = files.filter((f) => f.group === "skill");

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Workspace Files
        </span>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className="text-xs" style={{ color: "var(--green)" }}>{savedMsg}</span>
          )}
          {saving && (
            <div
              className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File list sidebar */}
        <div
          className="w-40 shrink-0 border-r overflow-y-auto py-2"
          style={{ borderColor: "var(--border)" }}
        >
          {loading ? (
            <div className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : (
            <>
              {wsFiles.length > 0 && (
                <div className="mb-2">
                  <div
                    className="px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Core
                  </div>
                  {wsFiles.map((f) => (
                    <button
                      key={f.relativePath}
                      onClick={() => loadFile(f.relativePath)}
                      className="w-full text-left px-3 py-1 text-xs cursor-pointer transition-colors truncate"
                      style={{
                        color: activeFile === f.relativePath ? "var(--accent)" : "var(--text-secondary)",
                        background: activeFile === f.relativePath ? "var(--accent-subtle)" : "transparent",
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
              {skillFiles.length > 0 && (
                <div>
                  <div
                    className="px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Skills
                  </div>
                  {skillFiles.map((f) => (
                    <button
                      key={f.relativePath}
                      onClick={() => loadFile(f.relativePath)}
                      className="w-full text-left px-3 py-1 text-xs cursor-pointer transition-colors truncate"
                      style={{
                        color: activeFile === f.relativePath ? "var(--accent)" : "var(--text-secondary)",
                        background: activeFile === f.relativePath ? "var(--accent-subtle)" : "transparent",
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeFile ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Select a file to view
              </span>
            </div>
          ) : editing ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 text-xs p-3 outline-none resize-none"
                style={{
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  lineHeight: "1.6",
                }}
              />
              <div
                className="flex items-center gap-2 px-3 py-2 border-t shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs px-3 py-1 rounded cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <pre
                className="flex-1 text-xs p-3 overflow-auto"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {content}
              </pre>
              <div
                className="flex items-center px-3 py-2 border-t shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => { setDraft(content); setEditing(true); }}
                  className="text-xs px-3 py-1 rounded cursor-pointer"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
