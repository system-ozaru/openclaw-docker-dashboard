import { NextRequest, NextResponse } from "next/server";
import { controlContainer } from "@/lib/agentGateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json(
        { error: "action must be start, stop, or restart" },
        { status: 400 }
      );
    }

    const result = await controlContainer(id, action);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
