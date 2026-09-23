import { describe, expect, it } from "vitest";
import { adaptBackendEvents, parseSse } from "./backend-stream";

/** A byte stream delivered in the given pieces, like a network body. */
function bytes(...pieces: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const p of pieces) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

async function* events(...evs: object[]) {
  yield* evs;
}

// Shapes captured from the live backend (see RAG Chatbot app/core/rag_engine.py).
const meta = {
  type: "meta",
  sources: [
    { source: "Q3-board-report.pdf", page: 4, chunk_index: 1, content_type: "text" },
    { source: "sales-process.docx", page: "", chunk_index: 3, content_type: "flowchart" },
  ],
  images: [],
  trace_id: "trace-1",
  session_id: "sess-1",
};
const done = { type: "done", usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } };

describe("parseSse", () => {
  it("reassembles events split across network chunks", async () => {
    const out = await collect(parseSse(bytes('data: {"type":"tok', 'en","content":"Hi"}\n\ndata: {"type":"done"}\n\n')));
    expect(out).toEqual([{ type: "token", content: "Hi" }, { type: "done" }]);
  });

  it("skips non-data lines and malformed JSON", async () => {
    const out = await collect(parseSse(bytes(': ping\n\n', "data: {not json}\n\n", 'data: {"type":"done"}\n\n')));
    expect(out).toEqual([{ type: "done" }]);
  });

  it("parses a final event that lacks the trailing blank line", async () => {
    const out = await collect(parseSse(bytes('data: {"type":"done"}')));
    expect(out).toEqual([{ type: "done" }]);
  });
});

describe("adaptBackendEvents", () => {
  it("maps an eval-gated answer to UI chunks in order", async () => {
    // The eval arrives AFTER the tokens: the gate no longer holds the answer
    // back, it reports on one the reader has already seen.
    const out = await collect(
      adaptBackendEvents(
        events(
          meta,
          { type: "stage", stage: "generating", attempt: 1 },
          { type: "token", content: "Revenue ", attempt: 1 },
          { type: "token", content: "grew [1].", attempt: 1 },
          { type: "stage", stage: "scoring", attempt: 1 },
          {
            type: "eval",
            attempt: 1,
            verdict: "passed",
            scores: { context_precision: 0.8, faithfulness: 0.95, threshold: 0.75, passed: true },
          },
          done,
        ),
      ),
    );
    expect(out).toEqual([
      { type: "start" },
      { type: "data-status", data: { stage: "retrieving" }, transient: true },
      { type: "data-meta", data: { traceId: "trace-1", sessionId: "sess-1" } },
      {
        type: "source-document",
        sourceId: "1",
        mediaType: "application/pdf",
        title: "Q3-board-report.pdf",
        filename: "Q3-board-report.pdf",
        providerMetadata: { verity: { page: 4, contentType: "text" } },
      },
      {
        type: "source-document",
        sourceId: "3",
        mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        title: "sales-process.docx",
        filename: "sales-process.docx",
        providerMetadata: { verity: { page: "", contentType: "flowchart" } },
      },
      { type: "data-status", data: { stage: "generating" }, transient: true },
      { type: "text-start", id: "answer-1" },
      { type: "text-delta", id: "answer-1", delta: "Revenue " },
      { type: "text-delta", id: "answer-1", delta: "grew [1]." },
      { type: "data-status", data: { stage: "scoring" }, transient: true },
      {
        type: "data-eval",
        data: {
          faithfulness: 0.95,
          contextPrecision: 0.8,
          threshold: 0.75,
          passed: true,
          verdict: "passed",
          attempt: 1,
        },
      },
      // Closed at `done`, not at the eval: a passing gate adds nothing after
      // the text, so there is no reason to end the part early.
      { type: "text-end", id: "answer-1" },
      { type: "finish" },
    ]);
  });

  it("maps a plain (ungated) answer without an eval part", async () => {
    const out = await collect(adaptBackendEvents(events(meta, { type: "token", content: "Hi" }, done)));
    expect(out.map((c) => c.type)).toEqual([
      "start",
      "data-status",
      "data-meta",
      "source-document",
      "source-document",
      "text-start",
      "text-delta",
      "text-end",
      "finish",
    ]);
  });

  it("closes open text before reporting a backend error", async () => {
    const out = await collect(
      adaptBackendEvents(events(meta, { type: "token", content: "Half" }, { type: "error", message: "LLM service error" })),
    );
    expect(out.slice(-2)).toEqual([
      { type: "text-end", id: "answer-1" },
      { type: "error", errorText: "LLM service error" },
    ]);
  });

  it("reports a stream that ends without done instead of hanging", async () => {
    const out = await collect(adaptBackendEvents(events(meta, { type: "token", content: "Cut" })));
    expect(out.slice(-2)).toEqual([
      { type: "text-end", id: "answer-1" },
      { type: "error", errorText: "The answer stream ended unexpectedly. Try again." },
    ]);
  });

  it("shows only the file name, never the server's upload path", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(
          {
            ...meta,
            sources: [
              { source: "uploads\\761b34d8\\q3-board-report.md", page: "", chunk_index: 1, content_type: "text" },
              { source: "/app/uploads/42/deck.pdf", page: 2, chunk_index: 2, content_type: "text" },
            ],
          },
          done,
        ),
      ),
    );
    const docs = out.filter((c) => c.type === "source-document");
    expect(docs.map((d) => [d.title, d.filename])).toEqual([
      ["q3-board-report.md", "q3-board-report.md"],
      ["deck.pdf", "deck.pdf"],
    ]);
  });

  it("passes the figures an answer used through as one data part", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(
          {
            ...meta,
            images: [
              { path: "uploads/extracted/q3_p4_chart.png", page: 4, source: "uploads/u1/q3.pdf", content_type: "chart" },
            ],
          },
          done,
        ),
      ),
    );
    expect(out.find((c) => c.type === "data-figures")).toEqual({
      type: "data-figures",
      data: [{ path: "uploads/extracted/q3_p4_chart.png", page: 4, source: "q3.pdf", contentType: "chart" }],
    });
  });

  it("lists each figure once, though every chunk that cites it repeats it", async () => {
    // Seen live: two chunks from one page each carried the same chart and table.
    const chart = { path: "uploads/extracted/q3_p1_chart.png", page: 1, source: "q3.pdf", content_type: "chart" };
    const table = { path: "uploads/extracted/q3_p1_table.png", page: 1, source: "q3.pdf", content_type: "table" };
    const out = await collect(adaptBackendEvents(events({ ...meta, images: [chart, table, chart, table] }, done)));
    const figures = out.find((c) => c.type === "data-figures") as { data: { path: string }[] };
    expect(figures.data.map((f) => f.path)).toEqual([chart.path, table.path]);
  });

  it("sends no figures part when the answer used none", async () => {
    const out = await collect(adaptBackendEvents(events(meta, done)));
    expect(out.some((c) => c.type === "data-figures")).toBe(false);
  });

  it("ignores unknown event types", async () => {
    const out = await collect(adaptBackendEvents(events(meta, { type: "future-thing" }, done)));
    expect(out.map((c) => c.type)).not.toContain("future-thing");
    expect(out.at(-1)).toEqual({ type: "finish" });
  });
});

