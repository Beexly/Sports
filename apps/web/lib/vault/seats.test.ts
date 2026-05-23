import { describe, expect, it } from "vitest";
import { getVaultSeatCount } from "./seats";

describe("Vault seat counts", () => {
  it("reports remaining founding seats", () => {
    expect(getVaultSeatCount(41)).toEqual({
      cap: 1000,
      filled: 41,
      remaining: 959,
      waitlistOpen: false,
    });
  });

  it("clamps invalid or excessive filled counts", () => {
    expect(getVaultSeatCount(Number.NaN).filled).toBe(0);
    expect(getVaultSeatCount(-12).filled).toBe(0);
    expect(getVaultSeatCount(1200)).toEqual({
      cap: 1000,
      filled: 1000,
      remaining: 0,
      waitlistOpen: true,
    });
  });
});
