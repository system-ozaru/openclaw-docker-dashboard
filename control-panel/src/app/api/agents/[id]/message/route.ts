import { NextRequest, NextResponse } from "next/server";
import { discoverAgent } from "@/lib/agentDiscovery";
import { sendAgentMessage } from "@/lib/agentGateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agent = await discoverAgent(id);
    const result = await sendAgentMessage(
      agent.port,
      agent.gatewayToken,
      sessionId || "control-panel",
      message
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
