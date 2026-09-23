import type { NextRequest } from "next/server";
import { backendConfig } from "@/lib/backend";
import { downstreamHeaders, upstreamHeaders } from "@/lib/proxy-headers";

/**
 * Same-origin proxy for every backend route. A rewrite could forward requests,
 * but not attach the API key, which must stay server-side.
 */

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest): Promise<Response> {
  const { url, key } = backendConfig();
  // pathname (not the route params) so trailing slashes FastAPI relies on survive
  const target = `${url}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const upstream = await fetch(target, {
    method: req.method,
    headers: upstreamHeaders(req.headers, key),
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    cache: "no-store",
    signal: req.signal,
    // required by Node when streaming a request body (file uploads)
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: downstreamHeaders(upstream.headers),
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
