import { describe, it, expect } from "vitest";
import {
  evaluatePublicClvPolicy,
  type PublicClvPolicyInput,
} from "@/lib/performance/public-clv-policy";

function base(overrides: Partial<PublicClvPolicyInput> = {}): PublicClvPolicyInput {
  return {
    canExposePerformanceStats: true,
    minGradedForPublic: 25,
    gradedSampleSize: 40,
    beatCloseCount: 24,
    lostToCloseCount: 12,
    matchedCloseCount: 4,
    ...overrides,
  };
}

describe("public CLV policy", () => {
  it("blocks when the performance gate is off — and shows no number", () => {
    const p = evaluatePublicClvPolicy(base({ canExposePerformanceStats: false }));
    expect(p.canExposeClv).toBe(false);
    expect(p.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
    expect(p.beatCloseRatePct).toBeNull();
    expect(p.minimumRequirements.length).toBeGreaterThan(0);
  });

  it("blocks on an insufficient graded sample — and shows no number", () => {
    const p = evaluatePublicClvPolicy(
      base({ gradedSampleSize: 5, beatCloseCount: 4, lostToCloseCount: 1, matchedCloseCount: 0 })
    );
    expect(p.canExposeClv).toBe(false);
    expect(p.blockers).toContain("INSUFFICIENT_GRADED_SAMPLE");
    expect(p.beatCloseRatePct).toBeNull();
  });

  it("publishes the beat-close rate once gate is open and sample is sufficient", () => {
    const p = evaluatePublicClvPolicy(base());
    expect(p.canExposeClv).toBe(true);
    expect(p.blockers).toEqual([]);
    // 24 beat of 40 graded = 60.0%
    expect(p.beatCloseRatePct).toBe(60);
    expect(p.publicMessage).toMatch(/60% of 40 graded picks/);
  });

  it("never claims a guarantee, even when allowed", () => {
    const p = evaluatePublicClvPolicy(base());
    expect(p.publicMessage.toLowerCase()).not.toMatch(/guarantee(s|d)? (a |future )?win/);
    expect(p.publicMessage.toLowerCase()).toMatch(/not a guarantee|leading indicator/);
  });

  it("uses the default minimum when none is configured", () => {
    const p = evaluatePublicClvPolicy(
      base({ minGradedForPublic: 0, gradedSampleSize: 10 })
    );
    // default is 25, so 10 graded is still gated
    expect(p.canExposeClv).toBe(false);
    expect(p.blockers).toContain("INSUFFICIENT_GRADED_SAMPLE");
  });

  it("rounds the beat-close rate to one decimal", () => {
    const p = evaluatePublicClvPolicy(
      base({ gradedSampleSize: 30, beatCloseCount: 16, lostToCloseCount: 14, matchedCloseCount: 0 })
    );
    // 16/30 = 53.333% → 53.3
    expect(p.beatCloseRatePct).toBe(53.3);
  });
});
