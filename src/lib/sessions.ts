import type { VerityMessage } from "./chat-types";

/** One row of GET /chat/sessions (RAG Chatbot app/models/schemas.py ChatSessionInfo). */
export type SessionSummary = { session_id: string; title: string; created_at: string; updated_at: string };

/** One turn of GET /chat/sessions/{id}. */
export type StoredMessage = { role: string; content: string };

/**
 * Stored turns as chat messages.
 *
 * The backend keeps only the text of each turn, so a restored answer has no
 * sources, trace id or scores: it renders as plain text without source cards,
 * quality badge or feedback buttons. Ids derive from the position so a reload
 * produces the same keys.
 */
export function toUIMessages(sessionId: string, stored: StoredMessage[]): VerityMessage[] {
  return stored.flatMap((m, i) =>
    m.role === "user" || m.role === "assistant"
      ? [{ id: `${sessionId}-${i}`, role: m.role, parts: [{ type: "text" as const, text: m.content }] }]
      : [],
  );
}

/** The title the backend gives a new chat (RAG Chatbot app/api/routes/chat.py _auto_title). */
export function autoTitle(question: string): string {
  const title = question.trim().replaceAll("\n", " ");
  return title.length > 80 ? `${title.slice(0, 80)}…` : title;
}

/**
 * The list after a chat was used: moved (or added) to the top.
 *
 * Done locally rather than by refetching: the backend rate limit is shared by
 * every request, and a refetch per question spends budget the next question needs.
 */
export function touchSession(
  list: SessionSummary[] | null,
  sessionId: string,
  title: string,
  now: string = new Date().toISOString(),
): SessionSummary[] {
  const current = list ?? [];
  const existing = current.find((s) => s.session_id === sessionId);
  const rest = current.filter((s) => s.session_id !== sessionId);
  return [
    { session_id: sessionId, title: existing?.title ?? title, created_at: existing?.created_at ?? now, updated_at: now },
    ...rest,
  ];
}

/** Put a chat back at its old position, after a delete the backend refused. */
export function restoreAt(list: SessionSummary[], item: SessionSummary, index: number): SessionSummary[] {
  if (list.some((s) => s.session_id === item.session_id)) return list;
  const at = Math.min(index, list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}

export type SessionGroup = { label: string; sessions: SessionSummary[] };

const DAY_MS = 86_400_000;

/** Whole calendar days between two instants, in the viewer's timezone. */
function daysBetween(then: Date, now: Date): number {
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function bucketOf(updatedAt: string, now: Date): string {
  const then = new Date(updatedAt);
  if (Number.isNaN(then.getTime())) return "Older";
  const days = daysBetween(then, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  if (days <= 30) return "Previous 30 days";
  return "Older";
}

const ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

/** Group sessions by last use. The backend already sorts newest first; that order is kept. */
export function groupSessions(sessions: SessionSummary[], now: Date = new Date()): SessionGroup[] {
  const buckets = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const label = bucketOf(s.updated_at, now);
    buckets.set(label, [...(buckets.get(label) ?? []), s]);
  }
  return ORDER.filter((l) => buckets.has(l)).map((label) => ({ label, sessions: buckets.get(label)! }));
}
