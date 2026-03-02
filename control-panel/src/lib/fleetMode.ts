export type FleetMode = "docker" | "zeabur" | "relay";

export function getFleetMode(): FleetMode {
  const mode = process.env.FLEET_MODE?.toLowerCase();
  if (mode === "zeabur") return "zeabur";
  if (mode === "relay") return "relay";
  return "docker";
}

export function isZeabur(): boolean {
  return getFleetMode() === "zeabur";
}

export function isRelay(): boolean {
  return getFleetMode() === "relay";
}
