import { NextResponse } from "next/server";
import { relayGet, relayPut } from "@/lib/relayClient";

const WEBSHARE_BASE = "https://proxy.webshare.io/api/v2";

interface WebshareProxy {
  id: string;
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  valid: boolean;
  country_code: string;
}

interface WebshareListResponse {
  count: number;
  next: string | null;
  results: WebshareProxy[];
}

async function fetchAllProxies(apiKey: string): Promise<WebshareProxy[]> {
  const all: WebshareProxy[] = [];
  let url = `${WEBSHARE_BASE}/proxy/list/?mode=direct&page=1&page_size=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webshare API error ${res.status}: ${text}`);
    }
    const data: WebshareListResponse = await res.json();
    all.push(...data.results.filter((p) => p.valid));
    url = data.next ?? "";
  }

  return all;
}

/** GET — test the API key and return proxy count + preview */
export async function GET(request: Request) {
  const apiKey = new URL(request.url).searchParams.get("apiKey");
  if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

  try {
    const proxies = await fetchAllProxies(apiKey);
    return NextResponse.json({
      count: proxies.length,
      preview: proxies.slice(0, 5).map((p) => ({
        ip: p.proxy_address,
        port: p.port,
        country: p.country_code,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** POST — fetch proxies and auto-assign one per agent */
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

    // 1. Fetch all valid proxies from Webshare
    const proxies = await fetchAllProxies(apiKey);
    if (proxies.length === 0) {
      return NextResponse.json({ error: "No valid proxies found in your Webshare account" }, { status: 400 });
    }

    // 2. Get current agent list
    const fleetData = await relayGet("/api/agents");
    const agents: { id: string }[] = (fleetData.agents ?? []).sort(
      (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
    );

    if (agents.length === 0) {
      return NextResponse.json({ error: "No agents found" }, { status: 400 });
    }

    // 3. Build per-agent overrides — one proxy per agent (cycle if fewer proxies than agents)
    const agentOverrides: Record<string, {
      enabled: boolean;
      provider: {
        type: string;
        host: string;
        port: number;
        username: string;
        password: string;
        sessionMode: string;
        sessionPrefix: string;
      };
    }> = {};

    const assignments: { agentId: string; ip: string; country: string }[] = [];

    agents.forEach((agent, i) => {
      const proxy = proxies[i % proxies.length];
      agentOverrides[agent.id] = {
        enabled: true,
        provider: {
          type: "http-connect",
          host: proxy.proxy_address,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password,
          sessionMode: "sticky",
          sessionPrefix: "openclaw",
        },
      };
      assignments.push({ agentId: agent.id, ip: proxy.proxy_address, country: proxy.country_code });
    });

    // 4. Save to proxy config
    await relayPut("/api/proxy/config", { agents: agentOverrides });

    return NextResponse.json({
      success: true,
      proxiesAvailable: proxies.length,
      agentsConfigured: agents.length,
      assignments,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
