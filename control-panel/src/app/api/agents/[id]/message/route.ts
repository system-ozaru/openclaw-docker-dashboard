import { NextRequest, NextResponse } from "next/server";
import { discoverAgent } from "@/lib/agentDiscovery";
import { sendAgentMessage } from "@/lib/agentGateway";

function isOrderingConflict(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("ordering conflict") || lower.includes("message ordering");
}

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
    const sid = sessionId || "control-panel";

    try {
      const result = await sendAgentMessage(agent.port, agent.gatewayToken, sid, message);
      return NextResponse.json(result);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);

      if (isOrderingConflict(errMsg)) {
        const freshSessionId = `cp-${Date.now()}`;
        const result = await sendAgentMessage(
          agent.port, agent.gatewayToken, freshSessionId, message
        );
        return NextResponse.json({ ...result, newSessionId: freshSessionId });
      }

      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
