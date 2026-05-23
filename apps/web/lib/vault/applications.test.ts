import { describe, expect, it } from "vitest";
import { validateVaultApplicationInput } from "./applications";

describe("Vault application validation", () => {
  it("accepts a valid application payload", () => {
    const result = validateVaultApplicationInput({
      firstName: "Garrett",
      email: "GARRETT@example.com",
      freeformAnswer:
        "I want the rationale layer and can help test the founding workflow.",
      source: "public",
      referralCode: "abc123",
    });

    expect(result).toEqual({
      ok: true,
      input: {
        firstName: "Garrett",
        email: "garrett@example.com",
        freeformAnswer:
          "I want the rationale layer and can help test the founding workflow.",
        source: "public",
        referralCode: "abc123",
      },
    });
  });

  it("rejects invalid email, short answers, and unknown sources", () => {
    const result = validateVaultApplicationInput({
      firstName: "",
      email: "bad",
      freeformAnswer: "too short",
      source: "unknown",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field)).toEqual([
        "firstName",
        "email",
        "freeformAnswer",
        "source",
      ]);
    }
  });
});
