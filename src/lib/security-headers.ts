/**
 * Security headers for the browser-facing app.
 *
 * The backend sets a full set of these, but those ride on JSON API responses.
 * The HTML a visitor actually loads came with none at all: no policy, nothing
 * stopping the page being framed, nothing confining where an injected script
 * could send data. Applied from next.config.ts, so they cover every route
 * including static ones.
 *
 * What this policy does not close: Next's App Router emits inline hydration
 * scripts whose contents vary per page, so permitting them needs either
 * 'unsafe-inline' or a per-request nonce. A nonce has to be read in the root
 * layout, which makes every page dynamic and gives up static rendering of the
 * landing page. The choice here keeps that, and keeps the parts of a policy
 * that matter most for this app: a script can only be loaded from this
 * origin, data can only be sent to this origin, the page cannot be framed,
 * and a form cannot post elsewhere.
 */

/** One directive per line, joined. Kept as data so it can be asserted. */
const DIRECTIVES: Record<string, string[]> = {
  // Anything not named below is refused.
  "default-src": ["'self'"],
  // No remote script origin. 'unsafe-inline' is required by the framework's
  // own hydration scripts; see the note above for why a nonce is not used.
  // 'unsafe-eval' is added in development only - React's dev build calls
  // eval() for debugging features and says so in the console when it cannot,
  // while a production build never does. Allowing it in the shipped policy
  // would give an injected string a route to becoming code.
  "script-src": ["'self'", "'unsafe-inline'"],
  // Tailwind sets style attributes, and the share bars on the usage page are
  // inline widths. No remote stylesheet: next/font self-hosts at build time.
  "style-src": ["'self'", "'unsafe-inline'"],
  // Fonts are served from this origin for the same reason.
  "font-src": ["'self'"],
  // data: for the inline brand mark and any base64 figure.
  "img-src": ["'self'", "data:", "blob:"],
  // The browser never talks to the backend directly - it goes through this
  // app's server-side proxy - so there is no third origin to allow, and an
  // injected script has nowhere to post what it reads.
  "connect-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  // Harmless on https, and stops a mixed-content subresource loading at all.
  "upgrade-insecure-requests": [],
};

export function contentSecurityPolicy({ dev = false }: { dev?: boolean } = {}): string {
  return Object.entries(DIRECTIVES)
    .map(([name, values]) => {
      const extra = dev && name === "script-src" ? ["'unsafe-eval'"] : [];
      const all = [...values, ...extra];
      return all.length ? `${name} ${all.join(" ")}` : name;
    })
    .join("; ");
}

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // frame-ancestors supersedes this, but it costs one header and still
  // covers browsers that never implemented it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Two years, matching the preload list's minimum. Vercel sets this on its
  // own domains; a custom domain is the owner's to configure, and sending it
  // here means the app does not depend on where it is hosted.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Explicitly off, not "1; mode=block". The XSS Auditor is gone from every
  // current browser, and where it survives its filtering has itself been
  // used to leak cross-origin data. The policy above is the real control.
  { key: "X-XSS-Protection", value: "0" },
];

/** The headers to send, for the environment currently running. */
export function securityHeaders(dev: boolean): { key: string; value: string }[] {
  return SECURITY_HEADERS.map((h) =>
    h.key === "Content-Security-Policy" ? { ...h, value: contentSecurityPolicy({ dev }) } : h,
  );
}
