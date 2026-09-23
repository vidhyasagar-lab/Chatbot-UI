"use client";

import { useCallback, useEffect, useState } from "react";
import type { VerityMessage } from "@/lib/chat-types";
import { restoreAt, type SessionSummary, type StoredMessage, toUIMessages, touchSession } from "@/lib/sessions";

/** The signed-in user's chats, or null if the request failed (keep the last known list). */
async function fetchSessions(): Promise<SessionSummary[] | null> {
  try {
    const res = await fetch("/api/v1/chat/sessions", { cache: "no-store" });
    return res.ok ? ((await res.json()) as SessionSummary[]) : null;
  } catch {
    return null;
  }
}

/** One stored chat as messages, or null when it is gone or belongs to someone else. */
export async function loadSession(sessionId: string): Promise<VerityMessage[] | null> {
  try {
    const res = await fetch(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { messages: StoredMessage[] };
    return toUIMessages(sessionId, body.messages);
  } catch {
    return null;
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await fetchSessions();
    if (list) setSessions(list);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchSessions().then((list) => alive && list && setSessions(list));
    return () => {
      alive = false;
    };
  }, []);

  /** Record locally that a chat was just used, without spending a request. */
  const touch = useCallback((sessionId: string, title: string) => {
    setSessions((list) => touchSession(list, sessionId, title));
  }, []);

  /**
   * Delete a chat. Resolves true once the backend has deleted it.
   *
   * On failure the chat goes back where it was. Refetching instead would not
   * work for the commonest failure, a 429: the refetch is throttled too, and the
   * chat would stay hidden while still existing.
   */
  const remove = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setError(null);
      const index = sessions?.findIndex((s) => s.session_id === sessionId) ?? -1;
      const item = index >= 0 ? sessions![index] : null;
      setSessions((list) => list?.filter((s) => s.session_id !== sessionId) ?? null); // optimistic
      let status = 0;
      try {
        const res = await fetch(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
        if (res.ok) return true;
        status = res.status;
      } catch {
        // network failure: status stays 0
      }
      if (item) setSessions((list) => restoreAt(list ?? [], item, index));
      setError(
        status === 429 ? "Too many requests right now. Wait a few seconds, then delete again." : "Couldn't delete that chat. Try again.",
      );
      return false;
    },
    [sessions],
  );

  /** Rename a chat. The new title shows at once and reverts if the backend refuses it. */
  const rename = useCallback(
    async (sessionId: string, title: string): Promise<boolean> => {
      const next = title.trim().slice(0, 200); // the backend's limit
      const before = sessions?.find((s) => s.session_id === sessionId)?.title;
      if (!next || next === before) return true;
      setError(null);
      const setTitle = (t: string) =>
        setSessions((list) => list?.map((s) => (s.session_id === sessionId ? { ...s, title: t } : s)) ?? null);
      setTitle(next);
      let status = 0;
      try {
        const res = await fetch(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: next }),
        });
        if (res.ok) return true;
        status = res.status;
      } catch {
        // network failure: status stays 0
      }
      if (before !== undefined) setTitle(before);
      setError(status === 429 ? "Too many requests right now. Wait a few seconds, then rename again." : "Couldn't rename that chat.");
      return false;
    },
    [sessions],
  );

  return { sessions, error, refresh, touch, remove, rename };
}

export type SessionsState = ReturnType<typeof useSessions>;
