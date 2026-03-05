import { NextResponse } from "next/server";
import { relayPost } from "@/lib/relayClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await relayPost("/api/proxy/test", body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
