import { describe, expect, it } from "vitest";
import { linkCitations } from "./citations";

const ids = new Set(["1", "3"]);

describe("linkCitations", () => {
  it("links markers that match a source", () => {
    expect(linkCitations("Revenue grew [1] and margin rose [3].", ids)).toBe(
      "Revenue grew [1](#cite-1) and margin rose [3](#cite-3).",
    );
  });

  it("leaves markers with no matching source as plain text", () => {
    expect(linkCitations("See [2].", ids)).toBe("See [2].");
  });

  it("does not touch markers inside code", () => {
    const src = "Use `arr[1]` here.\n\n```py\nx = rows[3]\n```\n\nBut cite [1].";
    expect(linkCitations(src, ids)).toBe("Use `arr[1]` here.\n\n```py\nx = rows[3]\n```\n\nBut cite [1](#cite-1).");
  });

  it("does not re-link an existing markdown link", () => {
    expect(linkCitations("[1](https://example.com)", ids)).toBe("[1](https://example.com)");
  });

  it("leaves an unclosed code fence alone while it streams", () => {
    expect(linkCitations("Before [1]\n```\nrows[3]", ids)).toBe("Before [1](#cite-1)\n```\nrows[3]");
  });
});
