import { describe, expect, it } from "vitest";
import { validateCredentials } from "./auth-form";

describe("validateCredentials", () => {
  it("asks for a username first", () => {
    expect(validateCredentials("login", "  ", "whatever")).toEqual({ field: "username", message: "Enter your username." });
  });

  it("explains which characters a username may use", () => {
    expect(validateCredentials("login", "ann@example", "password1")?.field).toBe("username");
    expect(validateCredentials("login", "ann@example", "password1")?.message).toMatch(/letters, numbers/);
  });

  it("caps usernames at the backend's 100 characters", () => {
    expect(validateCredentials("register", "a".repeat(101), "password1")?.message).toMatch(/100 characters/);
  });

  it("asks for a password when it is empty", () => {
    expect(validateCredentials("login", "ann", "")).toEqual({ field: "password", message: "Enter your password." });
  });

  it("enforces the 8-character minimum only when creating an account", () => {
    expect(validateCredentials("register", "ann", "short")?.message).toMatch(/at least 8/);
    expect(validateCredentials("login", "ann", "short")).toBeNull();
  });

  it("accepts the characters the backend allows", () => {
    expect(validateCredentials("register", "Ann B. O'Neil".replace("'", ""), "long-enough")).toBeNull();
    expect(validateCredentials("register", "a_b-c.d e", "long-enough")).toBeNull();
  });
});
