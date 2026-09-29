import { describe, expect, it } from "vitest";
import { normaliseCode, validateCode, validateCredentials, validateEmail } from "./auth-form";

describe("validateEmail", () => {
  it("asks for an address first", () => {
    expect(validateEmail("   ")).toBe("Enter your email address.");
  });

  it("rejects anything that cannot be an address", () => {
    for (const bad of ["ann", "ann@", "@example.test", "ann@example", "a b@example.test"]) {
      expect(validateEmail(bad), bad).toMatch(/does not look like/);
    }
  });

  it("accepts the shapes real addresses take", () => {
    for (const good of ["ann@example.test", "a.b+tag@sub.example.co.uk", "x@y.zz"]) {
      expect(validateEmail(good), good).toBeNull();
    }
  });

  it("caps the address at the backend's 254 characters", () => {
    expect(validateEmail(`${"a".repeat(250)}@b.test`)).toMatch(/too long/);
  });

  it("ignores surrounding whitespace", () => {
    expect(validateEmail("  ann@example.test  ")).toBeNull();
  });
});

describe("validateCredentials", () => {
  it("requires the identifier to be an address, matching the backend", () => {
    expect(validateCredentials("login", "ann", "password1")).toEqual({
      field: "username",
      message: "That does not look like an email address.",
    });
  });

  it("asks for a password when it is empty", () => {
    expect(validateCredentials("login", "ann@example.test", "")).toEqual({
      field: "password",
      message: "Enter your password.",
    });
  });

  it("enforces the 8-character minimum only when creating an account", () => {
    expect(validateCredentials("register", "ann@example.test", "short")?.message).toMatch(/at least 8/);
    expect(validateCredentials("login", "ann@example.test", "short")).toBeNull();
  });

  it("passes a well-formed pair", () => {
    expect(validateCredentials("register", "ann@example.test", "long-enough-1")).toBeNull();
  });
});

describe("normaliseCode", () => {
  it("keeps only digits, so a pasted code survives its spaces", () => {
    expect(normaliseCode("123 456")).toBe("123456");
    expect(normaliseCode("Code: 987-654")).toBe("987654");
  });

  it("stops at six digits", () => {
    expect(normaliseCode("1234567890")).toBe("123456");
  });

  it("returns nothing for input with no digits", () => {
    expect(normaliseCode("abc")).toBe("");
  });
});

describe("validateCode", () => {
  it("asks for the code when it is empty", () => {
    expect(validateCode("")).toBe("Enter the code from your email.");
  });

  it("says how long the code is when it is short", () => {
    expect(validateCode("123")).toBe("The code is 6 digits.");
  });

  it("accepts six digits, however they were pasted", () => {
    expect(validateCode("123456")).toBeNull();
    expect(validateCode(" 123 456 ")).toBeNull();
  });
});
