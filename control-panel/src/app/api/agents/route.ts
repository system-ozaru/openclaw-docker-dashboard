import { NextResponse } from "next/server";
import { getFleetOverview } from "@/lib/agentDiscovery";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await getFleetOverview();
    return NextResponse.json(overview);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
