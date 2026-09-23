import type { UIMessageChunk } from "ai";
import type { ChatStage, EvalScores, EvalVerdict, Figure, VerityDataTypes } from "./chat-types";

/**
 * Adapter from the FastAPI backend's SSE stream to AI SDK UI message chunks.
 *
 * Backend events (RAG Chatbot app/core/rag_engine.py):
 *   meta    -> sources, trace_id, session_id   (sent once retrieval finishes)
 *   stage   -> which phase the pipeline is in
 *   token   -> a piece of the answer, tagged with which attempt it belongs to
 *   eval    -> RAGAS scores and the gate's verdict (AFTER the tokens)
 *   replace -> everything streamed so far is superseded
 *   done    -> usage stats, and which attempt won
 *   error   -> { message }
 *
 * The gate runs after the answer has streamed, so a rejected draft and its
 * replacement both reach the client. They are kept in separate text parts;
 * one shared part would render them as a single run-on answer.
 *
 * Keeping the translation here means the backend never has to learn the AI SDK
 * protocol, and useChat on the client needs no custom transport.
 */

type Chunk = UIMessageChunk<unknown, VerityDataTypes>;

export type BackendSource = { source: string; page: string | number; chunk_index: number; content_type: string };
export type BackendImage = { path: string; page: string | number; source: string; content_type: string };
export type BackendScores = {
  faithfulness: number | null;
  context_precision: number | null;
  threshold: number;
  passed: boolean;
};
type BackendEvent =
  | { type: "meta"; sources?: BackendSource[]; images?: BackendImage[]; trace_id?: string; session_id?: string }
  | { type: "stage"; stage: ChatStage; attempt?: number }
  | { type: "eval"; scores: BackendScores; verdict?: EvalVerdict; attempt?: number }
  | { type: "token"; content: string; attempt?: number }
  | { type: "replace"; reason?: string }
  | { type: "done"; final_attempt?: number }
  | { type: "error"; message?: string };

/** Each attempt gets its own text part. Events predating `attempt` are attempt 1. */
const textIdFor = (attempt: number) => `answer-${attempt}`;
const UNEXPECTED_END = "The answer stream ended unexpectedly. Try again.";

const MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  gif: "image/gif",
  webp: "image/webp",
};

/** The backend reports the stored path (uploads/<user-id>/name.pdf); users only need the name. */
function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function mediaTypeOf(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_TYPES[ext] ?? "application/octet-stream";
}

/** A backend source as a source-document part. Shared with chats restored from history. */
export function sourcePart(s: BackendSource) {
  const name = baseName(s.source);
  return {
    type: "source-document" as const,
    sourceId: String(s.chunk_index),
    mediaType: mediaTypeOf(name),
    title: name,
    filename: name,
    providerMetadata: { verity: { page: s.page, contentType: s.content_type } },
  };
}

/**
 * Backend image references as figures, each once; the source keeps only its
 * file name. The backend attaches a figure to every retrieved chunk that
 * cites it, so one chart can arrive several times.
 */
export function figuresOf(images: BackendImage[]): Figure[] {
  const seen = new Set<string>();
  return images.flatMap((i) => {
    if (seen.has(i.path)) return [];
    seen.add(i.path);
    return [{ path: i.path, page: i.page, source: baseName(i.source), contentType: i.content_type }];
  });
}

/** Backend gate scores as the eval data part. */
export function evalData(scores: BackendScores, verdict?: EvalVerdict | null, attempt?: number): EvalScores {
  return {
    faithfulness: scores.faithfulness,
    contextPrecision: scores.context_precision,
    threshold: scores.threshold,
    passed: scores.passed,
    ...(verdict ? { verdict } : {}),
    ...(attempt ? { attempt } : {}),
  };
}

/** Parse `data: <json>` SSE events from a byte stream, tolerating arbitrary chunk boundaries. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const emit = function* (block: string) {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        yield JSON.parse(line.slice(5).trim());
      } catch {
        // A malformed event must not take down the whole answer.
      }
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // stream: true keeps a multi-byte character split across chunks intact
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      yield* emit(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
    }
  }
  if (buffer.trim()) yield* emit(buffer);
}

/** Translate backend events into UI message chunks. Always ends with `finish` or `error`. */
export async function* adaptBackendEvents(events: AsyncIterable<unknown>): AsyncGenerator<Chunk> {
  yield { type: "start" };
  yield { type: "data-status", data: { stage: "retrieving" }, transient: true };

  // The id of the text part currently open, or null. Tracked rather than a
  // boolean because a rejected draft and its replacement use different ids.
  let openTextId: string | null = null;
  let attempt = 1;

  for await (const raw of events) {
    const ev = raw as BackendEvent;
    switch (ev?.type) {
      case "meta":
        yield { type: "data-meta", data: { traceId: ev.trace_id ?? "", sessionId: ev.session_id ?? "" } };
        for (const s of ev.sources ?? []) yield sourcePart(s);
        if (ev.images?.length) yield { type: "data-figures", data: figuresOf(ev.images) };
        // No synthesised stage here: the backend names its own phases now.
        break;
      case "stage":
        yield { type: "data-status", data: { stage: ev.stage }, transient: true };
        break;
      case "eval":
        yield { type: "data-eval", data: evalData(ev.scores, ev.verdict, ev.attempt) };
        break;
      case "replace": {
        // Close the superseded draft and mark it, so the reader can see the
        // gate rejected something rather than watching text silently change.
        if (openTextId) {
          yield { type: "text-end", id: openTextId };
          openTextId = null;
        }
        yield {
          type: "data-rejected",
          data: { attempt, reason: ev.reason ?? "The quality gate rejected this answer." },
        };
        break;
      }
      case "token": {
        const id = textIdFor(ev.attempt ?? 1);
        attempt = ev.attempt ?? 1;
        if (openTextId !== id) {
          if (openTextId) yield { type: "text-end", id: openTextId };
          yield { type: "text-start", id };
          openTextId = id;
        }
        yield { type: "text-delta", id, delta: ev.content };
        break;
      }
      case "done":
        if (openTextId) yield { type: "text-end", id: openTextId };
        yield { type: "finish" };
        return;
      case "error":
        if (openTextId) yield { type: "text-end", id: openTextId };
        yield { type: "error", errorText: ev.message || "Something went wrong. Try again." };
        return;
      default:
        break; // unknown event types are forward-compatible no-ops
    }
  }
  if (openTextId) yield { type: "text-end", id: openTextId };
  yield { type: "error", errorText: UNEXPECTED_END };
}
