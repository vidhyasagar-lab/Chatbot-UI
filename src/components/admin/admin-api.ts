"use client";

import { useCallback, useEffect, useState } from "react";

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function messageOf(res: Response): Promise<string> {
  if (res.status === 429) return "Too many requests right now. Wait a few seconds, then try again.";
  if (res.status === 403) return "This needs an admin account.";
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // not JSON
  }
  return res.status >= 500 ? "The server hit an error. Try again." : "That didn't work. Try again.";
}

/** Call /api/v1/admin{path}. Throws AdminError with a readable message; a lapsed session goes to sign-in. */
export async function adminJson<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1/admin${path}`, {
      method: init?.method ?? "GET",
      cache: "no-store",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new AdminError("Can't reach the server. Check your connection.", 0);
  }
  if (res.status === 401) {
    // A full load on purpose: nothing from the lapsed session should survive. replace: Back must not return here.
    window.location.replace("/login");
    throw new AdminError("Your session has expired. Sign in again.", 401);
  }
  if (!res.ok) throw new AdminError(await messageOf(res), res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Load an admin resource. `reload` refetches without blanking what is on screen. */
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      adminJson<T>(path).then(
        (d) => ({ ok: true as const, d }),
        (e: unknown) => ({ ok: false as const, e: e instanceof Error ? e.message : "Something went wrong." }),
      ),
    [path],
  );

  useEffect(() => {
    let alive = true;
    load().then((r) => {
      if (!alive) return;
      setLoading(false);
      if (r.ok) {
        setData(r.d);
        setError(null);
      } else setError(r.e);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const reload = useCallback(async () => {
    const r = await load();
    if (r.ok) {
      setData(r.d);
      setError(null);
    } else setError(r.e);
    setLoading(false);
  }, [load]);

  return { data, error, loading, reload, setData };
}
