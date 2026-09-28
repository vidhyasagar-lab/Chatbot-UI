/**
 * Idle sign-out. Must match the backend's SESSION_IDLE_MINUTES (RAG Chatbot
 * app/config.py): the server ends a session that long after its last request;
 * this ends it that long after the person last touched the page.
 */
export const IDLE_MS = 60 * 60_000;
/** Warn this long before signing out, with a way to stay. */
export const WARN_MS = 2 * 60_000;
/**
 * While someone is active but not sending requests (reading, typing a long
 * question), ping the server this often so its window keeps pace with ours.
 */
export const HEARTBEAT_MS = 5 * 60_000;

export type IdlePhase = { phase: "active" } | { phase: "warning"; secondsLeft: number } | { phase: "expired" };

export function idlePhase(lastActive: number, now: number): IdlePhase {
  const left = lastActive + IDLE_MS - now;
  if (left <= 0) return { phase: "expired" };
  if (left <= WARN_MS) return { phase: "warning", secondsLeft: Math.ceil(left / 1000) };
  return { phase: "active" };
}

/** Ping only when there has been activity the server hasn't heard about, and not too often. */
export function heartbeatDue(lastActive: number, lastPing: number, now: number): boolean {
  return lastActive > lastPing && now - lastPing >= HEARTBEAT_MS;
}

/** 95 -> "1:35" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
