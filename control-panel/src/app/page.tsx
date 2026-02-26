"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import FleetStats from "@/components/FleetStats";
import AgentCard from "@/components/AgentCard";
import BulkActions from "@/components/BulkActions";
import SelectionBar from "@/components/SelectionBar";
import CreateAgentModal from "@/components/CreateAgentModal";
import type { FleetOverview } from "@/lib/types";

export default function Dashboard() {
  const [fleet, setFleet] = useState<FleetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      setFleet(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 15000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  const handleAgentAction = async (agentId: string, action: string) => {
    await fetch(`/api/agents/${agentId}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setTimeout(fetchFleet, 2000);
  };

  const handleFleetAction = async (action: string) => {
    await fetch("/api/fleet/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setTimeout(fetchFleet, 3000);
  };

  const handleToggleSelect = (agentId: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      isSelected ? next.add(agentId) : next.delete(agentId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (fleet) setSelected(new Set(fleet.agents.map((a) => a.id)));
  };

  const handleBulkModelChange = async (model: string) => {
    await fetch("/api/fleet/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentIds: Array.from(selected),
        model,
      }),
    });
    setSelected(new Set());
    await fetchFleet();
    setTimeout(fetchFleet, 5000);
    setTimeout(fetchFleet, 10000);
  };

  const allSelected =
    fleet !== null &&
    fleet.agents.length > 0 &&
    selected.size === fleet.agents.length;

  const availableModels = fleet?.agents[0]?.availableModels ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Fleet Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Monitor and control your OpenClaw agent fleet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
              style={{ background: "var(--accent)", color: "white" }}
            >
              + New Agent
            </button>
            {fleet && <BulkActions onFleetAction={handleFleetAction} />}
          </div>
        </div>

        <CreateAgentModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchFleet(); setTimeout(fetchFleet, 5000); }}
        />

        {loading && (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            Loading fleet...
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border p-4 mb-6"
            style={{
              background: "var(--red-subtle)",
              borderColor: "var(--red)",
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        )}

        {fleet && (
          <>
            <FleetStats
              totalAgents={fleet.totalAgents}
              totalRunning={fleet.totalRunning}
              totalStopped={fleet.totalStopped}
            />

            <SelectionBar
              selectedCount={selected.size}
              totalCount={fleet.agents.length}
              allSelected={allSelected}
              onSelectAll={handleSelectAll}
              onClearSelection={() => setSelected(new Set())}
              availableModels={availableModels}
              onBulkModelChange={handleBulkModelChange}
            />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Agents
                </h2>
                {fleet.agents.length > 0 && selected.size === 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-2 py-0.5 rounded cursor-pointer"
                    style={{
                      color: "var(--text-muted)",
                      background: "var(--bg-hover)",
                    }}
                  >
                    Select All
                  </button>
                )}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Auto-refreshes every 15s
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fleet.agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selectable={true}
                  selected={selected.has(agent.id)}
                  onSelect={handleToggleSelect}
                  onAction={handleAgentAction}
                  onRefresh={fetchFleet}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
