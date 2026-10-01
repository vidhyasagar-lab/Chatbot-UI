import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, contentSecurityPolicy } from "./security-headers";

/*
 * The browser-facing app shipped with no security headers at all: the backend
 * set a full set, but those ride on JSON API responses, not on the HTML a
 * visitor loads. These are the headers that page gets.
 */

const policy = contentSecurityPolicy();
const directive = (name: string) =>
  policy
    .split(";")
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(`${name} `));

const header = (name: string) => SECURITY_HEADERS.find((h) => h.key.toLowerCase() === name)?.value;

describe("contentSecurityPolicy", () => {
  it("falls back to refusing anything not named", () => {
    expect(directive("default-src")).toBe("default-src 'self'");
  });

  // The gap this policy does NOT close. Next's App Router emits inline
  // hydration scripts whose contents vary per page, so allowing them needs
  // either 'unsafe-inline' or a per-request nonce, and a nonce means reading
  // headers in the root layout - which makes the landing page dynamic.
  // 'self' still blocks a script pulled from somewhere else, which is the
  // delivery route an injected tag would actually use.
  it("permits no script source other than this origin", () => {
    const scripts = directive("script-src") ?? "";
    expect(scripts).toContain("'self'");
    expect(scripts).not.toContain("http:");
    expect(scripts).not.toContain("https:");
    expect(scripts).not.toContain("*");
  });

  // React's development build calls eval() for debugging features - it says
  // so in the console when the policy forbids it - and never does in a
  // production build. Allowing it everywhere would hand an injected string
  // a way to become code on the deployed site, so it is allowed only where
  // it is needed: locally.
  it("does not allow eval in the policy that ships", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toContain("'unsafe-eval'");
  });

  it("allows eval in development, where React needs it", () => {
    expect(contentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'");
  });

  it("defaults to the policy that ships", () => {
    expect(contentSecurityPolicy()).toBe(contentSecurityPolicy({ dev: false }));
  });

  it("allows inline styles, which Tailwind needs, but no remote stylesheet", () => {
    const styles = directive("style-src") ?? "";
    expect(styles).toContain("'unsafe-inline'");
    expect(styles).not.toContain("https:");
  });

  // next/font/google self-hosts at build time, so there is no font CDN to
  // allow. If that ever changes this test is the thing that notices.
  it("needs no external font or script origin", () => {
    expect(policy).not.toContain("fonts.gstatic.com");
    expect(policy).not.toContain("cdn.jsdelivr.net");
  });

  // The app talks only to its own origin: the backend is reached through the
  // server-side proxy, never from the browser. Anything wider would be a
  // route for an injected script to post data out.
  it("confines network calls to this origin", () => {
    expect(directive("connect-src")).toBe("connect-src 'self'");
  });

  it("refuses to be framed, and blocks plugins and base-tag hijacking", () => {
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'none'");
  });

  // A login form is on this origin. Without this, an injected form could
  // post a password somewhere else.
  it("confines form submissions to this origin", () => {
    expect(directive("form-action")).toBe("form-action 'self'");
  });

  it("allows the figures an answer cites, which the proxy serves as data", () => {
    const images = directive("img-src") ?? "";
    expect(images).toContain("'self'");
    expect(images).toContain("data:");
  });
});

describe("SECURITY_HEADERS", () => {
  it("carries the policy", () => {
    expect(header("content-security-policy")).toBe(policy);
  });

  it("denies framing for browsers that predate frame-ancestors", () => {
    expect(header("x-frame-options")).toBe("DENY");
  });

  it("stops content-type sniffing", () => {
    expect(header("x-content-type-options")).toBe("nosniff");
  });

  it("does not leak the path a visitor came from to other origins", () => {
    expect(header("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("turns off device APIs the app never asks for", () => {
    const permissions = header("permissions-policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation"]) {
      expect(permissions).toContain(`${feature}=()`);
    }
  });

  // Vercel sets HSTS on its own domains, but a custom domain is the owner's
  // to configure, and the header costs nothing to send ourselves.
  it("asks browsers to stay on https", () => {
    const hsts = header("strict-transport-security") ?? "";
    expect(hsts).toMatch(/max-age=\d{7,}/);
    expect(hsts).toContain("includeSubDomains");
  });

  it("sets the XSS auditor to off rather than on", () => {
    // "1; mode=block" is withdrawn guidance: where the auditor survives, its
    // filtering has itself been used to leak cross-origin data.
    expect(header("x-xss-protection")).toBe("0");
  });
});
