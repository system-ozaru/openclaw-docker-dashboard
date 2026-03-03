import { NextResponse } from "next/server";
import { relayGet } from "@/lib/relayClient";

export async function GET() {
  try {
    const data = await relayGet("/api/proxy/health", 60000);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
