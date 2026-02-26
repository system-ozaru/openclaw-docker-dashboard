"use client";

import { useState, useEffect, useCallback } from "react";
import CronJobCard from "./CronJobCard";
import CronJobEditor from "./CronJobEditor";
import type { CronJob, CronJobInput } from "@/lib/types";

interface CronJobListProps {
  agentId: string;
}

export default function CronJobList({ agentId }: CronJobListProps) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/cron`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleToggle = async (jobId: string, enabled: boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, enabled } : j)));
    await fetch(`/api/agents/${agentId}/cron/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchJobs();
  };

  const handleDelete = async (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    await fetch(`/api/agents/${agentId}/cron/${jobId}`, { method: "DELETE" });
    fetchJobs();
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setShowEditor(true);
  };

  const handleSave = async (input: CronJobInput) => {
    if (editingJob) {
      await fetch(`/api/agents/${agentId}/cron/${editingJob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } else {
      await fetch(`/api/agents/${agentId}/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    }
    setShowEditor(false);
    setEditingJob(null);
    fetchJobs();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingJob(null);
  };

  const enabledCount = jobs.filter((j) => j.enabled).length;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Cron Jobs
          </span>
          {jobs.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}>
              {enabledCount}/{jobs.length} active
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditingJob(null); setShowEditor(true); }}
          className="text-xs px-3 py-1 rounded cursor-pointer"
          style={{ background: "var(--accent)", color: "white" }}
        >
          + Add Job
        </button>
      </div>

      {loading ? (
        <div className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-xs py-6 text-center" style={{ color: "var(--text-muted)" }}>
          No cron jobs configured. Add one to schedule automated tasks.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <CronJobCard
              key={job.id}
              job={job}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showEditor && (
        <CronJobEditor
          agentId={agentId}
          existingJob={editingJob}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
