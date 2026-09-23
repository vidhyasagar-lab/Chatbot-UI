/**
 * Header rules for the server-side proxy to the FastAPI backend.
 *
 * The browser only ever talks to this app's origin. The proxy forwards the
 * session cookie, adds the API key the browser must never see, and names the
 * real client in X-Client-IP so the backend can rate-limit per user rather
 * than per proxy address.
 */

const FORWARD_UP = ["cookie", "content-type", "accept", "user-agent"];
const PASS_DOWN = ["content-type", "cache-control", "retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-accel-buffering"];

/** The client address as reported by the hosting platform (never by the client). */
function clientIp(incoming: Headers): string | null {
  const real = incoming.get("x-real-ip")?.trim();
  if (real) return real;
  const first = incoming.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}

export function upstreamHeaders(incoming: Headers, apiKey: string): Headers {
  const out = new Headers();
  for (const name of FORWARD_UP) {
    const v = incoming.get(name);
    if (v) out.set(name, v);
  }
  out.set("x-api-key", apiKey);
  const ip = clientIp(incoming);
  if (ip) out.set("x-client-ip", ip);
  return out;
}

export function downstreamHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const name of PASS_DOWN) {
    const v = upstream.get(name);
    if (v) out.set(name, v);
  }
  for (const cookie of upstream.getSetCookie()) out.append("set-cookie", cookie);
  return out;
}
