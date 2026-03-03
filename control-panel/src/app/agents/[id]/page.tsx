"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import ChatPanel from "@/components/ChatPanel";
import LogViewer from "@/components/LogViewer";
import ModelSelector from "@/components/ModelSelector";
import MoltbookClaimBadge from "@/components/MoltbookClaimBadge";
import HeartbeatPanel from "@/components/HeartbeatPanel";
import CronJobList from "@/components/CronJobList";
import AgentTerminal from "@/components/AgentTerminal";
import ProxyPanel from "@/components/ProxyPanel";
import WorkspaceFiles from "@/components/WorkspaceFiles";
import type { AgentStatus } from "@/lib/types";

export default function AgentDetail() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        const found = data.agents?.find(
          (a: AgentStatus) => a.id === agentId
        );
        setAgent(found || null);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchAgent();
    const interval = setInterval(fetchAgent, 15000);
    return () => clearInterval(interval);
  }, [agentId]);

  const handleControl = async (action: string) => {
    await fetch(`/api/agents/${agentId}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <div style={{ color: "var(--text-muted)" }}>Loading...</div>
        </main>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <div style={{ color: "var(--red)" }}>Agent not found: {agentId}</div>
          <Link href="/" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <Link
          href="/"
          className="text-xs mb-4 inline-block"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Dashboard
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.emoji || "🤖"}</span>
            <div>
              <h1
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                {agent.name}
                <StatusBadge
                  status={agent.containerStatus}
                  healthy={agent.healthy}
                />
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {agent.vibe}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleControl("restart")}
              className="px-3 py-1.5 rounded border text-xs cursor-pointer"
              style={{
                borderColor: "var(--border)",
                color: "var(--yellow)",
                background: "var(--yellow-subtle)",
              }}
            >
              Restart
            </button>
            {agent.containerStatus === "running" ? (
              <button
                onClick={() => handleControl("stop")}
                className="px-3 py-1.5 rounded border text-xs cursor-pointer"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => handleControl("start")}
                className="px-3 py-1.5 rounded border text-xs cursor-pointer"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--green)",
                  background: "var(--green-subtle)",
                }}
              >
                Start
              </button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Agent ID", value: agent.id },
            { label: "Port", value: String(agent.port) },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border p-3"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                {card.label}
              </div>
              <div
                className="text-sm font-medium truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {card.value}
              </div>
            </div>
          ))}
          <div
            className="rounded-lg border p-3"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Moltbook
            </div>
            <MoltbookClaimBadge
              agentId={agent.id}
              moltbookName={agent.moltbookName}
              moltbookRegistered={agent.moltbookRegistered}
              moltbookClaimUrl={agent.moltbookClaimUrl}
              moltbookClaimStatus={agent.moltbookClaimStatus}
            />
          </div>
        </div>

        {/* Model selector */}
        <div className="mb-6">
          <div className="text-xs mb-2 font-medium" style={{ color: "var(--text-muted)" }}>
            LLM Model
          </div>
          <div className="max-w-sm">
            <ModelSelector
              agentId={agent.id}
              currentModel={agent.currentModel}
              availableModels={agent.availableModels}
            />
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            Changing model restarts the agent container automatically
          </div>
        </div>

        {/* Heartbeat + Cron */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <HeartbeatPanel agentId={agent.id} showApplyAll />
          <CronJobList agentId={agent.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChatPanel agentId={agent.id} agentName={agent.name} />
          <LogViewer agentId={agent.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AgentTerminal agentId={agent.id} />
          <ProxyPanel agentId={agent.id} proxyEnabled={agent.proxy?.enabled} />
        </div>

        {/* Workspace files */}
        <WorkspaceFiles agentId={agent.id} />
      </main>
    </div>
  );
}
