import { NextRequest, NextResponse } from "next/server";
import { createAgentsBulk, type CreateAgentInput } from "@/lib/agentFactory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const count: number = Math.min(Math.max(body.count || 1, 1), 20);
    const input: CreateAgentInput = {
      name: body.name || undefined,
      vibe: body.vibe || undefined,
      personality: body.personality || undefined,
      interests: body.interests || undefined,
      emoji: body.emoji || undefined,
      purpose: body.purpose || undefined,
    };

    if (count > 1) input.name = undefined;

    const results = await createAgentsBulk(count, input);
    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      created: succeeded,
      failed,
      totalCreated: succeeded.length,
      totalFailed: failed.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
