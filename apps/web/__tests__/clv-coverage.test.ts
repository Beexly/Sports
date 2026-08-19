import { describe, it, expect } from "vitest";
import {
  evaluateClvCoverage,
  loadClvCoverage,
  type ClvCoverageInput,
} from "@/lib/performance/clv-coverage";

function base(overrides: Partial<ClvCoverageInput> = {}): ClvCoverageInput {
  return {
    settledEligible: 100,
    graded: 100,
    ...overrides,
  };
}

describe("CLV coverage invariant", () => {
  it("reports NO_DATA before any pick has settled", () => {
    const c = evaluateClvCoverage(base({ settledEligible: 0, graded: 0 }));
    expect(c.health).toBe("NO_DATA");
    expect(c.coverageRatePct).toBeNull();
    expect(c.invariantHolds).toBe(false);
    expect(c.remediation).toEqual([]);
    expect(c.latestGradedAt).toBeNull();
  });

  it("holds the invariant only at 100% coverage over a non-empty sample", () => {
    const c = evaluateClvCoverage(base({ settledEligible: 40, graded: 40 }));
    expect(c.invariantHolds).toBe(true);
    expect(c.health).toBe("HEALTHY");
    expect(c.coverageRatePct).toBe(100);
    expect(c.uncovered).toBe(0);
    expect(c.remediation).toEqual([]);
    expect(c.operatorMessage).toMatch(/invariant holds/i);
  });

  it("exposes the coverage hole instead of hiding it", () => {
    // 90 of 100 graded → 10 settled picks silently lack a closing-line grade.
    const c = evaluateClvCoverage(base({ settledEligible: 100, graded: 90 }));
    expect(c.invariantHolds).toBe(false);
    expect(c.uncovered).toBe(10);
    expect(c.coverageRatePct).toBe(90);
    expect(c.health).toBe("DEGRADED"); // 90 ≥ 80 (degraded) but < 95 (healthy)
    expect(c.remediation.length).toBeGreaterThan(0);
    expect(c.operatorMessage).toMatch(/partial sample/i);
  });

  it("bands coverage as CRITICAL when most picks are ungraded", () => {
    const c = evaluateClvCoverage(base({ settledEligible: 100, graded: 50 }));
    expect(c.health).toBe("CRITICAL");
    expect(c.coverageRatePct).toBe(50);
    expect(c.uncovered).toBe(50);
  });

  it("rounds the coverage rate to one decimal", () => {
    // 2/3 = 66.666… → 66.7
    const c = evaluateClvCoverage(base({ settledEligible: 3, graded: 2 }));
    expect(c.coverageRatePct).toBe(66.7);
  });

  it("respects custom health thresholds", () => {
    const c = evaluateClvCoverage(
      base({ settledEligible: 100, graded: 90, healthyThresholdPct: 90, degradedThresholdPct: 70 })
    );
    expect(c.health).toBe("HEALTHY"); // 90 ≥ custom healthy of 90
  });

  it("never invents coverage above 100% or a negative uncovered count", () => {
    const c = evaluateClvCoverage(base({ settledEligible: 10, graded: 25 }));
    expect(c.graded).toBe(10); // clamped to the eligible set
    expect(c.coverageRatePct).toBe(100);
    expect(c.uncovered).toBe(0);
    expect(c.invariantHolds).toBe(true);
  });

  it("passes latestGradedAt through as null when not provided", () => {
    const c = evaluateClvCoverage(base({ settledEligible: 40, graded: 40 }));
    expect(c.latestGradedAt).toBeNull();
  });

  it("passes latestGradedAt through when provided", () => {
    const ts = "2026-07-02T12:30:00.000Z";
    const c = evaluateClvCoverage(base({ settledEligible: 40, graded: 40, latestGradedAt: ts }));
    expect(c.latestGradedAt).toBe(ts);
  });

  it("loads coverage from the pick table over eligible (played, canonical) picks only", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const db = {
      pick: {
        count: async ({ where }: { where: Record<string, unknown> }) => {
          calls.push(where);
          // First call = eligible denominator; second = graded subset.
          return where["clvVerdict"] ? 18 : 20;
        },
        findFirst: async () => null, // no graded picks in this mock
      },
    };
    const c = await loadClvCoverage(db);
    expect(c.settledEligible).toBe(20);
    expect(c.graded).toBe(18);
    expect(c.uncovered).toBe(2);
    expect(c.coverageRatePct).toBe(90);
    expect(c.latestGradedAt).toBeNull();

    // The denominator must exclude VOID and bootstrap/seed picks.
    const eligibleWhere = calls[0]!;
    expect(eligibleWhere["isBootstrap"]).toBe(false);
    expect(eligibleWhere["isPublished"]).toBe(true);
    expect(eligibleWhere["result"]).toEqual({ in: ["WIN", "LOSS", "PUSH"] });
    expect(eligibleWhere["NOT"]).toEqual({ modelVersion: { contains: "seed" } });
    // The graded query is the same filter plus a non-null verdict.
    expect(calls[1]!["clvVerdict"]).toEqual({ not: null });
  });
});
