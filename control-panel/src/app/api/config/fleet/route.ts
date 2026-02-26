import { NextRequest, NextResponse } from "next/server";
import { applyConfigToAllAgents, listAgentIds } from "@/lib/configService";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const result = await applyConfigToAllAgents(content);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET() {
  try {
    const agentIds = await listAgentIds();
    return NextResponse.json({ agentIds });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
