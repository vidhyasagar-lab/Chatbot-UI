import { describe, expect, it } from "vitest";
import { compareRows, nextSort, pageCount, pageOf, shareOf, sortRows } from "./data-table";

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

// Paging happens here now, not at Langfuse. The usage endpoint returns the
// whole window in one response - two reads of the observations API - so the
// table holds every row it claims an order over. While the trace list was
// paginated by the service, sorting the rows on screen would have been a
// claim about the pages it had never seen.
describe("pageOf", () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({ id: i }));

  it("returns the slice belonging to the page asked for", () => {
    expect(pageOf(rows, 1, 20).map((r) => r.id)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(pageOf(rows, 2, 20)[0].id).toBe(20);
  });

  it("returns the remainder on the last page", () => {
    expect(pageOf(rows, 3, 20)).toHaveLength(5);
  });

  it("counts the pages the rows actually fill", () => {
    expect(pageCount(45, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
  });

  // An empty result still occupies one page, so the pager reads "Page 1 of 1"
  // rather than "Page 1 of 0".
  it("reports one page when there is nothing to show", () => {
    expect(pageCount(0, 20)).toBe(1);
  });

  // Narrowing a filter while on a later page would otherwise strand the
  // reader on an empty slice of a list that does have rows.
  it("gives the last page when the page asked for is past the end", () => {
    expect(pageOf(rows, 9, 20).map((r) => r.id)).toEqual([40, 41, 42, 43, 44]);
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
