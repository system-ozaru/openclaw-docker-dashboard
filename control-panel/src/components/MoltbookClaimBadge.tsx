"use client";

import { useState, useEffect } from "react";
import type { MoltbookClaimStatus } from "@/lib/types";

interface MoltbookClaimBadgeProps {
  agentId: string;
  moltbookName: string | null;
  moltbookRegistered: boolean;
  moltbookClaimUrl: string | null;
  moltbookClaimStatus: MoltbookClaimStatus;
}

export default function MoltbookClaimBadge({
  agentId,
  moltbookName,
  moltbookRegistered,
  moltbookClaimUrl,
  moltbookClaimStatus,
}: MoltbookClaimBadgeProps) {
  const [claimUrl, setClaimUrl] = useState(moltbookClaimUrl);
  const [claimStatus, setClaimStatus] = useState(moltbookClaimStatus);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (moltbookRegistered && !claimUrl && !fetching) {
      setFetching(true);
      fetch(`/api/agents/${agentId}/moltbook/status`)
        .then((r) => r.json())
        .then((data) => {
          if (data.claimUrl) setClaimUrl(data.claimUrl);
          if (data.claimStatus) setClaimStatus(data.claimStatus);
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [agentId, moltbookRegistered, claimUrl, fetching]);

  if (!moltbookRegistered) {
    return (
      <div className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
        Not registered
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
        🦞 {moltbookName}
      </span>
      {claimStatus === "claimed" ? (
        <span className="text-xs" style={{ color: "var(--green)" }}>
          Claimed
        </span>
      ) : claimUrl ? (
        <a
          href={claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: "var(--yellow)" }}
        >
          Claim
        </a>
      ) : fetching ? (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>...</span>
      ) : null}
    </div>
  );
}
