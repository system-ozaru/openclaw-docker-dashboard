import { NextRequest, NextResponse } from "next/server";
import { setModelLive } from "@/lib/agentGateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }

    await setModelLive(id, model);

    return NextResponse.json({ success: true, model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
