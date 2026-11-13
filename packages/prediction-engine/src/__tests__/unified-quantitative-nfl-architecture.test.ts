import { describe, expect, it } from "vitest";
import {
  americanToRawImpliedProb,
  cfbdPiecewiseLineYards,
  computeCircadianPerformanceIndex,
  devigAllSixMethods,
  evaluateUnifiedQuantitativeArchitectureOverlay,
  mapInjuryDesignationToDropoffBucket,
  normalPpf,
  simulateVictoryFormationRule4,
  solveNflfastrPr618NetEp,
  studentTUpperTailDependence,
} from "../nfl/unified-quantitative-nfl-architecture.js";
import { evaluateZeroOrphanExpectedMetricsOverlay } from "../nfl/zero-orphan-expected-metrics-bridge.js";

describe("Unified Quantitative NFL Architecture & X/IG Sweep Wiring", () => {
  it("matches all six docx devigging benchmarks on -450 / +340", () => {
    const q = [americanToRawImpliedProb(-450), americanToRawImpliedProb(340)];
    const res = devigAllSixMethods(q);
    expect(Number((100 * res.Multiplicative[1]).toFixed(2))).toBe(21.74);
    expect(Number((100 * res.Additive[1]).toFixed(2))).toBe(20.45);
    expect(Number((100 * res.Cheung_Odds_Ratio[1]).toFixed(2))).toBe(20.36);
    expect(Number((100 * res.Probit[1]).toFixed(2))).toBe(20.38);
    expect(Number((100 * res.Power[1]).toFixed(2))).toBe(19.73);
    expect(Number((100 * res.Shin[1]).toFixed(2))).toBe(20.45);
  });

  it("reproduces the Rule 4 Pre-Two-Minute Warning Trap (2:01.0 -> 34.6s left vs 2:00.0 -> 0.0s)", () => {
    const trap = simulateVictoryFormationRule4(121.0, 0);
    expect(trap.totalSecondsBurned).toBe(86.4);
    expect(trap.clockRemainingAtTurnoverSeconds).toBe(34.6);
    expect(trap.clockExhaustedDeterministic).toBe(false);

    const kill = simulateVictoryFormationRule4(120.0, 0);
    expect(kill.clockRemainingAtTurnoverSeconds).toBe(0.0);
    expect(kill.maxBleedCapacitySeconds).toBe(126.4);
    expect(kill.clockExhaustedDeterministic).toBe(true);
  });

  it("solves nflfastR PR #618 coupled net-EP, CFBD line yards, and Hermes injury role-key mapping", () => {
    const pr618 = solveNflfastrPr618NetEp({
      td: 0.375,
      oppTd: 0.195,
      fg: 0.235,
      oppFg: 0.135,
      safety: 0.004,
      oppSafety: 0.003,
    });
    expect(pr618.vKickoffEp).toBeGreaterThan(0.9);
    expect(pr618.tdNetScoreValue).toBeLessThan(6.2);
    expect(pr618.fgNetScoreValue).toBeLessThan(2.3);

    expect(cfbdPiecewiseLineYards(-2)).toBeCloseTo(-2.4, 5);
    expect(cfbdPiecewiseLineYards(4)).toBeCloseTo(4.0, 5);
    expect(cfbdPiecewiseLineYards(8)).toBeCloseTo(6.0, 5);
    expect(cfbdPiecewiseLineYards(18)).toBeCloseTo(7.0, 5);

    expect(mapInjuryDesignationToDropoffBucket("LT")).toBe("OL");
    expect(mapInjuryDesignationToDropoffBucket("WR1")).toBe("SKILL");
    expect(mapInjuryDesignationToDropoffBucket("CB1")).toBe("DEF");
    expect(mapInjuryDesignationToDropoffBucket("EDGE1")).toBe("DEF");

    const munich = computeCircadianPerformanceIndex({
      kickoffUtcHour: 14.5,
      teamBodyClockUtcOffset: -5.0,
      timezoneZonesCrossed: 6,
      daysSinceArrival: 3,
      travelDirection: "EAST",
    });
    expect(munich.cpi).toBeLessThan(-0.45);
    expect(studentTUpperTailDependence(0.55, 4)).toBeCloseTo(0.2822, 3);
  });

  it("is wired into evaluateZeroOrphanExpectedMetricsOverlay with zero orphans", () => {
    const overlay = evaluateZeroOrphanExpectedMetricsOverlay({
      cleanBadThrows: 18,
      cleanAttempts: 160,
      pressuredBadThrows: 22,
      pressuredAttempts: 75,
      wrTargetSuccessRate: 0.56,
      wrTargetShare: 0.27,
      qbMofCompletionRate: 0.68,
      defZoneRate: 0.64,
      ryoePerCarry: 0.62,
      yardsBeforeContactPerCarry: 2.8,
      underCenterEpa: 0.09,
      shotgunEpa: 0.04,
      neutralSnapShare: 0.54,
      winPlayoffProb: 0.72,
      lossPlayoffProb: 0.48,
      opponentWinPlayoffSwing: 0.19,
      timeZoneDeltaHours: 6,
    });
    expect(overlay.unifiedArchitectureReceipt.injuryBucketMappingVerified).toBe(true);
    expect(overlay.unifiedArchitectureReceipt.victoryFormation200ClockExhausted).toBe(true);

    const direct = evaluateUnifiedQuantitativeArchitectureOverlay({ sampleRushYards: 6 });
    expect(direct.cfbdCarryLineYardsSample).toBe(5);
  });

  it("keeps Acklam normalPpf accurate across all three branches after the tuple-const fix", () => {
    // Central branch
    expect(normalPpf(0.5)).toBeCloseTo(0, 12);
    expect(normalPpf(0.975)).toBeCloseTo(1.959963984540054, 8);
    // Lower tail branch (pc < 0.02425)
    expect(normalPpf(0.001)).toBeCloseTo(-3.090232306167813, 8);
    // Upper tail branch (pc > 1 - 0.02425)
    expect(normalPpf(0.999)).toBeCloseTo(3.090232306167813, 8);
    // Symmetry
    expect(normalPpf(0.025) + normalPpf(0.975)).toBeCloseTo(0, 8);
  });

  it("keeps the devig underdog diagnostic numeric and the Acklam quantile finite", () => {
    // The receipt reads Shin/Power at index 1 of a two-way devig. It used to be
    // a bare index read that noUncheckedIndexedAccess rejected as "possibly
    // undefined" — the fix reads through `?? Number.NaN`. Pin that the real
    // path still produces a probability, not a fallback.
    const direct = evaluateUnifiedQuantitativeArchitectureOverlay({ sampleRushYards: 6 });
    expect(Number.isFinite(direct.devig2WayUnderdogShin)).toBe(true);
    expect(Number.isFinite(direct.devig2WayUnderdogPower)).toBe(true);
    expect(direct.devig2WayUnderdogShin).toBeGreaterThan(0);
    expect(direct.devig2WayUnderdogShin).toBeLessThan(1);
    expect(direct.devig2WayUnderdogPower).toBeGreaterThan(0);
    expect(direct.devig2WayUnderdogPower).toBeLessThan(1);

    // One value from each Acklam branch (below pLow, central, above pHigh).
    // A coefficient table that lost an element would surface here as NaN.
    for (const p of [0.001, 0.2, 0.5, 0.8, 0.999]) {
      expect(Number.isFinite(normalPpf(p))).toBe(true);
    }
    expect(normalPpf(0.5)).toBeCloseTo(0, 6);
  });
});
