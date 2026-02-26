import { NextRequest, NextResponse } from "next/server";
import {
  getHeartbeatConfig,
  setHeartbeatConfig,
  setHeartbeatMd,
} from "@/lib/heartbeatService";
import type { HeartbeatConfig } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const info = await getHeartbeatConfig(id);
    return NextResponse.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.config) {
      await setHeartbeatConfig(id, body.config as HeartbeatConfig);
    }
    if (typeof body.heartbeatMd === "string") {
      await setHeartbeatMd(id, body.heartbeatMd);
    }

    const updated = await getHeartbeatConfig(id);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
