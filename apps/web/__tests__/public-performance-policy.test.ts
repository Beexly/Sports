import { describe, it, expect } from "vitest";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { getBannedPhraseList, INTERNAL_VOCABULARY } from "@/lib/trust-claims";

describe("evaluatePublicPerformancePolicy", () => {
  const base = {
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

  it("allows public stats when gate is open and sample is sufficient", () => {
    const p = evaluatePublicPerformancePolicy(base);
    expect(p.canExposePerformanceStats).toBe(true);
    expect(p.primaryReason).toBeNull();
    expect(p.blockers).toHaveLength(0);
    expect(p.publicWinRate).toBe(57.9); // 55 / (55+40) → 57.9%
    // Record uses the en-dash separator the policy ships today.
    expect(p.publicRecord).toBe("55W-40L-5P");
  });

  it("blocks when readiness gate is off", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canExposePerformanceStats: false,
    });
    expect(p.canExposePerformanceStats).toBe(false);
    expect(p.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
    expect(p.publicWinRate).toBeNull();
    expect(p.minimumRequirements.join(" ")).toMatch(/PERFORMANCE_STATS_ENABLED/);
  });

  it("blocks when canonical sample is below minimum", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canonicalSettledCount: 5,
      canonicalWins: 3,
      canonicalLosses: 2,
      canonicalPushes: 0,
    });
    expect(p.canExposePerformanceStats).toBe(false);
    expect(p.primaryReason).toBe("INSUFFICIENT_CANONICAL_SAMPLE");
    expect(p.publicWinRate).toBeNull();
  });

  it("blocks when every recent pick is bootstrap, even with canonical history", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      recentTotalCount: 10,
      recentBootstrapCount: 10,
    });
    expect(p.canExposePerformanceStats).toBe(false);
    expect(p.blockers).toContain("ALL_RECENT_PICKS_BOOTSTRAP");
  });

  it("never emits a win rate when blocked", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canExposePerformanceStats: false,
    });
    expect(p.publicWinRate).toBeNull();
  });

  // ── Edge cases the policy IS responsible for ──────────────────────────────
  // The policy intentionally trusts its inputs and stays simple. The loader
  // layer is responsible for handing it well-formed counts. We still cover
  // the edge cases the policy explicitly handles itself.
  describe("default minimum sample size", () => {
    it("falls back to default minSettledPicksForLearning when the input is 0", () => {
      const p = evaluatePublicPerformancePolicy({
        ...base,
        minSettledPicksForLearning: 0,
        canonicalSettledCount: 5,
      });
      // Default is 25, so 5 < 25 blocks.
      expect(p.canExposePerformanceStats).toBe(false);
      expect(p.primaryReason).toBe("INSUFFICIENT_CANONICAL_SAMPLE");
    });

    it("falls back to default minSettledPicksForLearning when the input is negative", () => {
      const p = evaluatePublicPerformancePolicy({
        ...base,
        minSettledPicksForLearning: -1,
        canonicalSettledCount: 5,
      });
      expect(p.canExposePerformanceStats).toBe(false);
      expect(p.primaryReason).toBe("INSUFFICIENT_CANONICAL_SAMPLE");
    });

    it("primaryReason picks the first blocker when multiple fire", () => {
      const p = evaluatePublicPerformancePolicy({
        ...base,
        canExposePerformanceStats: false,
        canonicalSettledCount: 3,
        canonicalWins: 2,
        canonicalLosses: 1,
        canonicalPushes: 0,
      });
      // Both GATE_OFF and INSUFFICIENT_CANONICAL_SAMPLE fire; GATE_OFF runs
      // first, so it must be the primaryReason.
      expect(p.blockers).toContain("GATE_OFF_PERFORMANCE_STATS");
      expect(p.blockers).toContain("INSUFFICIENT_CANONICAL_SAMPLE");
      expect(p.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
    });
  });

  it("returns zero win rate as null when no decided picks (W+L = 0)", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canonicalSettledCount: 50,
      canonicalWins: 0,
      canonicalLosses: 0,
      canonicalPushes: 50,
    });
    expect(p.canExposePerformanceStats).toBe(true);
    expect(p.publicWinRate).toBeNull();
    expect(p.publicWinRateCiLowPct).toBeNull();
    expect(p.publicWinRateCiHighPct).toBeNull();
  });

  it("attaches a Clopper-Pearson band to a publishable headline rate", () => {
    const p = evaluatePublicPerformancePolicy(base);
    expect(p.publicWinRate).toBe(57.9);
    expect(p.publicWinRateBoundMethod).toBe("clopper-pearson");
    expect(p.publicWinRateCiLowPct).toBeTypeOf("number");
    expect(p.publicWinRateCiHighPct).toBeTypeOf("number");
    expect(p.publicWinRateCiLowPct!).toBeLessThan(p.publicWinRate!);
    expect(p.publicWinRateCiHighPct!).toBeGreaterThan(p.publicWinRate!);
    expect(p.canonicalVoids).toBe(0);
  });

  it("counts voids in the record without changing the decided rate", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canonicalVoids: 7,
      modelVersions: ["v1.2.0"],
    });
    expect(p.publicWinRate).toBe(57.9);
    expect(p.publicRecord).toMatch(/7V/);
    expect(p.modelVersions).toEqual(["v1.2.0"]);
    expect(p.disclaimer).toMatch(/clopper-pearson/i);
    expect(p.disclaimer).toMatch(/past performance does not guarantee future results/i);
  });

  it("withholds the interval when the performance gate is closed", () => {
    const p = evaluatePublicPerformancePolicy({
      ...base,
      canExposePerformanceStats: false,
    });
    expect(p.publicWinRate).toBeNull();
    expect(p.publicWinRateCiLowPct).toBeNull();
    expect(p.publicWinRateCiHighPct).toBeNull();
  });

  // ── Brand-safety invariants ───────────────────────────────────────────────
  // These cover every code path of publicMessage. The customer-facing
  // string must always carry the past-performance disclaimer and must
  // never contain a banned phrase. If any string changes, these will
  // surface the regression at unit-test time.
  describe("publicMessage brand-safety", () => {
    const PAST_PERF = /past performance does not guarantee future results/i;
    // Trust-claim registry is the single source of truth for what we ban
    // from public copy. Tests consume it instead of duplicating strings.
    const BANNED = getBannedPhraseList().map((p) => p.toLowerCase());

    function assertSafe(message: string) {
      expect(message).toMatch(PAST_PERF);
      const lower = message.toLowerCase();
      for (const phrase of BANNED) {
        // The scanner uses word-boundary handling for short single-word
        // phrases ("lock") to avoid false positives. We mirror that rule
        // here so the test agrees with the production scanner.
        const useWordBoundary = !phrase.includes(" ") && phrase.length <= 6;
        const pattern = useWordBoundary
          ? new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
          : new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        expect(
          pattern.test(lower),
          `publicMessage must not contain banned phrase: "${phrase}"`
        ).toBe(false);
      }
    }

    it("allowed path: disclaimer present, no banned phrases", () => {
      assertSafe(evaluatePublicPerformancePolicy(base).publicMessage);
    });

    it("gate-off path: disclaimer present, no banned phrases", () => {
      assertSafe(
        evaluatePublicPerformancePolicy({ ...base, canExposePerformanceStats: false }).publicMessage
      );
    });

    it("insufficient-sample path: disclaimer present, no banned phrases", () => {
      assertSafe(
        evaluatePublicPerformancePolicy({
          ...base,
          canonicalSettledCount: 5,
          canonicalWins: 3,
          canonicalLosses: 2,
          canonicalPushes: 0,
        }).publicMessage
      );
    });

    it("all-recent-bootstrap path: disclaimer present, no banned phrases", () => {
      assertSafe(
        evaluatePublicPerformancePolicy({
          ...base,
          recentTotalCount: 10,
          recentBootstrapCount: 10,
        }).publicMessage
      );
    });

    it("uses customer-friendly vocabulary (no internal terms in publicMessage)", () => {
      const messages = [
        evaluatePublicPerformancePolicy(base).publicMessage,
        evaluatePublicPerformancePolicy({ ...base, canExposePerformanceStats: false }).publicMessage,
        evaluatePublicPerformancePolicy({
          ...base,
          canonicalSettledCount: 5,
          canonicalWins: 3,
          canonicalLosses: 2,
          canonicalPushes: 0,
        }).publicMessage,
        evaluatePublicPerformancePolicy({
          ...base,
          recentTotalCount: 10,
          recentBootstrapCount: 10,
        }).publicMessage,
      ];
      for (const m of messages) {
        for (const term of INTERNAL_VOCABULARY) {
          const pattern = new RegExp(`\\b${term}\\b`, "i");
          expect(
            pattern.test(m),
            `publicMessage leaked internal term "${term}": ${m}`
          ).toBe(false);
        }
      }
    });

    it("operator messages MAY contain internal vocabulary (the asymmetry is by design)", () => {
      // This is the inverse assertion: the operatorMessage is allowed to
      // (and should) name internal terms so the cockpit is precise. If
      // operatorMessage becomes too polite, we lose precision in the
      // command center.
      const op = evaluatePublicPerformancePolicy({
        ...base,
        canExposePerformanceStats: false,
      }).operatorMessage;
      expect(/PERFORMANCE_STATS_ENABLED|gate/i.test(op)).toBe(true);
    });
  });
});
