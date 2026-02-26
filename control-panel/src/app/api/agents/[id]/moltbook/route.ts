import { NextRequest, NextResponse } from "next/server";
import { registerOnMoltbook } from "@/lib/agentFactory";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const moltbookName = body.name || undefined;

    const result = await registerOnMoltbook(id, moltbookName);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
