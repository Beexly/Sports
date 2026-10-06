/**
 * reasoning-responsiveness.test.ts — MEASUREMENT SPECIFICATION.
 *
 * Turns "the engine reasons" from an assertion into a measured property.
 *
 * WHAT THIS DOES NOT DO: it does not re-assert that adapters are
 * callable or that results have the right shape. coverage.test.ts and
 * reasoning-provenance.test.ts already own that, and a stub returning
 * a plausible constant passes all of it. What was never measured is
 * whether the answer CHANGES when the world changes.
 *
 * TWO PROPERTIES, both measured here:
 *
 *  1. RESPONSIVENESS — sweep one input axis per surface entry point,
 *     declare the response shape in advance, and measure whether the
 *     output traces it. A stub is INERT (span === 0).
 *
 *  2. SELECTION-AWARENESS — hold every magnitude fixed, change only
 *     WHICH signal is selected, and measure whether the answer moves.
 *     This is the property an averager cannot fake: its gap is 0.
 *
 * SATURATION IS NOT A BUG. `nflPasserRating` caps its touchdown term at
 * 2.375, so 2 TD and 10 TD in 10 attempts legitimately tie. Every such
 * plateau is declared per-point as a `boundary` with the math that
 * causes it, so it is auditable rather than merely tolerated.
 */

import { describe, expect, it } from "vitest";
import {
  buildReport,
  evaluateSelection,
  evaluateSweep,
  formatSweepLines,
  type SelectionResult,
  type SweepResult,
  type SweepSpec,
} from "./reasoning-responsiveness.js";
import {
  REASONING_SURFACE,
  reasonAnytimeTd,
  reasonCadence,
  reasonCoverProbability,
  reasonDeserveToWin,
  reasonDrawdownRisk,
  reasonFgMake,
  reasonGeneralizedPoisson,
  reasonKellyLogGrowth,
  reasonNeutralizePlay,
  reasonPasserRating,
  reasonRobustKelly,
} from "./reasoning-surface.js";
import type { PlayerRoleContext } from "../props/anytime-td-mit.js";
import type { PlayInput } from "../nfl/luck-neutralized-epa.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

function tdContext(over: Partial<PlayerRoleContext> = {}): PlayerRoleContext {
  return {
    playerId: "p1",
    season: 2026,
    week: 5,
    position: "RB",
    isHome: true,
    rolling: {
      windowGames: 4,
      snapShare: 0.6,
      redZoneShare: 0.3,
      usageShare: 0.25,
      teamPlaysPerGame: 62,
      oppTdRateAllowed: 1.1,
    },
    injuryStatus: "HEALTHY",
    ...over,
  };
}

function tdProbability(ctx: PlayerRoleContext): number {
  const r = reasonAnytimeTd(ctx);
  if (!r.ok) throw new Error(`anytimeTd fail-closed during probe: ${r.reason}`);
  return r.data.probability;
}

function play(over: Partial<PlayInput> = {}): PlayInput {
  return {
    playId: "p1",
    gameId: "g1",
    homeTeam: "KC",
    awayTeam: "BUF",
    offenseTeam: "KC",
    epa: 0.9,
    playType: "pass",
    fumble: false,
    fumbleRecoveredByOwnTeam: false,
    interception: false,
    tippedInterception: false,
    fieldGoal: false,
    fieldGoalMade: false,
    fieldGoalDistance: null,
    wpBefore: 0.5,
    ...over,
  };
}

function neutralized(over: Partial<PlayInput> = {}): number {
  const r = reasonNeutralizePlay(play(over));
  if (!r.ok) throw new Error("neutralize fail-closed during probe");
  if (r.data.neutralizedEpa === null) {
    throw new Error("neutralize returned null EPA during probe");
  }
  return r.data.neutralizedEpa;
}

/**
 * The adjustment channel — how much luck the engine stripped out.
 *
 * Neutralizing a fully-luck play maps EVERY original EPA to the same
 * expected value, so `neutralizedEpa` is deliberately constant across
 * that sweep and `adjustment` is the responsive channel. Reading the
 * wrong one would measure a designed constant and call it a bug.
 */
