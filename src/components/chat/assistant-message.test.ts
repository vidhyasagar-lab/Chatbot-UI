import { describe, expect, it } from "vitest";
import type { VerityMessage } from "@/lib/chat-types";
import { rejectedDraftOf, textOf } from "./assistant-message";

/**
 * When the quality gate rejects an answer, the backend streams a replacement.
 * Both arrive as text parts in one message, separated by a `data-rejected`
 * marker, so splitting them is the UI's job.
 */
function message(...parts: VerityMessage["parts"]): VerityMessage {
  return { id: "m1", role: "assistant", parts } as VerityMessage;
}

const draft = { type: "text", text: "Revenue tripled." } as VerityMessage["parts"][number];
const replacement = { type: "text", text: "Revenue rose 12%." } as VerityMessage["parts"][number];
const marker = {
  type: "data-rejected",
  data: { attempt: 1, reason: "faithfulness 0.20 < 0.50" },
} as VerityMessage["parts"][number];

describe("textOf", () => {
  it("returns the answer when nothing was rejected", () => {
    expect(textOf(message(replacement))).toBe("Revenue rose 12%.");
  });

  it("excludes a rejected draft from the answer", () => {
    // The regression this guards: joining every text part renders the
    // rejected draft glued to the answer that replaced it.
    expect(textOf(message(draft, marker, replacement))).toBe("Revenue rose 12%.");
  });

  it("is empty while the replacement has not started streaming", () => {
    expect(textOf(message(draft, marker))).toBe("");
  });

  it("ignores non-text parts", () => {
    const meta = {
      type: "data-meta",
      data: { traceId: "t", sessionId: "s" },
    } as VerityMessage["parts"][number];
    expect(textOf(message(meta, replacement))).toBe("Revenue rose 12%.");
  });
});

describe("rejectedDraftOf", () => {
  it("is null when the gate rejected nothing", () => {
    expect(rejectedDraftOf(message(replacement))).toBeNull();
  });

  it("returns the discarded text and the reason it was discarded", () => {
    expect(rejectedDraftOf(message(draft, marker, replacement))).toEqual({
      text: "Revenue tripled.",
      reason: "faithfulness 0.20 < 0.50",
    });
  });

  it("is null when a marker arrived before any text", () => {
    expect(rejectedDraftOf(message(marker, replacement))).toBeNull();
  });
});
