import { describe, expect, it } from "vitest";
import { EMAIL, LINKEDIN_HANDLE, LINKEDIN_URL, mailtoLink } from "./contact";

describe("contact details", () => {
  it("has a plausible email address", () => {
    expect(EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("points at an https LinkedIn profile whose path matches the handle", () => {
    const url = new URL(LINKEDIN_URL);
    expect(url.protocol).toBe("https:");
    expect(url.hostname.endsWith("linkedin.com")).toBe(true);
    expect(url.pathname).toContain(LINKEDIN_HANDLE);
  });
});

describe("mailtoLink", () => {
  it("addresses the email and carries a default subject", () => {
    expect(mailtoLink()).toBe(`mailto:${EMAIL}?subject=Verity`);
  });

  it("encodes a subject so spaces and punctuation survive", () => {
    expect(mailtoLink("Verity: a question & a bug")).toBe(`mailto:${EMAIL}?subject=Verity%3A%20a%20question%20%26%20a%20bug`);
  });

  it("produces a parseable mailto whose subject decodes back", () => {
    const url = new URL(mailtoLink("Hello there"));
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(EMAIL);
    expect(new URLSearchParams(url.search).get("subject")).toBe("Hello there");
  });
});
