const RELAY_URL = process.env.RELAY_URL?.replace(/\/$/, "") || "http://localhost:3400";
const RELAY_KEY = process.env.RELAY_API_KEY || "";

export async function relayGet<T = unknown>(path: string, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${RELAY_URL}${path}`, {
    headers: { "X-Relay-Key": RELAY_KEY },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Relay ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function relayPost<T = unknown>(path: string, body: unknown, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${RELAY_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Relay-Key": RELAY_KEY },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Relay ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function relayPut<T = unknown>(path: string, body: unknown, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${RELAY_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Relay-Key": RELAY_KEY },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Relay ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function relayDelete<T = unknown>(path: string, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${RELAY_URL}${path}`, {
    method: "DELETE",
    headers: { "X-Relay-Key": RELAY_KEY },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Relay ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
