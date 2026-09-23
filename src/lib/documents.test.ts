import { describe, expect, it } from "vitest";
import { formatBytes, validateUpload } from "./documents";

const MB = 1024 * 1024;

describe("validateUpload", () => {
  it.each(["report.pdf", "notes.MD", "scan.tiff", "deck.docx", "photo.jpeg"])("accepts %s", (name) => {
    expect(validateUpload(name, 1024)).toBeNull();
  });

  it("rejects a type the backend cannot read, naming the type", () => {
    expect(validateUpload("slides.pptx", 1024)).toBe("“slides.pptx”: .pptx files aren't supported.");
  });

  it("rejects a file with no extension", () => {
    expect(validateUpload("README", 1024)).toBe("“README”: add a file extension such as .pdf or .txt.");
  });

  it("rejects files over the 50 MB backend limit", () => {
    expect(validateUpload("big.pdf", 50 * MB + 1)).toBe("“big.pdf” is larger than 50 MB.");
  });

  it("accepts a file of exactly 50 MB", () => {
    expect(validateUpload("edge.pdf", 50 * MB)).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload("empty.txt", 0)).toBe("“empty.txt” is empty.");
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [2048, "2 KB"],
    [1536 * 1024, "1.5 MB"],
  ])("%d -> %s", (n, want) => {
    expect(formatBytes(n)).toBe(want);
  });
});
