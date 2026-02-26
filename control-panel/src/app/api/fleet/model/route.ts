import { NextRequest, NextResponse } from "next/server";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import path from "path";
import { isZeabur } from "@/lib/fleetMode";
import { getAgentMeta } from "@/lib/agentDiscovery";
import { sendRequest } from "@/lib/wsGateway";
import * as zeabur from "@/lib/zeaburService";

const execAsync = promisify(execCb);
const FLEET_ROOT = path.resolve(process.cwd(), "..");

const ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
  HOME: process.env.REAL_HOME || `/Users/${process.env.USER || "ozaru"}`,
  DOCKER_CLI_HINTS: "false",
};

export async function POST(request: NextRequest) {
  try {
    const { agentIds, model } = await request.json();

    if (!agentIds?.length || !model) {
      return NextResponse.json(
        { error: "agentIds and model are required" },
        { status: 400 }
      );
    }

    const updated: string[] = [];
    const errors: string[] = [];

    if (isZeabur()) {
      for (const agentId of agentIds) {
        try {
          const meta = getAgentMeta(agentId);
          if (!meta) { errors.push(`${agentId}: no cached metadata`); continue; }
          await sendRequest(meta.serviceId, meta.port, meta.token, "config.set", {
            path: "agents.defaults.model.primary", value: model,
          });
          updated.push(agentId);
        } catch (err) {
          errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Restart updated agents in batches
      const CONCURRENCY = 20;
      for (let i = 0; i < updated.length; i += CONCURRENCY) {
        const batch = updated.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((agentId) => {
            const meta = getAgentMeta(agentId);
            return meta ? zeabur.controlService(meta.serviceId, "restart").catch(() => {}) : Promise.resolve();
          })
        );
      }

      return NextResponse.json({ updated, errors });
    }

    const escaped = model.replace(/"/g, '\\"');

    for (const agentId of agentIds) {
      const container = `openclaw-${agentId}`;
      try {
        await execAsync(
          `docker exec ${container} openclaw config set agents.defaults.model.primary "${escaped}"`,
          { timeout: 10000, env: ENV }
        );
        updated.push(agentId);
      } catch (err) {
        errors.push(`${agentId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (updated.length > 0) {
      const services = updated.join(" ");
      await execAsync(
        `cd "${FLEET_ROOT}" && docker compose restart ${services} 2>&1`,
        { timeout: 60000, env: ENV }
      ).catch(() => {});
    }

    return NextResponse.json({ updated, errors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
