import { describe, it, expect } from "vitest";
import {
  evaluatePublicPerformancePolicy,
  PERFORMANCE_HEADLINE_KINDS,
  type PublicPerformancePolicyInput,
} from "@/lib/performance/public-performance-policy";
import { evaluatePublicClvPolicy, type PublicClvPolicy } from "@/lib/performance/public-clv-policy";

/**
 * S1 — the headline slot can never contain win-rate.
 *
 * AI prediction sites near-universally lead with win rate; it is gameable by
 * pick selection and trivially fabricated. CLV (did the price we locked beat
 * where the market closed?) is the sharp-credible signal touts almost never
 * show. `headlineMetric` is the enforcement point: it has exactly two members
 * — a CLV beat-close rate, or an explicit NOT_READY — and no code path in
 * `deriveHeadlineMetric` reads win/loss counts at all, so substituting
 * win-rate into the headline slot isn't a bug that could be introduced by a
 * careless edit; it's a type the function cannot construct.
 */

const winPolicyBase: PublicPerformancePolicyInput = {
  canExposePerformanceStats: true,
  minSettledPicksForLearning: 25,
  canonicalSettledCount: 100,
  bootstrapCount: 0,
  pendingCount: 5,
  canonicalWins: 55,
  canonicalLosses: 40,
  canonicalPushes: 5,
  recentTotalCount: 10,
  recentBootstrapCount: 0,
};

function allowedClv(overrides: Partial<PublicClvPolicy> = {}): PublicClvPolicy {
  const base = evaluatePublicClvPolicy({
    canExposePerformanceStats: true,
    minGradedForPublic: 25,
    gradedSampleSize: 60,
    beatCloseCount: 36,
    lostToCloseCount: 20,
    matchedCloseCount: 4,
  });
  return { ...base, ...overrides };
}

describe("headlineMetric — vocabulary contract", () => {
  it("PERFORMANCE_HEADLINE_KINDS has exactly the two legal members", () => {
    expect([...PERFORMANCE_HEADLINE_KINDS].sort()).toEqual(["CLV_BEAT_CLOSE", "NOT_READY"]);
  });

  it("every headlineMetric.kind produced is a member of the runtime vocabulary", () => {
    const cases: (PublicClvPolicy | null | undefined)[] = [
      undefined,
      null,
      allowedClv(),
      allowedClv({ canExposeClv: false, beatCloseRatePct: null }),
    ];
    for (const clv of cases) {
      const p = evaluatePublicPerformancePolicy({ ...winPolicyBase, clv });
      expect(PERFORMANCE_HEADLINE_KINDS).toContain(p.headlineMetric.kind);
    }
  });
});

describe("headlineMetric — never win-rate", () => {
  it("no key on headlineMetric is win/loss-shaped", () => {
    const p = evaluatePublicPerformancePolicy({ ...winPolicyBase, clv: allowedClv() });
    const keys = Object.keys(p.headlineMetric);
    for (const forbidden of ["winRate", "wins", "losses", "publicRecord", "publicWinRate"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("STRUCTURAL PROOF: headlineMetric is byte-identical across wildly different win/loss counts", () => {
    // If headline were ever win-rate-derived, changing wins/losses while holding
    // CLV fixed would change the headline. It must not — this is the real
    // guarantee, not just an absent-key check.
    const clv = allowedClv();
    const dominant = evaluatePublicPerformancePolicy({
      ...winPolicyBase,
      clv,
      canonicalWins: 999,
      canonicalLosses: 1,
    });
    const inverted = evaluatePublicPerformancePolicy({
      ...winPolicyBase,
      clv,
      canonicalWins: 1,
      canonicalLosses: 999,
    });
    expect(dominant.headlineMetric).toEqual(inverted.headlineMetric);
    // Sanity: publicWinRate itself DID move, proving the two calls really
    // differ and the invariant above isn't vacuous.
    expect(dominant.publicWinRate).not.toEqual(inverted.publicWinRate);
  });

  it("headline requires CLV present-and-allowed, or is explicit NOT_READY — never silently absent", () => {
    const withoutClv = evaluatePublicPerformancePolicy(winPolicyBase);
    expect(withoutClv.headlineMetric.kind).toBe("NOT_READY");
    expect(withoutClv.headlineMetric.label.length).toBeGreaterThan(0);

    const gatedClv = allowedClv({ canExposeClv: false, beatCloseRatePct: null, beatCloseCiLowPct: null, beatCloseCiHighPct: null });
    const withGatedClv = evaluatePublicPerformancePolicy({ ...winPolicyBase, clv: gatedClv });
    expect(withGatedClv.headlineMetric.kind).toBe("NOT_READY");

    const readyClv = allowedClv();
    const withReadyClv = evaluatePublicPerformancePolicy({ ...winPolicyBase, clv: readyClv });
    expect(withReadyClv.headlineMetric.kind).toBe("CLV_BEAT_CLOSE");
    expect(withReadyClv.headlineMetric.beatCloseRatePct).toBe(readyClv.beatCloseRatePct);
    expect(withReadyClv.headlineMetric.gradedSampleSize).toBe(readyClv.gradedSampleSize);
    expect(withReadyClv.headlineMetric.clearsBreakEven).toBe(readyClv.clearsBreakEven);
    expect(withReadyClv.headlineMetric.label).toContain(`${readyClv.beatCloseRatePct}%`);
  });
});

describe("headlineMetric — additive, does not break existing fields", () => {
  it("publicWinRate / publicRecord / publicWinRateCiLabel are unchanged from before this field existed", () => {
    const p = evaluatePublicPerformancePolicy(winPolicyBase);
    expect(p.publicWinRate).toBe(57.9);
    expect(p.publicRecord).toBe("55W-40L-5P");
    expect(p.publicWinRateCiLabel).toMatch(/^95% CP /);
  });

  it("omitting clv entirely does not throw and defaults to NOT_READY", () => {
    expect(() => evaluatePublicPerformancePolicy(winPolicyBase)).not.toThrow();
    expect(evaluatePublicPerformancePolicy(winPolicyBase).headlineMetric.kind).toBe("NOT_READY");
  });
});
