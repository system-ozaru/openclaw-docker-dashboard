import { NextResponse } from "next/server";
import { relayPost } from "@/lib/relayClient";

export async function POST() {
  try {
    const result = await relayPost("/api/proxy/apply", {}, 120000);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