function neutralizationAdjustment(over: Partial<PlayInput> = {}): number {
  const r = reasonNeutralizePlay(play(over));
  if (!r.ok) throw new Error("neutralize fail-closed during probe");
  return r.data.adjustment;
}

function unwrap<T>(label: string, r: { ok: true; data: T } | { ok: false; reason: string }): T {
  if (!r.ok) throw new Error(`${label} fail-closed during probe: ${r.reason}`);
  return r.data;
}

// ── 0. The harness must be able to fail ─────────────────────────────────────

describe("0. the measuring instrument is itself falsifiable", () => {
  it("flags a constant-returning stub as INERT, not SHAPE_OK", () => {
    // A stub that ignores its input and returns a plausible constant.
    // Every structural test in this repo accepts it. This must not.
    const stub = evaluateSweep({
      name: "stub-constant",
      hypothesis: "a stub must be caught",
      shape: "monotonic_up",
      points: [1, 2, 3, 4].map((i) => ({ input: i, output: 0.55 })),
    });
    expect(stub.verdict).toBe("INERT");
    expect(stub.span).toBe(0);
  });

  it("flags a wrong-sign response as SHAPE_VIOLATION", () => {
    const inverted = evaluateSweep({
      name: "inverted",
      hypothesis: "wrong direction must be caught",
      shape: "monotonic_up",
      points: [
        { input: 1, output: 0.5 },
        { input: 2, output: 0.4 },
        { input: 3, output: 0.3 },
      ],
    });
    expect(inverted.verdict).toBe("SHAPE_VIOLATION");
    expect(inverted.span).toBeGreaterThan(0);
  });

  it("accepts a genuine monotone response", () => {
    const real = evaluateSweep({
      name: "genuine",
      hypothesis: "real math must pass",
      shape: "monotonic_down",
      points: [
        { input: 1, output: 0.9 },
        { input: 2, output: 0.7 },
        { input: 3, output: 0.4 },
      ],
    });
    expect(real.verdict).toBe("SHAPE_OK");
  });

  it("measures a peak separately from a monotone climb", () => {
    const peaked = evaluateSweep({
      name: "peaked",
      hypothesis: "peak detected",
      shape: "single_peak",
      points: [
        { input: 1, output: 0.0 },
        { input: 2, output: 0.5 },
        { input: 3, output: 0.9 },
        { input: 4, output: 0.3 },
        { input: 5, output: -0.1 },
      ],
    });
    expect(peaked.verdict).toBe("SHAPE_OK");
    expect(peaked.turningIndex).toBe(2);
  });

  it("rejects a non-increasing sweep axis instead of measuring nonsense", () => {
    expect(() =>
      evaluateSweep({
        name: "bad-axis",
        hypothesis: "axis must increase",
        shape: "monotonic_up",
        points: [
          { input: 2, output: 1 },
          { input: 1, output: 2 },
        ],
      }),
    ).toThrow(/strictly increasing/);
  });

  it("reports a magnitude-only averager as failing selection-awareness", () => {
    // An averager keyed on value alone cannot tell these two apart,
    // because the magnitude is identical. gap must be 0.
    const averager = evaluateSelection<number>({
      name: "averager",
      hypothesis: "magnitude-only selection must not discriminate",
      heldConstant: "magnitude",
      selected: 0.9,
      rejected: 0.9,
      read: (v) => v,
    });
    expect(averager.discriminated).toBe(false);
    expect(averager.gap).toBe(0);
  });

  it("separates a declared constant from an undeclared one", () => {
    // The escape hatch for designed constants must not become a
    // loophole: it applies ONLY when EVERY point is declared flat.
    const declared = evaluateSweep({
      name: "declared-constant",
      hypothesis: "a designed constant is labelled, not excused",
      shape: "monotonic_up",
      points: [
        { input: 1, output: 0.05, boundary: true },
        { input: 2, output: 0.05, boundary: true },
        { input: 3, output: 0.05, boundary: true },
      ],
    });
    expect(declared.verdict).toBe("DECLARED_CONSTANT");

    // One undeclared point in the same flat sweep reopens the verdict.
    const mixed = evaluateSweep({
      name: "partially-declared-constant",
      hypothesis: "a partially declared flat sweep is still a stub",
      shape: "monotonic_up",
      points: [
        { input: 1, output: 0.05, boundary: true },
        { input: 2, output: 0.05 },
        { input: 3, output: 0.05, boundary: true },
      ],
    });
    expect(mixed.verdict).toBe("INERT");
  });

  it("a declared constant still has to be reported, not swallowed", () => {
    const constant = evaluateSweep({
      name: "reported",
      hypothesis: "constants stay visible in the tally",
      shape: "monotonic_up",
      points: [
        { input: 1, output: 0, boundary: true },
        { input: 2, output: 0, boundary: true },
      ],
    });
    const report = buildReport([constant], []);
    expect(report.declaredConstants).toBe(1);
    expect(report.inert).toBe(0);
    expect(report.responsive).toBe(0);
    expect(report.responsive + report.declaredConstants + report.inert + report.violations).toBe(1);
  });
});

