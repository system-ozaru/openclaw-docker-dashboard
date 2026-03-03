import { NextRequest, NextResponse } from "next/server";
import { getJob, cancelBroadcastJob } from "@/lib/broadcastManager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const cancelled = cancelBroadcastJob(jobId);

  if (!cancelled) {
    return NextResponse.json(
      { error: "Job not found or not cancellable" },
      { status: 404 }
    );
  }

  return NextResponse.json({ result: "cancelled" });
}
