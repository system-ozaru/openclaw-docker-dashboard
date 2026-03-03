"use client";

import type { ProxyInfo } from "@/lib/types";

interface ProxyBadgeProps {
  proxy?: ProxyInfo;
}

export default function ProxyBadge({ proxy }: ProxyBadgeProps) {
  if (!proxy?.enabled) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
        style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}
        title="No proxy configured"
      >
        <span style={{ fontSize: "0.6rem" }}>●</span>
        Direct
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
      style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}
      title={`Proxy: ${proxy.host}:${proxy.port} (${proxy.type})`}
    >
      <span style={{ fontSize: "0.6rem" }}>🛡</span>
      Proxied
    </span>
  );
}
