import { NextRequest, NextResponse } from "next/server";
import { execCommand } from "@/lib/agentGateway";

const BLOCKED = /^\s*(rm|del|format|mkfs|dd|shutdown|reboot|kill|pkill)\b/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { command } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }

    const trimmed = command.trim();
    if (BLOCKED.test(trimmed)) {
      return NextResponse.json({ error: "This command is not allowed" }, { status: 403 });
    }

    const output = await execCommand(id, trimmed);
    return NextResponse.json({ output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
