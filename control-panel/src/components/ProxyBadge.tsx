"use client";

import { useState, useEffect } from "react";
import type { ProxyInfo, ProxyConfig } from "@/lib/types";

interface ProxyBadgeProps {
  agentId: string;
  proxy?: ProxyInfo;
}

let configCache: { data: ProxyConfig | null; ts: number; promise: Promise<ProxyConfig | null> | null } = {
  data: null, ts: 0, promise: null,
};
const CACHE_TTL = 15_000;

function fetchProxyConfig(): Promise<ProxyConfig | null> {
  if (configCache.data && Date.now() - configCache.ts < CACHE_TTL) {
    return Promise.resolve(configCache.data);
  }
  if (configCache.promise) return configCache.promise;

  configCache.promise = fetch("/api/proxy/config")
    .then((r) => r.json() as Promise<ProxyConfig>)
    .then((data) => {
      configCache = { data, ts: Date.now(), promise: null };
      return data;
    })
    .catch(() => {
      configCache.promise = null;
      return configCache.data;
    });

  return configCache.promise;
}

function isProxyEnabled(config: ProxyConfig, agentId: string): boolean {
  const override = config.agents?.[agentId];
  if (!override?.enabled) return false;
  const provider = override.provider ?? config.defaultProvider;
  return !!provider?.host;
}

export default function ProxyBadge({ agentId, proxy }: ProxyBadgeProps) {
  const [enabled, setEnabled] = useState(proxy?.enabled ?? false);
  const [ip, setIp] = useState<string | null>(null);
  const [loadingIp, setLoadingIp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProxyConfig().then((config) => {
      if (cancelled || !config) return;
      setEnabled(isProxyEnabled(config, agentId));
    });
    return () => { cancelled = true; };
  }, [agentId]);

  useEffect(() => {
    if (!enabled) { setIp(null); return; }
    let cancelled = false;
    setLoadingIp(true);
    fetch(`/api/proxy/health/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setIp(data.publicIp || null);
        if (typeof data.proxyEnabled === "boolean") {
          setEnabled(data.proxyEnabled);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingIp(false); });
    return () => { cancelled = true; };
  }, [agentId, enabled]);

  if (!enabled) {
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
      title={ip ? `Public IP: ${ip}` : `Proxy: ${proxy?.host ?? "configured"}:${proxy?.port ?? ""}`}
    >
      <span style={{ fontSize: "0.6rem" }}>🛡</span>
      Proxied
      {ip && (
        <span className="opacity-70" style={{ fontSize: "0.65rem" }}>
          · {ip}
        </span>
      )}
      {!ip && loadingIp && (
        <span className="opacity-40" style={{ fontSize: "0.65rem" }}>
          · …
        </span>
      )}
    </span>
  );
}
