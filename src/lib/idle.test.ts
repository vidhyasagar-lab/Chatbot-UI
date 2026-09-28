import { describe, expect, it } from "vitest";
import { HEARTBEAT_MS, IDLE_MS, WARN_MS, formatCountdown, heartbeatDue, idlePhase } from "./idle";

describe("idlePhase", () => {
  const t0 = 1_000_000;

  it("is active until the warning window", () => {
    expect(idlePhase(t0, t0)).toEqual({ phase: "active" });
    expect(idlePhase(t0, t0 + IDLE_MS - WARN_MS - 1)).toEqual({ phase: "active" });
  });

  it("warns for the last two minutes, counting down", () => {
    expect(idlePhase(t0, t0 + IDLE_MS - WARN_MS)).toEqual({ phase: "warning", secondsLeft: 120 });
    expect(idlePhase(t0, t0 + IDLE_MS - 1500)).toEqual({ phase: "warning", secondsLeft: 2 });
  });

  it("expires at an hour, and stays expired after a long sleep", () => {
    expect(idlePhase(t0, t0 + IDLE_MS)).toEqual({ phase: "expired" });
    expect(idlePhase(t0, t0 + 10 * IDLE_MS)).toEqual({ phase: "expired" });
  });
});

describe("heartbeatDue", () => {
  it("pings when there is unreported activity and the last ping is old enough", () => {
    expect(heartbeatDue(10, 0, HEARTBEAT_MS)).toBe(true);
  });

  it("does not ping without new activity, however long it has been", () => {
    expect(heartbeatDue(0, 5, 10 * HEARTBEAT_MS)).toBe(false);
  });

  it("does not ping more often than the heartbeat", () => {
    expect(heartbeatDue(100, 50, 50 + HEARTBEAT_MS - 1)).toBe(false);
  });
});

describe("formatCountdown", () => {
  it("formats minutes and padded seconds", () => {
    expect(formatCountdown(120)).toBe("2:00");
    expect(formatCountdown(95)).toBe("1:35");
    expect(formatCountdown(7)).toBe("0:07");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