// ── 1. Responsiveness sweeps across the surface ────────────────────────────

const SWEEPS: readonly SweepSpec[] = [
  {
    name: "fgMake:distance",
    hypothesis: "a longer field goal is a harder field goal",
    shape: "monotonic_down",
    points: [20, 30, 40, 50, 60].map((d) => ({
      input: d,
      output: unwrap("fgMake", reasonFgMake(d, 0, true)),
    })),
  },
  {
    name: "fgMake:wind",
    hypothesis: "wind lowers outdoor make probability above 8mph",
    shape: "monotonic_down",
    points: [10, 20, 30, 40].map((w) => ({
      input: w,
      output: unwrap("fgMake", reasonFgMake(40, w, true)),
    })),
  },
  {
    name: "anytimeTd:snapShare",
    hypothesis: "more snaps means more anytime-TD chances",
    shape: "monotonic_up",
    points: [0.1, 0.3, 0.5, 0.7, 0.9].map((s) => ({
      input: s,
      output: tdProbability(
        tdContext({
          rolling: { ...tdContext().rolling, snapShare: s },
        }),
      ),
    })),
  },
  {
    name: "anytimeTd:injurySeverity",
    hypothesis: "less availability means less scoring",
    shape: "monotonic_down",
    // Ranked by INJURY_MULTIPLIER: 1.0 / 0.97 / 0.72 / ~0.35 / ~0.
    points: [0, 1, 2, 3, 4].map((rank) => ({
      input: rank,
      output: tdProbability(
        tdContext({
          injuryStatus: (["HEALTHY", "PROBABLE", "QUESTIONABLE", "DOUBTFUL", "OUT"] as const)[rank],
        }),
      ),
      boundary: rank === 4,
    })),
  },
  {
    name: "anytimeTd:oppTdRateAllowed",
    hypothesis: "a weaker defense allows more touchdowns",
    shape: "monotonic_up",
    // Saturates at 0.92 — the model clamps. Declared, not hidden.
    points: [0.4, 0.8, 1.1, 1.6, 2.2].map((r) => ({
      input: r,
      output: tdProbability(
        tdContext({ rolling: { ...tdContext().rolling, oppTdRateAllowed: r } }),
      ),
      boundary: r >= 1.6,
    })),
  },
  {
    name: "passerRating:completions",
    hypothesis: "more completions means a higher passer rating",
    shape: "monotonic_up",
    // att=10 keeps the a/b/d terms below the 2.375 cap, so the sweep
    // stays in the interior instead of riding a documented ceiling.
    points: [4, 6, 8, 10].map((c) => ({
      input: c,
      output: unwrap("passerRating", reasonPasserRating(10, c, 200, 1, 0)),
    })),
  },
  {
    name: "passerRating:touchdowns",
    hypothesis: "more touchdowns means a higher passer rating",
    shape: "monotonic_up",
    // att=40: c = (td/40)*20 stays under 2.375 through td=5, so the
    // touchdown term is genuinely interior rather than capped.
    points: [0, 1, 2, 3, 5].map((td) => ({
      input: td,
      output: unwrap("passerRating", reasonPasserRating(40, 20, 400, td, 0)),
    })),
  },
  {
    name: "passerRating:interceptions",
    hypothesis: "more interceptions means a lower passer rating",
    shape: "monotonic_down",
    points: [0, 1, 2, 4].map((i) => ({
      input: i,
      output: unwrap("passerRating", reasonPasserRating(40, 20, 400, 2, i)),
    })),
  },
  {
    name: "coverProbability:spread",
    hypothesis: "a steeper line is harder to cover",
    shape: "monotonic_down",
    points: [-7, -3, 0, 3, 7].map((s) => ({
      input: s,
      output: unwrap("coverProbability", reasonCoverProbability(s, 0, 14)),
    })),
  },
  {
    name: "coverProbability:marginSd",
    hypothesis: "more uncertainty pulls the estimate toward even",
    shape: "monotonic_down",
    points: [1, 2, 5, 10, 20].map((sd) => ({
      input: sd,
      output: unwrap("coverProbability", reasonCoverProbability(-3, 0, sd)),
    })),
  },
  {
    name: "generalizedPoisson:lambda",
    hypothesis: "a higher rate lowers the zero-count probability",
    shape: "monotonic_down",
    points: [0.5, 1, 2, 3, 4].map((l) => ({
      input: l,
      output: unwrap("generalizedPoisson", reasonGeneralizedPoisson(0, 0, l)),
    })),
  },
  {
    name: "kellyLogGrowth:winProb",
    hypothesis: "a likelier win grows the log-optimal stake",
    shape: "monotonic_up",
    points: [0.45, 0.5, 0.55, 0.6, 0.7].map((p) => ({
      input: p,
      output: unwrap("kelly", reasonKellyLogGrowth(0.05, [{ x: 1, p }, { x: -1, p: 1 - p }])),
    })),
  },
  {
    name: "kellyLogGrowth:stake",
    hypothesis: "log-growth peaks at the Kelly stake, then overbets",
    shape: "single_peak",
    // Peak at f≈0.1 for p=0.55; overbetting past it is negative growth.
    points: [0, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5].map((f) => ({
      input: f,
      output: unwrap("kelly", reasonKellyLogGrowth(f, [
        { x: 1, p: 0.55 },
        { x: -1, p: 0.45 },
      ])),
    })),
  },
  {
    name: "robustKelly:winProb",
    hypothesis: "sizing stays flat until the edge clears the uncertainty radius",
    shape: "monotonic_up",
    // pLo = p − 0.05; no stake until worst-case growth turns positive.
    // The p<0.56 plateau is the robust set doing its job.
    points: [0.5, 0.54, 0.56, 0.58, 0.6, 0.65, 0.7].map((p) => ({
      input: p,
      output: unwrap("robustKelly", reasonRobustKelly(p, 2)),
      boundary: p < 0.56,
    })),
  },
  {
    name: "robustKelly:odds",
    hypothesis: "better price earns a larger robust stake",
    shape: "monotonic_up",
    // Below ~1.43 breakeven the robust set never turns positive;
    // fractionalCap=0.25 flattens the top end.
    points: [1.2, 1.43, 1.5, 1.6, 2, 3].map((o) => ({
      input: o,
      output: unwrap("robustKelly", reasonRobustKelly(0.7, o)),
      boundary: o <= 1.5 || o >= 2,
    })),
  },
  {
    name: "cadence:edgeMean",
    hypothesis: "a bigger edge permits faster restaking, up to the cap",
    shape: "monotonic_up",
    points: [0.001, 0.005, 0.01, 0.02, 0.03].map((e) => ({
      input: e,
      output: unwrap("cadence", reasonCadence(e, 0.01, 0.001, 5)),
      boundary: e >= 0.02,
    })),
  },
  {
    name: "cadence:edgeVariance",
    hypothesis: "a noisier edge throttles cadence to a full stop",
    shape: "monotonic_down",
    points: [1e-6, 0.0001, 0.001, 0.01, 0.05, 0.1, 1].map((v) => ({
      input: v,
      output: unwrap("cadence", reasonCadence(0.05, v, 0.001, 5)),
    })),
  },
  {
    name: "cadence:restakeCost",
    hypothesis: "a costlier restake throttles cadence to a full stop",
    shape: "monotonic_down",
    points: [0, 0.0001, 0.001, 0.005, 0.01, 0.1].map((c) => ({
      input: c,
      output: unwrap("cadence", reasonCadence(0.05, 0.01, c, 5)),
    })),
  },
  {
    name: "neutralize:luckAdjustment",
    hypothesis: "the luck stripped from a fumble grows with the original EPA",
    shape: "monotonic_down",
    // A recovered-own fumble neutralizes EVERY EPA to the same expected
    // value (0.05), so `neutralizedEpa` is a designed constant here.
    // The responsive channel is `adjustment` = removed − original,
    // which falls monotonically as the original EPA rises.
    points: [-1, -0.5, 0, 0.4, 0.9, 1.5].map((e) => ({
      input: e,
      output: neutralizationAdjustment({ epa: e, fumble: true, fumbleRecoveredByOwnTeam: true }),
    })),
  },
  {
    name: "neutralize:skillEpa",
    hypothesis: "EPA on a luck-free play passes through untouched",
    shape: "monotonic_up",
    points: [-1, -0.5, 0, 0.5, 1].map((e) => ({
      input: e,
      output: neutralized({ epa: e }),
    })),
  },
  {
    name: "neutralize:skillAdjustment",
    hypothesis: "a luck-free play has zero luck removed, whatever its EPA",
    shape: "monotonic_up",
    // Declares the constant channel explicitly rather than leaving a
    // reader to wonder why `neutralize:luckEpa` was measured elsewhere.
    // Span is exactly 0 — the honest statement of "no luck here".
    points: [-1, 0, 1].map((e) => ({
      input: e,
      output: neutralizationAdjustment({ epa: e }),
      boundary: true,
    })),
  },
  {
    name: "drawdownRisk:phi",
    hypothesis: "persistent correlation widens the drawdown frontier",
    shape: "monotonic_up",
    points: [0, 0.1, 0.3, 0.5, 0.9].map((phi) => ({
      input: phi,
      output: unwrap("drawdown", reasonDrawdownRisk(
        [phi],
        [[-0.05, -0.05], [-0.03, -0.03]],
        200,
        42,
      )),
    })),
  },
];

