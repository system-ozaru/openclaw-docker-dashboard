import { NextRequest, NextResponse } from "next/server";
import {
  setFleetHeartbeat,
  setFleetHeartbeatMd,
  listAgentIds,
  getHeartbeatConfig,
} from "@/lib/heartbeatService";
import type { HeartbeatConfig } from "@/lib/types";

export async function GET() {
  try {
    const ids = await listAgentIds();
    const first = ids[0];
    if (!first) return NextResponse.json({ config: null, heartbeatMd: "" });
    const info = await getHeartbeatConfig(first);
    return NextResponse.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.config) {
      await setFleetHeartbeat(body.config as HeartbeatConfig);
    }
    if (typeof body.heartbeatMd === "string") {
      await setFleetHeartbeatMd(body.heartbeatMd);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
