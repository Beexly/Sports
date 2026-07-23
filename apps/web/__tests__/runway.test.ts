import { describe, it, expect } from "vitest";
import { runwayMonths, canHitFamilyFloor, type RunwayInput } from "@/lib/growth/runway";

function base(overrides: Partial<RunwayInput> = {}): RunwayInput {
  return {
    cashInBankCents: 1_000_000,
    mrrCents: 50_000,
    monthlyBurnCents: 100_000,
    familyFloorCents: 0,
    ...overrides,
  };
}

describe("runwayMonths", () => {
  it("is Infinity when MRR exactly covers burn (net zero)", () => {
    expect(runwayMonths(base({ mrrCents: 100_000, monthlyBurnCents: 100_000 }))).toBe(Infinity);
  });

  it("is Infinity when net-positive", () => {
    expect(runwayMonths(base({ mrrCents: 150_000, monthlyBurnCents: 100_000 }))).toBe(Infinity);
  });

  it("divides cash on hand by the monthly shortfall when net-negative", () => {
    const r = runwayMonths(base({ cashInBankCents: 500_000, mrrCents: 50_000, monthlyBurnCents: 100_000 }));
    expect(r).toBe(10); // 500,000 / 50,000
  });

  it("handles a small shortfall precisely", () => {
    const r = runwayMonths(base({ cashInBankCents: 100_000, mrrCents: 0, monthlyBurnCents: 3 }));
    expect(r).toBeCloseTo(33_333.33, 1);
  });
});

describe("canHitFamilyFloor", () => {
  it("is true when net exactly equals the family floor (boundary)", () => {
    expect(canHitFamilyFloor(base({ mrrCents: 100_000, monthlyBurnCents: 50_000, familyFloorCents: 50_000 }))).toBe(true);
  });

  it("is true when net comfortably exceeds the floor", () => {
    expect(canHitFamilyFloor(base({ mrrCents: 200_000, monthlyBurnCents: 50_000, familyFloorCents: 50_000 }))).toBe(true);
  });

  it("is false one cent under the floor", () => {
    expect(canHitFamilyFloor(base({ mrrCents: 149_999, monthlyBurnCents: 100_000, familyFloorCents: 50_000 }))).toBe(false);
  });

  it("is false when net is negative and the floor is positive", () => {
    expect(canHitFamilyFloor(base({ mrrCents: 10_000, monthlyBurnCents: 100_000, familyFloorCents: 10_000 }))).toBe(false);
  });
});