const sweepResults: readonly SweepResult[] = SWEEPS.map(evaluateSweep);

describe("1. responsiveness — every swept axis traces its declared shape", () => {
  it("measured at least a dozen independent axes", () => {
    expect(sweepResults.length).toBeGreaterThanOrEqual(12);
  });

  it("no axis is INERT — the spine moves for every input that should move it", () => {
    const inert = sweepResults.filter((r) => r.verdict === "INERT");
    expect(
      inert.map((r) => r.name),
      "these axes produced a constant output — the stub signature",
    ).toEqual([]);
  });

  it("no axis violates its declared response shape", () => {
    const bad = sweepResults.filter((r) => r.verdict === "SHAPE_VIOLATION");
    expect(
      bad.map((r) => `${r.name} (span=${r.span})`),
      "the spine moved, but in the wrong direction or at the wrong turning point",
    ).toEqual([]);
  });

  it("every responsive axis clears a non-trivial span", () => {
    // Guards against a technically-moving but effectively-constant axis.
    // Declared constants are exempt — they are flat BY DESIGN and are
    // asserted separately so they cannot be confused with a stub.
    const weak = sweepResults.filter(
      (r) => r.span < 1e-3 && r.verdict !== "DECLARED_CONSTANT",
    );
    expect(weak.map((r) => `${r.name} span=${r.span}`)).toEqual([]);
  });

  it("flat axes are declared, so a stub cannot hide behind them", () => {
    // Every zero-span sweep must be an explicitly declared constant.
    // This is what separates "documented" from "nobody noticed".
    const undeclared = sweepResults.filter(
      (r) => r.span === 0 && r.verdict !== "DECLARED_CONSTANT",
    );
    expect(undeclared.map((r) => r.name)).toEqual([]);
    // And the declared set is small enough to stay honest.
    const declared = sweepResults.filter((r) => r.verdict === "DECLARED_CONSTANT");
    expect(declared.length).toBeLessThanOrEqual(2);
  });

  it("measures both a lucky channel and a luck-free channel on the same axis", () => {
    // The same EPA axis, read through two selections: a caught fumble
    // has its luck stripped (adjustment moves), a clean play does not
    // (adjustment is pinned at zero). Both are measured, neither hidden.
    const luck = sweepResults.find((r) => r.name === "neutralize:luckAdjustment")!;
    const skill = sweepResults.find((r) => r.name === "neutralize:skillAdjustment")!;
    expect(luck.verdict).toBe("SHAPE_OK");
    expect(luck.span).toBeGreaterThan(1);
    expect(skill.verdict).toBe("DECLARED_CONSTANT");
    expect(skill.span).toBe(0);
  });

  it("every sweep reports its measurement", () => {
    for (const r of sweepResults) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.normalizedSpan)).toBe(true);
      expect(Number.isFinite(r.meanAbsStep)).toBe(true);
    }
    expect(formatSweepLines(sweepResults).length).toBe(sweepResults.length);
  });
});

