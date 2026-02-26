import { NextRequest, NextResponse } from "next/server";
import { discoverAgent } from "@/lib/agentDiscovery";
import { ensureAgentRunning, cancelAutoSleep } from "@/lib/lifecycleManager";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await discoverAgent(id);

    cancelAutoSleep(id);
    const awake = await ensureAgentRunning(id, agent.port);

    if (!awake) {
      return NextResponse.json(
        { status: "failed", error: "Container did not become healthy in time" },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: "running" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