/**
 * The backend now streams tokens BEFORE the gate has run, and can stream a
 * second answer when the gate rejects the first. See RAG Chatbot
 * docs/superpowers/specs/2026-09-23-streaming-eval-gate-design.md.
 */
describe("adaptBackendEvents — a gate that runs after the tokens", () => {
  const draft = { type: "token", content: "Revenue tripled.", attempt: 1 };
  const rejected = {
    type: "eval",
    attempt: 1,
    verdict: "rejected",
    scores: { context_precision: 0.8, faithfulness: 0.2, threshold: 0.5, passed: false },
  };
  const replace = { type: "replace", reason: "faithfulness 0.20 < 0.50" };
  const replacement = { type: "token", content: "Revenue rose 12%.", attempt: 2 };

  it("keeps each attempt in its own text part", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(meta, draft, rejected, replace, replacement, { ...done, final_attempt: 2 }),
      ),
    );
    const textIds = out
      .filter((c) => c.type === "text-delta")
      .map((c) => (c as { id: string }).id);

    // Two ids, not one: a single id would render the rejected draft and its
    // replacement as one run-on answer.
    expect(textIds).toEqual(["answer-1", "answer-2"]);
  });

  it("closes the draft's text part before opening the replacement's", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(meta, draft, rejected, replace, replacement, { ...done, final_attempt: 2 }),
      ),
    );
    const seq = out
      .filter((c) => c.type === "text-start" || c.type === "text-end")
      .map((c) => `${c.type}:${(c as { id: string }).id}`);

    expect(seq).toEqual([
      "text-start:answer-1",
      "text-end:answer-1",
      "text-start:answer-2",
      "text-end:answer-2",
    ]);
  });

  it("marks the superseded draft so the reader can see it was rejected", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(meta, draft, rejected, replace, replacement, { ...done, final_attempt: 2 }),
      ),
    );
    const marker = out.find((c) => c.type === "data-rejected");

    expect(marker).toEqual({
      type: "data-rejected",
      data: { attempt: 1, reason: "faithfulness 0.20 < 0.50" },
    });
  });

  it("carries the verdict through to the eval part", async () => {
    const out = await collect(adaptBackendEvents(events(meta, draft, rejected, done)));
    const evalPart = out.find((c) => c.type === "data-eval");

    expect(evalPart).toEqual({
      type: "data-eval",
      data: {
        faithfulness: 0.2,
        contextPrecision: 0.8,
        threshold: 0.5,
        passed: false,
        verdict: "rejected",
        attempt: 1,
      },
    });
  });

  it("reports retrieval_failed rather than pretending a retry would help", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(
          meta,
          draft,
          {
            type: "eval",
            attempt: 1,
            verdict: "retrieval_failed",
            scores: { context_precision: 0.0, faithfulness: 0.2, threshold: 0.5, passed: false },
          },
          done,
        ),
      ),
    );

    expect(out.find((c) => c.type === "data-eval")).toMatchObject({
      data: { verdict: "retrieval_failed" },
    });
    expect(out.some((c) => c.type === "data-rejected")).toBe(false);
  });

  it("maps backend stages onto the status indicator", async () => {
    const out = await collect(
      adaptBackendEvents(
        events(
          meta,
          { type: "stage", stage: "generating", attempt: 1 },
          draft,
          { type: "stage", stage: "scoring", attempt: 1 },
          rejected,
          done,
        ),
      ),
    );
    const stages = out
      .filter((c) => c.type === "data-status")
      .map((c) => (c as { data: { stage: string } }).data.stage);

    expect(stages).toEqual(["retrieving", "generating", "scoring"]);
  });

  it("treats a token with no attempt as attempt 1", async () => {
    const out = await collect(
      adaptBackendEvents(events(meta, { type: "token", content: "Hi" }, done)),
    );
    expect(out.find((c) => c.type === "text-delta")).toMatchObject({ id: "answer-1" });
  });
});