// ── 2. Selection-awareness ─────────────────────────────────────────────────

describe("2. selection-awareness — identical magnitude, different selection", () => {
  const selections: readonly SelectionResult[] = [
    // The purest case in the codebase: identical EPA, and the answer
    // diverges purely because of WHICH event the engine selected.
    evaluateSelection<Partial<PlayInput>>({
      name: "neutralize:0.9epa fumble-vs-tippedINT",
      hypothesis: "luck events are neutralized, skill events are not",
      heldConstant: "originalEpa = 0.9, playType, gameId",
      selected: { epa: 0.9, fumble: true, fumbleRecoveredByOwnTeam: true },
      rejected: { epa: 0.9, interception: true, tippedInterception: true },
      read: neutralized,
    }),
    // Same EPA, same magnitude: a made FG is skill, a missed one is luck.
    evaluateSelection<Partial<PlayInput>>({
      name: "neutralize:0.9epa made-vs-missedFG",
      hypothesis: "a made kick is skill; a miss is luck",
      heldConstant: "originalEpa = 0.9, distance = 40, fieldGoal = true",
      selected: { epa: 0.9, fieldGoal: true, fieldGoalMade: true, fieldGoalDistance: 40 },
      rejected: { epa: 0.9, fieldGoal: true, fieldGoalMade: false, fieldGoalDistance: 40 },
      read: neutralized,
    }),
    // An untipped INT is a decision; a tipped one is a bounce. Same EPA.
    evaluateSelection<Partial<PlayInput>>({
      name: "neutralize:0.9epa untipped-vs-tippedINT",
      hypothesis: "a tipped interception is luck, an untipped one is skill",
      heldConstant: "originalEpa = 0.9, interception = true",
      selected: { epa: 0.9, interception: true, tippedInterception: false },
      rejected: { epa: 0.9, interception: true, tippedInterception: true },
      read: neutralized,
    }),
    // Injury selection at identical snap share and role.
    evaluateSelection<PlayerRoleContext>({
      name: "anytimeTd:HEALTHY-vs-OUT",
      hypothesis: "availability is selected on, not averaged in",
      heldConstant: "position, snapShare, redZoneShare, usageShare, oppTdRateAllowed",
      selected: tdContext({ injuryStatus: "HEALTHY" }),
      rejected: tdContext({ injuryStatus: "OUT" }),
      read: tdProbability,
    }),
    // Positional selection at identical role features.
    evaluateSelection<PlayerRoleContext>({
      name: "anytimeTd:RB-vs-QB",
      hypothesis: "position is selected on, not averaged in",
      heldConstant: "injuryStatus, snapShare, redZoneShare, usageShare, oppTdRateAllowed",
      selected: tdContext({ position: "RB" }),
      rejected: tdContext({ position: "QB" }),
      read: tdProbability,
    }),
    // The strongest one: handed the SAME original EPA (0.9), the engine
    // must answer differently based only on whether that EPA was earned
    // or caught. Magnitude identical; selection is the only input.
    evaluateSelection<"luck-caught" | "luck-earned">({
      name: "deserveToWin:0.9EPA luck-vs-earned",
      hypothesis: "a caught 0.9 and an earned 0.9 are told apart",
      heldConstant: "originalEpa = 0.9, playType, gameId — only the fumble differs",
      selected: "luck-caught",
      rejected: "luck-earned",
      read: (arm) => {
        const r = reasonDeserveToWin({
          gameId: "g1",
          homeTeam: "KC",
          awayTeam: "BUF",
          plays: [
            arm === "luck-caught"
              ? play({ epa: 0.9, fumble: true, fumbleRecoveredByOwnTeam: true })
              : play({ epa: 0.9 }),
          ],
        });
        return unwrap("deserveToWin", r).pHomeWin;
      },
    }),
    // Same test from the other side: an away team's unlucky −0.9 is
    // discounted, so home wins MORE than a clean −0.9 would imply.
    evaluateSelection<"luck-caught" | "luck-earned">({
      name: "deserveToWin:-0.9EPA awayLuck-vs-earned",
      hypothesis: "opponent luck is discounted symmetrically",
      heldConstant: "originalEpa = −0.9 — only the fumble differs",
      selected: "luck-caught",
      rejected: "luck-earned",
      read: (arm) => {
        const r = reasonDeserveToWin({
          gameId: "g1",
          homeTeam: "KC",
          awayTeam: "BUF",
          plays: [
            arm === "luck-caught"
              ? play({ epa: -0.9, fumble: true, fumbleRecoveredByOwnTeam: false })
              : play({ epa: -0.9 }),
          ],
        });
        return unwrap("deserveToWin", r).pHomeWin;
      },
    }),
  ];

  it("measured at least six selection pairs", () => {
    expect(selections.length).toBeGreaterThanOrEqual(6);
  });

  it("every selection pair discriminates — the spine reads WHICH, not just how much", () => {
    const blind = selections.filter((s) => !s.discriminated);
    expect(
      blind.map((s) => `${s.name} (gap=${s.gap})`),
      "identical magnitude produced an identical answer — this is an averager, not a reasoner",
    ).toEqual([]);
  });

  it("every discriminating gap clears a non-trivial distance", () => {
    const weak = selections.filter((s) => s.gap < 1e-6);
    expect(weak.map((s) => `${s.name} gap=${s.gap}`)).toEqual([]);
  });

  it("a caught 0.9 is discounted below an earned 0.9", () => {
    // Directional: identical original EPA (0.9), but the luck-caught arm
    // must move the win estimate TOWARD even. Both of these failed loudly
    // during authoring when the probe held the wrong side constant and when
    // the direction was inverted — which is the point of asserting the
    // measured numbers, not just the difference.
    const pair = selections.find((s) => s.name === "deserveToWin:0.9EPA luck-vs-earned")!;
    expect(pair.selectedReading).toBeLessThan(pair.rejectedReading);
    expect(pair.selectedReading).toBeCloseTo(0.5123, 4);
    expect(pair.rejectedReading).toBeCloseTo(0.8203, 4);
    // Discounted toward even, not all the way to it.
    expect(pair.selectedReading).toBeGreaterThan(0.5);
  });

  it("opponent luck is discounted symmetrically", () => {
    // Away team's caught −0.9: home should win MORE than when the away
    // team cleanly earned the −0.9.
    const pair = selections.find((s) => s.name === "deserveToWin:-0.9EPA awayLuck-vs-earned")!;
    expect(pair.selectedReading).toBeGreaterThan(pair.rejectedReading);
  });
});

