"use client";

import { useState, useRef, useEffect } from "react";
import type { ModelOption } from "@/lib/types";

interface ModelSelectorProps {
  agentId: string;
  currentModel: string;
  availableModels: ModelOption[];
  onModelChange?: (model: string) => void;
}

type SwitchStatus = "idle" | "switching" | "restarting" | "verifying" | "done" | "error";

export default function ModelSelector({
  agentId,
  currentModel,
  availableModels,
  onModelChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SwitchStatus>("idle");
  const [activeModel, setActiveModel] = useState(currentModel);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveModel(currentModel);
  }, [currentModel]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (status === "done") {
      const t = setTimeout(() => setStatus("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const filtered = availableModels.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const currentModelName =
    availableModels.find((m) => m.fullId === activeModel)?.name ??
    activeModel.split("/").pop() ??
    "Unknown";

  const handleSelect = async (model: ModelOption) => {
    if (model.fullId === activeModel) {
      setOpen(false);
      setSearch("");
      return;
    }

    setOpen(false);
    setSearch("");
    setStatus("switching");

    try {
      const res = await fetch(`/api/agents/${agentId}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.fullId }),
      });
      if (res.ok) {
        setStatus("done");
        setActiveModel(model.fullId);
        onModelChange?.(model.fullId);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isBusy = status !== "idle" && status !== "done" && status !== "error";

  const statusLabel = {
    idle: currentModelName,
    switching: "Switching model & restarting...",
    restarting: "Restarting container...",
    verifying: "Verifying...",
    done: `${currentModelName} ✓`,
    error: "Switch failed — try again",
  }[status];

  const borderColor = {
    idle: open ? "var(--accent)" : "var(--border)",
    switching: "var(--yellow)",
    restarting: "var(--yellow)",
    verifying: "var(--yellow)",
    done: "var(--green)",
    error: "var(--red)",
  }[status];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !isBusy && setOpen(!open)}
        disabled={isBusy}
        className="w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors disabled:cursor-wait"
        style={{
          background: "var(--bg-card)",
          borderColor,
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isBusy ? (
            <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
              style={{ borderColor: "var(--yellow)", borderTopColor: "transparent" }} />
          ) : status === "done" ? (
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : status === "error" ? (
            <span className="text-xs shrink-0" style={{ color: "var(--red)" }}>✕</span>
          ) : (
            <span className="text-xs shrink-0" style={{ color: "var(--accent)" }}>⬡</span>
          )}
          <span className="truncate" style={{
            color: status === "error" ? "var(--red)" :
                   status === "done" ? "var(--green)" :
                   isBusy ? "var(--yellow)" :
                   "var(--text-primary)",
          }}>
            {statusLabel}
          </span>
        </div>
        {!isBusy && status !== "done" && status !== "error" && (
          <svg
            className="w-3.5 h-3.5 shrink-0 transition-transform"
            style={{
              color: "var(--text-muted)",
              transform: open ? "rotate(180deg)" : "rotate(0)",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border overflow-hidden z-50"
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
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                No models found
              </div>
            )}
            {filtered.map((model) => {
              const isActive = model.fullId === activeModel;
              return (
                <button
                  key={model.fullId}
                  onClick={() => handleSelect(model)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left cursor-pointer transition-colors"
                  style={{
                    background: isActive ? "var(--accent-subtle)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{model.name}</span>
                  {isActive && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
