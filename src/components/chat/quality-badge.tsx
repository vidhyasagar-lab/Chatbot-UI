"use client";

import { CircleNotch, SealCheck, SealWarning } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { EvalScores } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type Scores = { faithfulness: number | null; relevancy: number | null; precision: number | null; threshold: number };

const DEFAULT_THRESHOLD = 0.75;
// Backoff, not a fixed interval: the backend rate limit is per user and
// shared with chat itself, so polling must not eat the budget for the next question.
const POLL_DELAYS_MS = [1500, 3000, 6000, 12000, 24000];

/**
 * RAGAS quality for one answer. Eval-gated answers carry scores in the stream;
 * otherwise the backend scores in the background and /chat/scores/{trace}
 * returns 204 until they exist.
 */
export function QualityBadge({ gated, traceId }: { gated?: EvalScores; traceId?: string }) {
  const [scores, setScores] = useState<Scores | null>(
    gated ? { faithfulness: gated.faithfulness, relevancy: null, precision: gated.contextPrecision, threshold: gated.threshold } : null,
  );
  const [gaveUp, setGaveUp] = useState(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gated || !traceId) return;
    let attempt = 0;
    let timer: number | undefined;
    const ctrl = new AbortController();
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/chat/scores/${encodeURIComponent(traceId)}`, { signal: ctrl.signal });
        if (res.status === 200) {
          const r = await res.json();
          setScores({ faithfulness: r.faithfulness, relevancy: r.answer_relevancy, precision: r.context_precision, threshold: DEFAULT_THRESHOLD });
          return;
        }
        if (res.status !== 204) {
          setGaveUp(true); // 429 or an error: scores are optional, the next question is not
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
  }, [gated, traceId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!scores) {
    if (gaveUp || !traceId) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-shell px-2.5 py-1 text-xs text-faint">
        <CircleNotch weight="regular" className="size-3.5 animate-spin" />
        Scoring…
      </span>
    );
  }

  const f = scores.faithfulness;
  const verified = f !== null && f >= scores.threshold;
  const Icon = verified ? SealCheck : SealWarning;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-transform duration-300 ease-spring active:scale-[0.97]",
          verified ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn",
        )}
      >
        <Icon weight="regular" className="size-3.5" />
        {f === null ? "Not scored" : `${verified ? "Verified" : "Low confidence"} · ${f.toFixed(2)}`}
      </button>
      <div
        role="dialog"
        aria-label="Answer quality scores"
        inert={!open}
        className={cn(
          "paper absolute bottom-[calc(100%+0.6rem)] left-0 z-20 w-72 origin-bottom-left rounded-xl transition-[opacity,transform] duration-500 ease-spring",
          open ? "opacity-100" : "pointer-events-none translate-y-1.5 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <Meter label="Faithfulness" value={scores.faithfulness} open={open} />
          <Meter label="Relevancy" value={scores.relevancy} open={open} />
          <Meter label="Precision" value={scores.precision} open={open} />
          <p className="text-[11.5px] leading-relaxed text-faint">
            Scored with RAGAS. Faithfulness below {scores.threshold.toFixed(2)} means some claims may not be supported by
            the sources.
          </p>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, open }: { label: string; value: number | null; open: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-hair">
        <span
          className="block h-full origin-left rounded-full bg-brand transition-transform delay-100 duration-1000 ease-out-expo"
          style={{ transform: `scaleX(${open && value !== null ? value : 0})` }}
        />
      </span>
      <b className="text-right font-mono font-medium text-foreground">{value === null ? "—" : value.toFixed(2)}</b>
    </div>
  );
}
