import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FastAPI routes such as /api/v1/feedback/ end in a slash. Next's default
  // redirect would strip it, FastAPI would redirect back, and the proxy would loop.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
