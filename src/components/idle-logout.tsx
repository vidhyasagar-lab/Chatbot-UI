"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCountdown, heartbeatDue, type IdlePhase, idlePhase } from "@/lib/idle";

/*
 * Signs the user out after an hour without input, with a two-minute warning.
 *
 * Last activity lives in localStorage so every open tab shares it: working in
 * one tab keeps the others signed in, and when the hour is up they all leave
 * together. The server enforces the same hour on its own (the session cookie
 * expires unless re-signed by a request), so closing the laptop does not keep
 * anyone signed in; this component is what makes it happen on screen, on time,
 * with a warning first.
 */

const KEY = "verity-last-active";
const WRITE_EVERY = 5_000; // don't hit storage on every mouse move
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

function readShared(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0; // storage blocked: this tab's own record is used alone
  }
}

function writeShared(t: number) {
  try {
    localStorage.setItem(KEY, String(t));
  } catch {
    // storage blocked
  }
}

const samePhase = (a: IdlePhase, b: IdlePhase) =>
  a.phase === b.phase && (a.phase !== "warning" || b.phase !== "warning" || a.secondsLeft === b.secondsLeft);

export function IdleLogout() {
  const [phase, setPhase] = useState<IdlePhase>({ phase: "active" });
  const last = useRef(0);
  const lastWrite = useRef(0);
  const lastPing = useRef(0);
  const leaving = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);

  const signOut = useCallback(async (reason: "idle" | null) => {
    if (leaving.current) return;
    leaving.current = true;
    await fetch("/api/v1/auth/logout", { method: "POST", keepalive: true }).catch(() => undefined);
    // A full load on purpose: nothing from the session should survive. replace: Back must not return here.
    window.location.replace(reason ? `/login?reason=${reason}` : "/login");
  }, []);

  const ping = useCallback(() => {
    lastPing.current = Date.now();
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) void signOut("idle"); // the server already ended it
      })
      .catch(() => undefined); // offline: try again next heartbeat
  }, [signOut]);

  const markActive = useCallback((now = Date.now()) => {
    last.current = now;
    if (now - lastWrite.current >= WRITE_EVERY) {
      lastWrite.current = now;
      writeShared(now);
    }
  }, []);

  useEffect(() => {
    // Loading the page was a request, so both clocks start now.
    const start = Date.now();
    lastPing.current = start;
    lastWrite.current = 0;
    markActive(start);

    const tick = () => {
      if (leaving.current) return;
      const now = Date.now();
      const lastActive = Math.max(last.current, readShared());
      last.current = lastActive;
      const next = idlePhase(lastActive, now);
      if (next.phase === "expired") {
        void signOut("idle");
        return;
      }
      setPhase((prev) => (samePhase(prev, next) ? prev : next));
      if (heartbeatDue(lastActive, lastPing.current, now)) ping();
    };

    // Input inside the warning is handled by its buttons, so a click on
    // "Sign out" is never first counted as "still here".
    const onActivity = (e: Event) => {
      if (dialog.current?.contains(e.target as Node)) return;
      markActive();
    };
    // Back from sleep or another tab: settle it now rather than on the next tick.
    const onVisible = () => document.visibilityState === "visible" && tick();

    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(tick, 1000);
    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity);
      window.removeEventListener("scroll", onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [markActive, ping, signOut]);

  const warning = phase.phase === "warning";
  useEffect(() => {
    if (warning) stayButton.current?.focus();
  }, [warning]);

  if (phase.phase !== "warning") return null;

  const stay = () => {
    lastWrite.current = 0; // write through now, so other tabs drop their warning too
    markActive();
    ping(); // and restart the server's hour straight away
    setPhase({ phase: "active" });
  };

  return (
    <div
      ref={dialog}
      role="alertdialog"
      aria-labelledby="idle-title"
      aria-describedby="idle-desc"
      className="paper animate-rise fixed top-6 left-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl p-5"
    >
      <p id="idle-title" className="font-serif text-[1.35rem] leading-tight tracking-[-0.01em]">
        Still there?
      </p>
      <p id="idle-desc" className="mt-1.5 text-sm text-muted-foreground">
        You haven&apos;t done anything for almost an hour. To keep your documents safe, you&apos;ll be signed out in{" "}
        <span className="font-mono tabular-nums text-foreground">{formatCountdown(phase.secondsLeft)}</span>.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void signOut(null)}
          className="h-9 rounded-lg px-3.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-shell hover:text-foreground"
        >
          Sign out
        </button>
        <button
          ref={stayButton}
          type="button"
          onClick={stay}
          className="h-9 rounded-lg bg-brand px-4 text-[13.5px] font-medium text-brand-ink transition-[filter,transform] duration-300 ease-spring hover:brightness-110 active:scale-[0.98]"
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
