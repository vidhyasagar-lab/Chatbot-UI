import { beforeEach, describe, expect, it } from "vitest";
import { getToasts, lifetimeOf, toast } from "./toast";

describe("toast", () => {
  beforeEach(() => {
    for (const t of getToasts()) toast.dismiss(t.id);
  });

  it("queues messages with their tone", () => {
    toast.success("Saved.");
    toast.error("Couldn't save.");
    expect(getToasts().map((t) => [t.tone, t.message])).toEqual([
      ["success", "Saved."],
      ["error", "Couldn't save."],
    ]);
  });

  it("shows a repeated message once, at the end", () => {
    toast.success("Copied.");
    toast.info("Other");
    toast.success("Copied.");
    expect(getToasts().map((t) => t.message)).toEqual(["Other", "Copied."]);
  });

  it("keeps only the three newest", () => {
    for (const n of [1, 2, 3, 4, 5]) toast.info(`m${n}`);
    expect(getToasts().map((t) => t.message)).toEqual(["m3", "m4", "m5"]);
  });

  it("dismisses by id", () => {
    const id = toast.success("Gone soon");
    toast.dismiss(id);
    expect(getToasts()).toEqual([]);
  });

  it("gives failures longer than successes, and actions longest", () => {
    expect(lifetimeOf({ tone: "success" })).toBeLessThan(lifetimeOf({ tone: "error" }));
    expect(lifetimeOf({ tone: "error" })).toBeLessThan(lifetimeOf({ tone: "success", action: { label: "Undo", run: () => undefined } }));
  });
});
