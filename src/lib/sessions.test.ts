import { describe, expect, it } from "vitest";
import { autoTitle, groupSessions, restoreAt, type SessionSummary, toUIMessages, touchSession } from "./sessions";

const row = (id: string, updated = "2026-09-20T10:00:00.000Z", title = id): SessionSummary => ({
  session_id: id,
  title,
  created_at: updated,
  updated_at: updated,
});

describe("autoTitle", () => {
  // Mirrors RAG Chatbot app/api/routes/chat.py _auto_title, so a chat listed
  // locally carries the same title the backend stored.
  it("flattens newlines and trims", () => {
    expect(autoTitle("  What changed\nin Q3?  ")).toBe("What changed in Q3?");
  });

  it("cuts at 80 characters with an ellipsis", () => {
    const q = "x".repeat(81);
    expect(autoTitle(q)).toBe(`${"x".repeat(80)}…`);
  });

  it("leaves an 80-character question alone", () => {
    expect(autoTitle("y".repeat(80))).toBe("y".repeat(80));
  });
});

describe("touchSession", () => {
  const now = "2026-09-23T12:00:00.000Z";

  it("puts a new chat at the top with the given title", () => {
    const out = touchSession([row("a")], "new", "Hello", now);
    expect(out.map((s) => s.session_id)).toEqual(["new", "a"]);
    expect(out[0]).toEqual({ session_id: "new", title: "Hello", created_at: now, updated_at: now });
  });

  it("moves an existing chat to the top, keeping its title and creation time", () => {
    const out = touchSession([row("a"), row("b", "2026-09-01T00:00:00.000Z", "Old title")], "b", "ignored", now);
    expect(out.map((s) => s.session_id)).toEqual(["b", "a"]);
    expect(out[0]).toEqual({ session_id: "b", title: "Old title", created_at: "2026-09-01T00:00:00.000Z", updated_at: now });
  });

  it("starts a list when none has loaded yet", () => {
    expect(touchSession(null, "new", "Hi", now).map((s) => s.session_id)).toEqual(["new"]);
  });
});

describe("restoreAt", () => {
  it("puts a chat back where it was after a failed delete", () => {
    expect(restoreAt([row("a"), row("c")], row("b"), 1).map((s) => s.session_id)).toEqual(["a", "b", "c"]);
  });

  it("does not duplicate a chat that is already back", () => {
    expect(restoreAt([row("a"), row("b")], row("b"), 1).map((s) => s.session_id)).toEqual(["a", "b"]);
  });

  it("clamps an index past the end", () => {
    expect(restoreAt([row("a")], row("b"), 9).map((s) => s.session_id)).toEqual(["a", "b"]);
  });
});

describe("toUIMessages", () => {
  it("restores stored turns as text-only messages in order", () => {
    const out = toUIMessages("s1", [
      { role: "user", content: "What changed?" },
      { role: "assistant", content: "Revenue grew [1]." },
    ]);
    expect(out).toEqual([
      { id: "s1-0", role: "user", parts: [{ type: "text", text: "What changed?" }] },
      { id: "s1-1", role: "assistant", parts: [{ type: "text", text: "Revenue grew [1]." }] },
    ]);
  });

  it("rebuilds what a stored answer was built on", () => {
    const [, answer] = toUIMessages("s1", [
      { role: "user", content: "q" },
      {
        role: "assistant",
        content: "Revenue grew [1].",
        trace_id: "t-1",
        sources: [{ source: "uploads/u1/q3.pdf", page: 4, chunk_index: 1, content_type: "text" }],
        images: [{ path: "uploads/extracted/q3_p4_chart.png", page: 4, source: "q3.pdf", content_type: "chart" }],
        eval: { faithfulness: 0.9, context_precision: 0.8, threshold: 0.5, passed: true, verdict: "passed", attempt: 1 },
      },
    ]);
    expect(answer.parts).toEqual([
      { type: "data-meta", data: { traceId: "t-1", sessionId: "s1" } },
      {
        type: "source-document",
        sourceId: "1",
        mediaType: "application/pdf",
        title: "q3.pdf",
        filename: "q3.pdf",
        providerMetadata: { verity: { page: 4, contentType: "text" } },
      },
      { type: "data-figures", data: [{ path: "uploads/extracted/q3_p4_chart.png", page: 4, source: "q3.pdf", contentType: "chart" }] },
      {
        type: "data-eval",
        data: { faithfulness: 0.9, contextPrecision: 0.8, threshold: 0.5, passed: true, verdict: "passed", attempt: 1 },
      },
      { type: "text", text: "Revenue grew [1]." },
    ]);
  });

  it("drops roles the chat cannot render", () => {
    const out = toUIMessages("s1", [
      { role: "system", content: "internal" },
      { role: "user", content: "hi" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user"]);
  });

  it("keeps ids stable across reloads so React does not remount the list", () => {
    const stored = [{ role: "user", content: "a" }];
    expect(toUIMessages("s1", stored)[0].id).toBe(toUIMessages("s1", stored)[0].id);
  });
});

describe("groupSessions", () => {
  // Local noon, so no bucket boundary sits near a timezone edge.
  const now = new Date(2026, 8, 23, 12, 0, 0);
  const at = (daysAgo: number, hour = 10) => new Date(2026, 8, 23 - daysAgo, hour).toISOString();
  const s = (id: string, updated: string): SessionSummary => ({ session_id: id, title: id, created_at: updated, updated_at: updated });

  it("buckets by how recently the chat was last used", () => {
    const groups = groupSessions(
      [s("today", at(0)), s("yesterday", at(1)), s("week", at(4)), s("month", at(20)), s("old", at(90))],
      now,
    );
    expect(groups.map((g) => [g.label, g.sessions.map((x) => x.session_id)])).toEqual([
      ["Today", ["today"]],
      ["Yesterday", ["yesterday"]],
      ["Previous 7 days", ["week"]],
      ["Previous 30 days", ["month"]],
      ["Older", ["old"]],
    ]);
  });

  it("uses calendar days, not 24-hour windows", () => {
    // 23:00 yesterday is 13 hours ago but still "Yesterday".
    const groups = groupSessions([s("late", at(1, 23))], now);
    expect(groups[0].label).toBe("Yesterday");
  });

  it("omits empty buckets and keeps the backend's order within one", () => {
    const groups = groupSessions([s("b", at(0, 11)), s("a", at(0, 9))], now);
    expect(groups).toEqual([{ label: "Today", sessions: [s("b", at(0, 11)), s("a", at(0, 9))] }]);
  });

  it("treats an unparseable timestamp as old rather than throwing", () => {
    const groups = groupSessions([s("bad", "not a date")], now);
    expect(groups[0].label).toBe("Older");
  });
});
