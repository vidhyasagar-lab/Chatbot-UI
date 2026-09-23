import { describe, expect, it } from "vitest";
import { downstreamHeaders, upstreamHeaders } from "./proxy-headers";

const KEY = "server-secret";

describe("upstreamHeaders", () => {
  it("adds the server-side API key and forwards the session cookie", () => {
    const h = upstreamHeaders(new Headers({ cookie: "user_id=abc", "content-type": "application/json" }), KEY);
    expect(h.get("x-api-key")).toBe(KEY);
    expect(h.get("cookie")).toBe("user_id=abc");
    expect(h.get("content-type")).toBe("application/json");
  });

  it("never forwards an API key the browser sent", () => {
    const h = upstreamHeaders(new Headers({ "x-api-key": "attacker-guess" }), KEY);
    expect(h.get("x-api-key")).toBe(KEY);
  });

  it("derives X-Client-IP from the platform header, ignoring a client-supplied one", () => {
    const h = upstreamHeaders(
      new Headers({ "x-client-ip": "10.9.9.9", "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      KEY,
    );
    expect(h.get("x-client-ip")).toBe("203.0.113.7");
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    const h = upstreamHeaders(new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" }), KEY);
    expect(h.get("x-client-ip")).toBe("198.51.100.4");
  });

  it("omits X-Client-IP when the platform gives no client address", () => {
    const h = upstreamHeaders(new Headers({ "x-client-ip": "10.9.9.9" }), KEY);
    expect(h.has("x-client-ip")).toBe(false);
  });

  it("drops headers that describe the browser-to-proxy hop", () => {
    const h = upstreamHeaders(new Headers({ host: "verity.vercel.app", origin: "https://verity.vercel.app", "content-length": "12" }), KEY);
    expect(h.has("host")).toBe(false);
    expect(h.has("origin")).toBe(false);
    expect(h.has("content-length")).toBe(false);
  });
});

describe("downstreamHeaders", () => {
  it("passes every Set-Cookie through, not just the first", () => {
    const up = new Headers();
    up.append("set-cookie", "user_id=abc; HttpOnly; Path=/");
    up.append("set-cookie", "other=1; Path=/");
    expect(downstreamHeaders(up).getSetCookie()).toEqual(["user_id=abc; HttpOnly; Path=/", "other=1; Path=/"]);
  });

  it("keeps content-type and retry-after, drops encoding and length", () => {
    const up = new Headers({
      "content-type": "text/event-stream",
      "retry-after": "120",
      "content-encoding": "gzip",
      "content-length": "99",
      "transfer-encoding": "chunked",
    });
    const h = downstreamHeaders(up);
    expect(h.get("content-type")).toBe("text/event-stream");
    expect(h.get("retry-after")).toBe("120");
    expect(h.has("content-encoding")).toBe(false);
    expect(h.has("content-length")).toBe(false);
    expect(h.has("transfer-encoding")).toBe(false);
  });
});
