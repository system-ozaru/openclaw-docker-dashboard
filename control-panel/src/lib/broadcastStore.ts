import { supabase } from "./supabase";
import type { BroadcastJob, AgentJobResult } from "./broadcastTypes";

// ---------------------------------------------------------------------------
// Save a completed job + its per-agent results to Supabase.
// Falls back silently if Supabase is unavailable.
// ---------------------------------------------------------------------------

export async function saveJob(job: BroadcastJob): Promise<void> {
  if (!supabase) return;

  try {
    const { error: jobErr } = await supabase
      .from("openclaw_broadcast_jobs")
      .upsert(
        {
          id: job.id,
          session_id: job.sessionId,
          message: job.message,
          config: job.config,
          status: job.status,
          created_at: job.createdAt,
          started_at: job.startedAt ?? null,
          completed_at: job.completedAt ?? null,
          total_agents: job.totalAgents,
          processed_count: job.processedCount,
          success_count: job.successCount,
          error_count: job.errorCount,
        },
        { onConflict: "id" }
      );

    if (jobErr) {
      console.error("[broadcastStore] saveJob error:", jobErr.message);
      return;
    }

    if (job.results.length > 0) {
      const rows = job.results.map((r) => ({
        job_id: job.id,
        agent_id: r.agentId,
        agent_name: r.agentName,
        emoji: r.emoji || "",
        status: r.status,
        response_text: r.responseText ?? null,
        duration_ms: r.durationMs ?? null,
        model: r.model ?? null,
        error: r.error ?? null,
        retry_count: r.retryCount,
      }));

      const { error: resErr } = await supabase
        .from("openclaw_broadcast_results")
        .upsert(rows, { onConflict: "job_id,agent_id" });

      if (resErr) {
        console.error("[broadcastStore] saveResults error:", resErr.message);
      }
    }
  } catch (err) {
    console.error("[broadcastStore] saveJob unexpected:", err);
  }
}

// ---------------------------------------------------------------------------
// Load all jobs (with results) from Supabase, newest first.
// ---------------------------------------------------------------------------

export async function loadAll(): Promise<BroadcastJob[]> {
  if (!supabase) return [];

  try {
    const { data: jobRows, error: jobErr } = await supabase
      .from("openclaw_broadcast_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (jobErr || !jobRows) {
      console.error("[broadcastStore] loadAll error:", jobErr?.message);
      return [];
    }

    const jobIds = jobRows.map((j) => j.id);

    let resultRows: Record<string, unknown>[] = [];
    if (jobIds.length > 0) {
      const { data, error: resErr } = await supabase
        .from("openclaw_broadcast_results")
        .select("*")
        .in("job_id", jobIds);

      if (resErr) {
        console.error("[broadcastStore] loadResults error:", resErr.message);
      }
      resultRows = data ?? [];
    }

    const resultsByJob = new Map<string, AgentJobResult[]>();
    for (const r of resultRows) {
      const jobId = r.job_id as string;
      if (!resultsByJob.has(jobId)) resultsByJob.set(jobId, []);
      resultsByJob.get(jobId)!.push({
        agentId: r.agent_id as string,
        agentName: r.agent_name as string,
        emoji: (r.emoji as string) || "",
        status: r.status as AgentJobResult["status"],
        responseText: (r.response_text as string) ?? undefined,
        durationMs: (r.duration_ms as number) ?? undefined,
        model: (r.model as string) ?? undefined,
        error: (r.error as string) ?? undefined,
        retryCount: (r.retry_count as number) || 0,
      });
    }

    return jobRows.map((j) => ({
      id: j.id as string,
      sessionId: j.session_id as string,
      message: j.message as string,
      config: j.config as BroadcastJob["config"],
      status: j.status as BroadcastJob["status"],
      createdAt: j.created_at as number,
      startedAt: (j.started_at as number) ?? undefined,
      completedAt: (j.completed_at as number) ?? undefined,
      totalAgents: j.total_agents as number,
      processedCount: j.processed_count as number,
      successCount: j.success_count as number,
      errorCount: j.error_count as number,
      results: resultsByJob.get(j.id as string) ?? [],
    }));
  } catch (err) {
    console.error("[broadcastStore] loadAll unexpected:", err);
    return [];
  }
}
