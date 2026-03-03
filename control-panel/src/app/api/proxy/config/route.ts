import { NextResponse } from "next/server";
import { relayGet, relayPut } from "@/lib/relayClient";

export async function GET() {
  try {
    const config = await relayGet("/api/proxy/config");
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = await relayPut("/api/proxy/config", body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
