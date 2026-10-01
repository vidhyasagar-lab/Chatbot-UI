import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // FastAPI routes such as /api/v1/feedback/ end in a slash. Next's default
  // redirect would strip it, FastAPI would redirect back, and the proxy would loop.
  skipTrailingSlashRedirect: true,

  // Applied here rather than in middleware so they cover every response,
  // including statically rendered pages, without making any route dynamic.
  // The dev policy differs in one directive; see security-headers.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "development"),
      },
    ];
  },

  // The version banner and similar give away the framework version for free.
  poweredByHeader: false,
};

export default nextConfig;
