export type FleetMode = "docker" | "zeabur";

export function getFleetMode(): FleetMode {
  const mode = process.env.FLEET_MODE?.toLowerCase();
  if (mode === "zeabur") return "zeabur";
  return "docker";
}

export function isZeabur(): boolean {
  return getFleetMode() === "zeabur";
}
