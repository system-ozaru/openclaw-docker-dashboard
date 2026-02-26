import { NextRequest, NextResponse } from "next/server";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import path from "path";
import { isZeabur } from "@/lib/fleetMode";
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
    const { action } = await request.json();

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json(
        { error: "action must be start, stop, or restart" },
        { status: 400 }
      );
    }

    if (isZeabur()) {
      const services = await zeabur.listAgentServices();
      const CONCURRENCY = 20;
      const zeaburAction = action === "stop" ? "suspend" : action === "start" ? "resume" : "restart";

      for (let i = 0; i < services.length; i += CONCURRENCY) {
        const batch = services.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((svc) =>
            zeabur.controlService(svc.serviceId, zeaburAction as "restart" | "suspend" | "resume")
              .catch(() => {})
          )
        );
      }
      return NextResponse.json({ result: `All agents: ${action} completed` });
    }

    if (action === "restart") {
      await execAsync(`cd "${FLEET_ROOT}" && docker compose restart 2>&1`, {
        timeout: 60000,
        env: ENV,
      });
      return NextResponse.json({ result: "All agents restarted" });
    }

    const flag = action === "stop" ? "" : "-d";
    const cmd =
      action === "stop"
        ? `cd "${FLEET_ROOT}" && docker compose stop 2>&1`
        : `cd "${FLEET_ROOT}" && docker compose up ${flag} 2>&1`;

    const { stdout } = await execAsync(cmd, { timeout: 60000, env: ENV });
    return NextResponse.json({ result: stdout.trim() || `${action} completed` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
