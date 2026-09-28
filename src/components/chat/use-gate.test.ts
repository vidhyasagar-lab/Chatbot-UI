import { describe, expect, it } from "vitest";
import { GATE_POLL_DELAYS_MS } from "./use-gate";

describe("gate polling", () => {
  it("outlasts the slowest rejection: a 120s draft check, the rewrite, and its 45s check", () => {
    // Giving up early leaves the reader the rejected draft with no marker.
    const total = GATE_POLL_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(190_000);
  });
});
