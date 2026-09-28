import { describe, expect, it } from "vitest";
import { gateView, type GateResult } from "./gate";

const passed: GateResult = {
  verdict: "passed",
  faithfulness: 0.92,
  context_precision: 0.8,
  threshold: 0.5,
  revised_answer: null,
};

const rejected: GateResult = {
  verdict: "rejected",
  faithfulness: 0.21,
  context_precision: 0.8,
  threshold: 0.5,
  revised_answer: "The grounded answer.",
};

describe("gateView", () => {
  it("shows the answer as streamed while the gate is still running", () => {
    expect(gateView("The draft.", null)).toEqual({ text: "The draft.", rejected: null, scores: null });
  });

  it("keeps the answer and adds the scores when the gate passes", () => {
    const view = gateView("The draft.", passed);

    expect(view.text).toBe("The draft.");
    expect(view.rejected).toBeNull();
    expect(view.scores).toMatchObject({ faithfulness: 0.92, verdict: "passed", passed: true, attempt: 1 });
  });

  it("swaps in the revised answer and keeps the draft visible as rejected", () => {
    const view = gateView("The draft.", rejected);

    expect(view.text).toBe("The grounded answer.");
    expect(view.rejected).toEqual({ text: "The draft.", reason: "faithfulness 0.21 < 0.50" });
    expect(view.scores).toMatchObject({ verdict: "rejected", passed: false, attempt: 2 });
  });

  it("keeps the draft when a rejection produced no usable rewrite", () => {
    const view = gateView("The draft.", { ...rejected, revised_answer: null });

    expect(view.text).toBe("The draft.");
    expect(view.rejected).toBeNull();
    expect(view.scores).toMatchObject({ verdict: "rejected", attempt: 1 });
  });
});
