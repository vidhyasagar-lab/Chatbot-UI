import { describe, expect, it } from "vitest";
import { compareRows, nextSort, orderByParam, shareOf, sortRows, tracesQuery } from "./data-table";

describe("shareOf", () => {
  it("gives the fraction one value is of the total", () => {
    expect(shareOf(25, 100)).toBe(0.25);
  });

  it("returns zero rather than NaN when nothing has been spent", () => {
    // A fresh deployment has no spend at all, and NaN would render as a
    // bar of width "NaN%", which the browser silently drops.
    expect(shareOf(0, 0)).toBe(0);
  });

  it("never exceeds one, even if the rows outrun the total they were measured against", () => {
    expect(shareOf(150, 100)).toBe(1);
  });

  it("treats a missing value as nothing", () => {
    expect(shareOf(null, 100)).toBe(0);
    expect(shareOf(undefined, 100)).toBe(0);
  });
});

describe("nextSort", () => {
  it("starts a new column at descending, because the interesting end is the top", () => {
    expect(nextSort(null, "totalCost")).toEqual({ field: "totalCost", dir: "desc" });
  });

  it("flips the column already being sorted", () => {
    expect(nextSort({ field: "totalCost", dir: "desc" }, "totalCost")).toEqual({
      field: "totalCost",
      dir: "asc",
    });
  });

  it("clears the sort on the third click, returning to the server's own order", () => {
    expect(nextSort({ field: "totalCost", dir: "asc" }, "totalCost")).toBeNull();
  });

  it("switching columns starts the new one at descending", () => {
    expect(nextSort({ field: "totalCost", dir: "asc" }, "latency")).toEqual({
      field: "latency",
      dir: "desc",
    });
  });
});

describe("orderByParam", () => {
  it("spells the sort the way Langfuse wants it", () => {
    expect(orderByParam({ field: "totalCost", dir: "desc" })).toBe("totalCost.desc");
    expect(orderByParam({ field: "timestamp", dir: "asc" })).toBe("timestamp.asc");
  });

  it("sends nothing when no column is sorted", () => {
    expect(orderByParam(null)).toBe("");
  });
});

describe("tracesQuery", () => {
  it("always carries the page and the page size", () => {
    const q = new URLSearchParams(tracesQuery({ page: 2, limit: 50, sort: null }));
    expect(q.get("page")).toBe("2");
    expect(q.get("limit")).toBe("50");
  });

  it("omits filters that are not set, rather than sending empty ones", () => {
    // An empty user_id means "a user whose id is empty" to Langfuse, which
    // matches nothing, so an unfiltered page would come back blank.
    const q = new URLSearchParams(tracesQuery({ page: 1, limit: 20, sort: null }));
    expect(q.has("user_id")).toBe(false);
    expect(q.has("name")).toBe(false);
    expect(q.has("order_by")).toBe(false);
  });

  it("carries the filters that are set", () => {
    const q = new URLSearchParams(
      tracesQuery({ page: 1, limit: 20, userId: "u1", name: "rag-chat", sort: { field: "latency", dir: "asc" } }),
    );
    expect(q.get("user_id")).toBe("u1");
    expect(q.get("name")).toBe("rag-chat");
    expect(q.get("order_by")).toBe("latency.asc");
  });

  it("escapes a value that would otherwise break the query string", () => {
    const q = new URLSearchParams(tracesQuery({ page: 1, limit: 20, userId: "a&b=c", sort: null }));
    expect(q.get("user_id")).toBe("a&b=c");
  });
});

describe("compareRows", () => {
  it("orders numbers numerically, not as text", () => {
    // "100" < "9" as strings; the whole point of a cost column is that it doesn't.
    expect(compareRows({ cost: 100 }, { cost: 9 }, "cost")).toBeGreaterThan(0);
  });

  it("orders text case-insensitively", () => {
    expect(compareRows({ username: "ada" }, { username: "Bob" }, "username")).toBeLessThan(0);
  });

  it("sends missing values to the end whichever way the column is sorted", () => {
    expect(compareRows({ cost: null }, { cost: 5 }, "cost")).toBeGreaterThan(0);
    expect(compareRows({ cost: 5 }, { cost: null }, "cost")).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { username: "ada", cost: 0.05, tokens: 100 },
    { username: "bob", cost: 0.5, tokens: 20 },
    { username: "cleo", cost: 0.01, tokens: 900 },
  ];

  it("returns the rows untouched when nothing is sorted", () => {
    expect(sortRows(rows, null).map((r) => r.username)).toEqual(["ada", "bob", "cleo"]);
  });

  it("sorts descending by the chosen column", () => {
    expect(sortRows(rows, { field: "cost", dir: "desc" }).map((r) => r.username)).toEqual(["bob", "ada", "cleo"]);
  });

  it("sorts ascending by the chosen column", () => {
    expect(sortRows(rows, { field: "tokens", dir: "asc" }).map((r) => r.username)).toEqual(["bob", "ada", "cleo"]);
  });

  it("does not mutate the array it was given", () => {
    const original = [...rows];
    sortRows(rows, { field: "cost", dir: "desc" });
    expect(rows).toEqual(original);
  });

  it("ignores a column the rows do not have", () => {
    expect(sortRows(rows, { field: "nonsense", dir: "desc" }).map((r) => r.username)).toEqual(["ada", "bob", "cleo"]);
  });
});
