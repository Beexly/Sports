import { describe, expect, it } from "vitest";
import { getNextFoundingSeatAssignment, getVaultSeatCount } from "./seats";

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

  it("assigns the next founding number from existing durable numbers", () => {
    expect(getNextFoundingSeatAssignment([])).toEqual({
      status: "assign",
      foundingNumber: 1,
      reason: "next_available",
    });
    expect(getNextFoundingSeatAssignment([1, 2, 3])).toEqual({
      status: "assign",
      foundingNumber: 4,
      reason: "next_available",
    });
  });

  it("routes to waitlist when founding cap is reached", () => {
    expect(getNextFoundingSeatAssignment([1000])).toEqual({
      status: "waitlist",
      foundingNumber: null,
      reason: "cap_reached",
    });
  });

  it("requires manual review for corrupted existing founding numbers", () => {
    expect(getNextFoundingSeatAssignment([1, 1])).toEqual({
      status: "manual_review",
      foundingNumber: null,
      reason: "duplicate_existing_number",
    });
    expect(getNextFoundingSeatAssignment([0])).toEqual({
      status: "manual_review",
      foundingNumber: null,
      reason: "invalid_existing_number",
    });
  });
});
