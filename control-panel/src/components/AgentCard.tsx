"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import ProxyBadge from "./ProxyBadge";
import type { AgentStatus, MoltbookClaimStatus } from "@/lib/types";

interface AgentCardProps {
  agent: AgentStatus;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (agentId: string, selected: boolean) => void;
  onAction?: (agentId: string, action: string) => void;
  onRefresh?: () => void;
}

type RegState = "idle" | "editing" | "registering" | "done" | "error";

export default function AgentCard({
  agent,
  selectable,
  selected,
  onSelect,
  onAction,
  onRefresh,
}: AgentCardProps) {
  const [regState, setRegState] = useState<RegState>("idle");
  const [moltName, setMoltName] = useState(agent.name);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(agent.moltbookClaimUrl);
  const [claimStatus, setClaimStatus] = useState<MoltbookClaimStatus>(agent.moltbookClaimStatus);
  const [regError, setRegError] = useState<string | null>(null);
  const [fetchingClaim, setFetchingClaim] = useState(false);

  useEffect(() => {
    if (agent.moltbookRegistered && !claimUrl && !fetchingClaim) {
      setFetchingClaim(true);
      fetch(`/api/agents/${agent.id}/moltbook/status`)
        .then((r) => r.json())
        .then((data) => {
          if (data.claimUrl) setClaimUrl(data.claimUrl);
          if (data.claimStatus) setClaimStatus(data.claimStatus);
        })
        .catch(() => {})
        .finally(() => setFetchingClaim(false));
    }
  }, [agent.id, agent.moltbookRegistered, claimUrl, fetchingClaim]);

  const handleStartRegister = () => {
    setMoltName(agent.name);
    setRegState("editing");
    setRegError(null);
  };

  const handleRegister = async () => {
    setRegState("registering");
    setRegError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/moltbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: moltName }),
      });
      const data = await res.json();
      if (data.success && data.claimUrl) {
        setRegisteredName(data.registeredName || moltName);
        setClaimUrl(data.claimUrl);
        setClaimStatus("pending_claim");
        setRegState("done");
        onRefresh?.();
      } else if (data.error) {
        setRegError(data.error);
        setRegState("editing");
      } else {
        setRegState("done");
        onRefresh?.();
      }
    } catch {
      setRegError("Network error");
      setRegState("editing");
    }
  };

  const renderClaimLink = () => {
    if (claimStatus === "claimed") {
      return (
        <span className="text-xs" style={{ color: "var(--green)" }}>
          Claimed
        </span>
      );
    }

    if (claimUrl) {
      return (
        <a
          href={claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: "var(--yellow)" }}
        >
          Claim
        </a>
      );
    }

    if (fetchingClaim) {
      return (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>...</span>
      );
    }

    return null;
  };

  const renderMoltbookSection = () => {
    if (agent.moltbookRegistered || (regState === "done" && registeredName)) {
      const displayName = agent.moltbookName || registeredName;
      return (
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--accent)" }}>
            🦞 {displayName}
          </span>
          {renderClaimLink()}
        </div>
      );
    }

    if (regState === "registering") {
      return (
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <span style={{ color: "var(--accent)" }}>Registering...</span>
        </div>
      );
    }

    if (regState === "editing") {
      return (
        <div className="flex flex-col gap-1.5 w-full mt-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={moltName}
              onChange={(e) => setMoltName(e.target.value)}
              className="flex-1 rounded border px-1.5 py-0.5 text-xs outline-none min-w-0"
              style={{
                background: "var(--bg-primary)",
                borderColor: regError ? "var(--red)" : "var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Moltbook name"
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            />
            <button
              onClick={handleRegister}
              disabled={!moltName.trim()}
              className="text-xs px-2 py-0.5 rounded cursor-pointer disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Go
            </button>
            <button
              onClick={() => setRegState("idle")}
              className="text-xs px-1 cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>
          {regError && (
            <span className="text-xs" style={{ color: "var(--red)" }}>
              {regError}
            </span>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={handleStartRegister}
        className="cursor-pointer underline"
        style={{ color: "var(--text-muted)" }}
      >
        🦞 Register
      </button>
    );
  };

  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{
        background: "var(--bg-card)",
        borderColor: selected ? "var(--accent)" : "var(--border)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(agent.id, e.target.checked)}
              className="w-3.5 h-3.5 rounded cursor-pointer accent-[var(--accent)]"
            />
          )}
          <span className="text-xl">{agent.emoji || "🤖"}</span>
          <div>
            <Link
              href={`/agents/${agent.id}`}
              className="font-semibold text-sm hover:underline"
              style={{ color: "var(--text-primary)" }}
            >
              {agent.name}
            </Link>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {agent.id}
            </div>
          </div>
        </div>
        <StatusBadge status={agent.containerStatus} healthy={agent.healthy} />
      </div>

      <div
        className="text-xs mb-2 line-clamp-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {agent.vibe || "No vibe set"}
      </div>

      <div
        className="text-xs mb-3 flex items-center gap-3"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="flex items-center gap-1">
          <span style={{ color: "var(--accent)" }}>⬡</span>
          {agent.currentModel?.split("/").pop() || "No model"}
        </span>
        {agent.heartbeatEvery && agent.heartbeatEvery !== "0m" && (
          <span className="flex items-center gap-1" title={`Heartbeat every ${agent.heartbeatEvery}`}>
            <span style={{ color: "var(--green)" }}>♥</span>
            {agent.heartbeatEvery}
          </span>
        )}
        {agent.cronJobCount > 0 && (
          <span className="flex items-center gap-1" title={`${agent.cronJobCount} active cron job(s)`}>
            <span style={{ color: "var(--yellow)" }}>⏱</span>
            {agent.cronJobCount}
          </span>
        )}
        <ProxyBadge proxy={agent.proxy} />
      </div>

      <div
        className="flex items-center justify-between text-xs pt-3 border-t"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <span>Port {agent.port}</span>
        {renderMoltbookSection()}
      </div>

      <div className="flex gap-2 mt-3">
        {agent.containerStatus === "running" ? (
          <button
            onClick={() => onAction?.(agent.id, "stop")}
            className="flex-1 text-xs py-1.5 rounded border cursor-pointer transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => onAction?.(agent.id, "start")}
            className="flex-1 text-xs py-1.5 rounded border cursor-pointer transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--green)",
              background: "var(--green-subtle)",
            }}
          >
            Start
          </button>
        )}
        <button
          onClick={() => onAction?.(agent.id, "restart")}
          className="flex-1 text-xs py-1.5 rounded border cursor-pointer transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          Restart
        </button>
        <Link
          href={`/agents/${agent.id}`}
          className="flex-1 text-xs py-1.5 rounded text-center transition-colors"
          style={{
            background: "var(--accent-subtle)",
            color: "var(--accent)",
          }}
        >
          Detail
        </Link>
        <a
          href={
            agent.publicDomain
              ? `https://${agent.publicDomain}?token=${agent.gatewayToken}`
              : `http://localhost:${agent.port}?token=${agent.gatewayToken}`
          }
          target="_blank"
          rel="noopener noreferrer"
          title="Open agent dashboard in new tab"
          className="flex items-center justify-center px-2 py-1.5 rounded border cursor-pointer transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
            background: "transparent",
          }}
        >
          ↗
        </a>
      </div>
    </div>
  );
}
