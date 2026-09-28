"use client";

import { useEffect, useState } from "react";
import type { GateResult } from "@/lib/gate";

// The gate takes ~25-40s, and a rewrite adds a few more. Backoff, not a fixed
// interval: the backend rate limit is per user and shared with chat itself.
const POLL_DELAYS_MS = [4000, 6000, 8000, 10000, 12000, 15000, 20000, 30000, 30000];

/** Poll the quality gate's verdict for an answer until it arrives or we give up. */
export function useGateResult(traceId: string | undefined, pending: boolean) {
  const [result, setResult] = useState<GateResult | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!pending || !traceId) return;
    let attempt = 0;
    let timer: number | undefined;
    const ctrl = new AbortController();
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/chat/gate/${encodeURIComponent(traceId)}`, { signal: ctrl.signal });
        if (res.status === 200) {
          setResult((await res.json()) as GateResult);
          return;
        }
        if (res.status !== 204) {
          setGaveUp(true); // 429 or an error: the answer stands without a verdict
          return;
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      if (attempt >= POLL_DELAYS_MS.length) setGaveUp(true);
      else timer = window.setTimeout(poll, POLL_DELAYS_MS[attempt++]);
    };
    timer = window.setTimeout(poll, POLL_DELAYS_MS[attempt++]);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [traceId, pending]);

  return { result, gaveUp };
}
