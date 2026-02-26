import { NextRequest } from "next/server";
import { getJob, subscribeToJob } from "@/lib/broadcastManager";
import type { BroadcastProgressEvent } from "@/lib/broadcastTypes";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: BroadcastProgressEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch { /* stream closed */ }
      };

      send({
        type: "snapshot",
        jobId: job.id,
        job,
      } as BroadcastProgressEvent);

      if (job.status === "completed" || job.status === "cancelled" || job.status === "failed") {
        controller.close();
        return;
      }

      unsubscribe = subscribeToJob(jobId, (event) => {
        send(event);
        if (event.type === "job_complete") {
          setTimeout(() => {
            try { controller.close(); } catch { /* already closed */ }
          }, 100);
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
