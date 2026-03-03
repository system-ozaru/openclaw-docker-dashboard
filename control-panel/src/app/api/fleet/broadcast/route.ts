import { NextRequest, NextResponse } from "next/server";
import {
  createBroadcastJob,
  getAllJobs,
} from "@/lib/broadcastManager";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcastTypes";
import type { BroadcastConfig } from "@/lib/broadcastTypes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, config: userConfig } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required and must be a string" },
        { status: 400 }
      );
    }

    const config: BroadcastConfig = {
      ...DEFAULT_BROADCAST_CONFIG,
      ...userConfig,
    };

    if (config.batchSize < 1 || config.batchSize > 50) {
      return NextResponse.json(
        { error: "batchSize must be between 1 and 50" },
        { status: 400 }
      );
    }

    const job = createBroadcastJob(message, config);
    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const jobs = await getAllJobs();
  return NextResponse.json({ jobs });
}
