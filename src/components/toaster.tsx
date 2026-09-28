"use client";

import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { type Toast, getServerToasts, getToasts, lifetimeOf, subscribeToasts, takeFlash, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/*
 * Renders queued toasts at the top of the screen: the chat composer owns the
 * bottom edge on every screen size. Two live regions, always mounted so the
 * first message is announced too: polite for successes, assertive for failures.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  useEffect(() => {
    takeFlash();
  }, []);

  const polite = toasts.filter((t) => t.tone !== "error");
  const urgent = toasts.filter((t) => t.tone === "error");

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex flex-col gap-2 md:inset-x-auto md:right-5 md:top-5">
      <div aria-live="assertive" aria-relevant="additions" className="flex flex-col items-center gap-2 md:items-end">
        {urgent.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
      <div aria-live="polite" aria-relevant="additions" className="flex flex-col items-center gap-2 md:items-end">
        {polite.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}

const ICON = { success: CheckCircle, error: WarningCircle, info: Info };
const ICON_TONE = { success: "text-ok", error: "text-err", info: "text-brand" };

function ToastCard({ toast: t }: { toast: Toast }) {
  const Icon = ICON[t.tone];
  const card = useRef<HTMLDivElement>(null);

  // Auto-dismiss, paused while the pointer or keyboard focus is on the toast.
  useEffect(() => {
    let left = lifetimeOf(t);
    let started = Date.now();
    let timer = window.setTimeout(() => toast.dismiss(t.id), left);
    const el = card.current;
    const pause = () => {
      window.clearTimeout(timer);
      left -= Date.now() - started;
    };
    const resume = () => {
      started = Date.now();
      timer = window.setTimeout(() => toast.dismiss(t.id), Math.max(1500, left));
    };
    el?.addEventListener("pointerenter", pause);
    el?.addEventListener("pointerleave", resume);
    el?.addEventListener("focusin", pause);
    el?.addEventListener("focusout", resume);
    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener("pointerenter", pause);
      el?.removeEventListener("pointerleave", resume);
      el?.removeEventListener("focusin", pause);
      el?.removeEventListener("focusout", resume);
    };
  }, [t]);

  return (
    // No role here: the wrapping live region announces it, and a second role would announce it twice.
    <div
      ref={card}
      data-toast={t.tone}
      className={cn(
        "paper animate-rise pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-xl py-3 pl-3.5 pr-2 text-[13.5px] leading-snug md:w-[380px]",
        t.tone === "error" && "border-err/30",
      )}
    >
      <Icon weight="fill" aria-hidden className={cn("mt-px size-[18px] shrink-0", ICON_TONE[t.tone])} />
      <p className="min-w-0 flex-1 py-px [overflow-wrap:anywhere]">{t.message}</p>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.run();
            toast.dismiss(t.id);
          }}
          className="-my-1 shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium text-brand transition-colors hover:bg-brand-soft pointer-coarse:py-2"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss message"
        className="-my-1 grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-shell hover:text-foreground pointer-coarse:size-9"
      >
        <X weight="regular" className="size-3.5" />
      </button>
    </div>
  );
}
