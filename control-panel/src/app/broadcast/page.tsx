"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import BroadcastPanel from "@/components/BroadcastPanel";
import type { FleetOverview } from "@/lib/types";

export default function BroadcastPage() {
  const [fleet, setFleet] = useState<FleetOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const data = await res.json();
      setFleet(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 30000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-56 flex-1 p-4 pb-24 md:p-8 md:pb-8 max-w-3xl">
        <div className="mb-6">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Broadcast Center
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Send a message to multiple agents with controlled concurrency
          </p>
        </div>

        {loading && (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            Loading fleet...
          </div>
        )}

        {fleet && (
          <BroadcastPanel
            agents={fleet.agents}
            agentCount={fleet.totalAgents}
            runningCount={fleet.totalRunning}
          />
        )}
      </main>
    </div>
  );
}
