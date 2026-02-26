"use client";

import { useState, useRef, useEffect } from "react";
import type { ModelOption } from "@/lib/types";

interface SelectionBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  availableModels: ModelOption[];
  onBulkModelChange: (model: string) => Promise<void>;
}

export default function SelectionBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  availableModels,
  onBulkModelChange,
}: SelectionBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"idle" | "applying" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (status === "done" || status === "error") {
      const t = setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const filtered = availableModels.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (model: ModelOption) => {
    setOpen(false);
    setSearch("");
    setStatus("applying");
    setStatusMsg(`Switching ${selectedCount} agent(s) to ${model.name}...`);
    try {
      await onBulkModelChange(model.fullId);
      setStatus("done");
      setStatusMsg(`Switched to ${model.name}`);
    } catch {
      setStatus("error");
      setStatusMsg("Failed to switch model");
    }
  };

  if (selectedCount === 0 && status === "idle") return null;

  return (
    <div
      className="rounded-lg border p-3 mb-4 flex items-center justify-between"
      style={{
        background: status === "applying" ? "var(--yellow-subtle)" :
                    status === "done" ? "var(--green-subtle)" :
                    status === "error" ? "var(--red-subtle)" :
                    "var(--accent-subtle)",
        borderColor: status === "applying" ? "var(--yellow)" :
                     status === "done" ? "var(--green)" :
                     status === "error" ? "var(--red)" :
                     "var(--accent)",
      }}
    >
      <div className="flex items-center gap-3">
        {status === "applying" && (
          <div className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--yellow)", borderTopColor: "transparent" }} />
        )}
        {status === "done" && (
          <svg className="w-4 h-4" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span className="text-sm font-medium" style={{
          color: status === "applying" ? "var(--yellow)" :
                 status === "done" ? "var(--green)" :
                 status === "error" ? "var(--red)" :
                 "var(--accent)",
        }}>
          {statusMsg || `${selectedCount} of ${totalCount} selected`}
        </span>
        {status === "idle" && (
          <button
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--text-secondary)", background: "var(--bg-hover)" }}
          >
            {allSelected ? "Clear" : "Select All"}
          </button>
        )}
      </div>

      {status === "idle" && (
        <div className="flex items-center gap-2">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Change Model
            </button>

            {open && (
              <div
                className="absolute right-0 top-full mt-1 w-64 rounded-lg border overflow-hidden z-50"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search models..."
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {filtered.map((model) => (
                    <button
                      key={model.fullId}
                      onClick={() => handleSelect(model)}
                      className="w-full px-3 py-2 text-sm text-left cursor-pointer transition-colors"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClearSelection}
            className="text-xs px-2 py-1.5 rounded cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