// ── 3. Fail-closed selection is itself a measured behaviour ─────────────────

describe("3. selecting 'no signal' is a decision, not a silent default", () => {
  it("a missing FG distance fails closed rather than returning a default", () => {
    expect(reasonFgMake(null).ok).toBe(false);
  });

  it("a missing snap share fails closed rather than imputing a league average", () => {
    const r = reasonAnytimeTd(
      tdContext({ rolling: { ...tdContext().rolling, snapShare: null } }),
    );
    expect(r.ok).toBe(false);
  });

  it("a missing EPA stays null rather than being neutralized to a guess", () => {
    const r = reasonNeutralizePlay(play({ epa: null }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.neutralizedEpa).toBeNull();
      expect(r.data.originalEpa).toBeNull();
    }
  });

  it("out-of-domain distances are rejected at both edges", () => {
    expect(reasonFgMake(10, 0, true).ok).toBe(false);
    expect(reasonFgMake(80, 0, true).ok).toBe(false);
  });

  it("degenerate decision inputs fail closed rather than sizing to zero", () => {
    expect(reasonKellyLogGrowth(0, []).ok).toBe(false);
    expect(reasonRobustKelly(0, 2).ok).toBe(false);
    expect(reasonRobustKelly(1, 2).ok).toBe(false);
    expect(reasonRobustKelly(0.6, 1).ok).toBe(false);
  });

  it("a deterministic input yields a deterministic answer", () => {
    const args = [[0.5, 0.5], [[0.05, -0.02], [-0.01, 0.03]], 30, 42] as const;
    const a = reasonDrawdownRisk(...args);
    const b = reasonDrawdownRisk(...args);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.data).toBe(b.data);
  });
});

