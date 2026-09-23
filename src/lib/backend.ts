import { cookies } from "next/headers";
import { upstreamHeaders } from "./proxy-headers";

/** Server-only access to the FastAPI backend. Never import from a client component. */

export function backendConfig(): { url: string; key: string } {
  const url = process.env.BACKEND_URL;
  const key = process.env.BACKEND_API_KEY;
  if (!url || !key) {
    throw new Error("BACKEND_URL and BACKEND_API_KEY must be set in .env.local (see .env.example).");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export type SessionUser = { user_id: string; username: string; role: "user" | "admin"; created_at: string };

/** The signed-in user for the current request, or null. Used by server components to guard pages. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const { url, key } = backendConfig();
  const jar = await cookies();
  const headers = upstreamHeaders(new Headers({ cookie: jar.toString() }), key);
  const res = await fetch(`${url}/api/v1/auth/me`, { headers, cache: "no-store" });
  return res.ok ? ((await res.json()) as SessionUser) : null;
}