// ── 4. The measured report ──────────────────────────────────────────────────

describe("4. the report is a measurement, not a claim", () => {
  function selectionsForReport(): readonly SelectionResult[] {
    const lucky = reasonDeserveToWin({
      gameId: "g1",
      homeTeam: "KC",
      awayTeam: "BUF",
      plays: [play({ epa: 0.9, fumble: true, fumbleRecoveredByOwnTeam: true })],
    });
    const clean = reasonDeserveToWin({
      gameId: "g1",
      homeTeam: "KC",
      awayTeam: "BUF",
      plays: [play({ epa: 0.9 })],
    });
    return [
      evaluateSelection({
        name: "report:deserveToWin luck-vs-skill",
        hypothesis: "luck is discounted at identical original EPA",
        heldConstant: "originalEpa = 0.9",
        selected: 0,
        rejected: 1,
        read: (arm) => (arm === 0 ? unwrap("lucky", lucky) : unwrap("clean", clean)).pHomeWin,
      }),
    ];
  }

  const report = buildReport(sweepResults, selectionsForReport());

  it("reports zero inert axes and zero shape violations", () => {
    expect(report.inert).toBe(0);
    expect(report.violations).toBe(0);
  });

  it("accounts for every sweep in exactly one bucket", () => {
    // A report that silently drops a sweep is worse than no report:
    // it reads as coverage while measuring less.
    expect(report.responsive + report.declaredConstants + report.inert + report.violations).toBe(
      sweepResults.length,
    );
  });

  it("reports the overwhelming majority of axes as responsive", () => {
    expect(report.responsive).toBeGreaterThanOrEqual(sweepResults.length - 1);
    expect(report.responsive).toBeGreaterThanOrEqual(20);
  });

  it("every reported selection discriminated", () => {
    expect(report.discriminating).toBe(report.selections.length);
  });

  it("prints one audit line per sweep", () => {
    // The report is only evidence if a human can read the measurements.
    const lines = formatSweepLines(sweepResults);
    expect(lines.length).toBe(sweepResults.length);
    for (const line of lines) expect(line).toMatch(/SHAPE_OK|INERT|DECLARED_CONSTANT|SHAPE_VIOLATION/);
  });

  it("the surface registry and the responsiveness suite cover the same engine", () => {
    // Guards against the suite silently going stale if the surface
    // grows a reasoning entry point with no responsiveness measurement.
    const surfaceNames = Object.keys(REASONING_SURFACE);
    expect(surfaceNames.length).toBeGreaterThanOrEqual(20);
    const sweptSurface = [
      "coverProbability",
      "fgMake",
      "generalizedPoisson",
      "passerRating",
      "anytimeTd",
      "neutralizePlay",
      "deserveToWin",
      "kellyLogGrowth",
      "robustKelly",
      "cadence",
      "drawdownRisk",
    ];
    for (const name of sweptSurface) {
      expect(surfaceNames, `surface entry ${name} missing`).toContain(name);
    }
  });
});