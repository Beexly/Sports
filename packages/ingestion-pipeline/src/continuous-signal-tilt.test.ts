import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "./continuous-signal-tilt.js";
import { nflAgeConditionedRestSignal } from "./signal-registry-extensions.js";
import type { SignalDefinition, SignalEvaluationContext } from "@sports/types";

const ctx: SignalEvaluationContext = {
  sportKey: "americanfootball_nfl",
  homeTeam: "KC",
  awayTeam: "BUF",
  commenceTime: new Date("2026-09-25T20:00:00Z"),
  env: {},
  now: () => new Date("2026-09-25T12:00:00Z"),
};

function contSignal(over: Partial<SignalDefinition> = {}): SignalDefinition {
  return {
    id: "test_cont",
    label: "Test continuous",
    category: "TEAM_RATES",
    family: "EFFICIENCY",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "test",
    dataDependencies: [],
    activationStatus: "ACTIVE",
    trustWeight: 0.2,
    killLine: {
      maxBrierScoreVsMarket: 0.25,
      minSettledSample: 100,
      maxDivergenceZScore: 3,
      maxAgeMinutes: 120,
    },
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    evaluate: () => ({ value: 1.0, capturedAt: new Date().toISOString(), metadata: { homeSign: 1 } }),
    ...over,
  };
}

describe("applyContinuousSignalTilt", () => {
  it("tilts homeP in the direction of positive signals", async () => {
    const r = await applyContinuousSignalTilt(0.55, [contSignal()], ctx);
    expect(r.applied).toBe(true);
    expect(r.adjustedHomeP).toBeGreaterThan(0.55);
    expect(r.votes).toHaveLength(1);
    expect(r.netTilt).toBeGreaterThan(0);
  });

  it("tilts away when signals are negative", async () => {
    const r = await applyContinuousSignalTilt(
      0.55,
      [contSignal({ evaluate: () => ({ value: -1.5, capturedAt: new Date().toISOString(), metadata: { homeSign: 1 } }) })],
      ctx,
    );
    expect(r.applied).toBe(true);
    expect(r.adjustedHomeP).toBeLessThan(0.55);
    expect(r.netTilt).toBeLessThan(0);
  });

  it("does not apply when all signals abstain", async () => {
    const r = await applyContinuousSignalTilt(
      0.55,
      [contSignal({ evaluate: () => null })],
      ctx,
    );
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(0.55);
  });

  it("skips probability-kind signals", async () => {
    const r = await applyContinuousSignalTilt(
      0.55,
      [
        contSignal({
          outputKind: "2WAY_PROBABILITY",
          evaluate: () => ({
            homeFairProb: 0.8,
            awayFairProb: 0.2,
            capturedAt: new Date().toISOString(),
          }),
        }),
      ],
      ctx,
    );
    expect(r.applied).toBe(false);
  });

  it("respects trustWeight and rights gates", async () => {
    const noRights = contSignal({ isRightsCleared: () => false });
    const r1 = await applyContinuousSignalTilt(0.55, [noRights], ctx);
    expect(r1.applied).toBe(false);

    const heavy = contSignal({ trustWeight: 1.0, evaluate: () => ({ value: 2, capturedAt: new Date().toISOString(), metadata: { homeSign: 1 } }) });
    const light = contSignal({ trustWeight: 0.05, evaluate: () => ({ value: 2, capturedAt: new Date().toISOString(), metadata: { homeSign: 1 } }), id: "light" });
    const rHeavy = await applyContinuousSignalTilt(0.55, [heavy], ctx);
    const rLight = await applyContinuousSignalTilt(0.55, [light], ctx);
    expect(rHeavy.netTilt).toBeGreaterThan(rLight.netTilt);
  });

  it("never throws on a bad signal", async () => {
    const bad = contSignal({
      evaluate: () => {
        throw new Error("boom");
      },
    });
    const r = await applyContinuousSignalTilt(0.55, [bad], ctx);
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(0.55);
    expect(r.refused[0]?.reason).toContain("boom");
  });

  it("does not move homeP for an unsigned scalar", async () => {
    const r = await applyContinuousSignalTilt(
      0.55,
      [contSignal({ evaluate: () => ({ value: 1.0, capturedAt: new Date().toISOString() }) })],
      ctx,
    );
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(0.55);
    expect(r.refused[0]?.reason).toContain("unsigned");
  });

  it("does not clamp a home probability outside (0, 1)", async () => {
    const r = await applyContinuousSignalTilt(1.4, [contSignal()], ctx);
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(1.4);
    expect(r.refused[0]?.reason).toContain("not clamped");
  });
});

/**
 * nfl_age_conditioned_rest is the one registry continuous signal whose number
 * is genuinely home-anchored: evaluateAgeConditionedRest is handed ctx.homeTeam
 * and returns a spread-point margin adjustment for that team alone. These tests
 * exercise the REAL registry signal through the REAL tilt, so they prove the
 * wired homeSign actually moves homeP rather than merely being present.
 */
describe("nfl_age_conditioned_rest homeSign wiring", () => {
  // Veteran roster (>=27.3 snap-weighted age) off a full bye -> +2.45 base margin
  // points to ctx.homeTeam, plus the +0.45 veteran-trench bonus the producer
  // applies when OL avg age >= 29.0 and rest >= 10 (age-conditioned-rest.ts:108).
  // Same four env keys the wrapper reads.
  const homeFavourableEnv = {
    ROSTER_SNAP_WEIGHTED_AGE: "28.1",
    REST_DAYS: "14",
    STARTING_QB_AGE: "28.4",
    OL_AVG_AGE: "29.3",
  };

  it("tilts homeP UP when the real signal fires a positive home margin adjustment", async () => {
    const realCtx: SignalEvaluationContext = { ...ctx, env: homeFavourableEnv };
    const r = await applyContinuousSignalTilt(0.5, [nflAgeConditionedRestSignal], realCtx);

    // The producer is real: +2.90 margin points (2.45 base + 0.45 OL bonus),
    // not a hardcoded constant.
    expect(r.votes).toHaveLength(1);
    expect(r.votes[0].signalId).toBe("nfl_age_conditioned_rest");
    expect(r.votes[0].rawValue).toBe(2.9);
    expect(r.refused).toHaveLength(0);

    // Positive home margin adjustment must raise the home probability.
    expect(r.netTilt).toBeGreaterThan(0);
    expect(r.adjustedHomeP).toBeGreaterThan(0.5);
    expect(r.applied).toBe(true);
  });

  it("tilts homeP DOWN when the real signal fires a negative home margin adjustment", async () => {
    // Veteran roster on 4 days rest -> -2.85 margin points to ctx.homeTeam.
    const realCtx: SignalEvaluationContext = {
      ...ctx,
      env: { ...homeFavourableEnv, REST_DAYS: "4" },
    };
    const r = await applyContinuousSignalTilt(0.5, [nflAgeConditionedRestSignal], realCtx);

    expect(r.votes).toHaveLength(1);
    expect(r.votes[0].rawValue).toBe(-2.85);

    // Negative home margin adjustment must lower the home probability.
    expect(r.netTilt).toBeLessThan(0);
    expect(r.adjustedHomeP).toBeLessThan(0.5);
    expect(r.applied).toBe(true);
  });

  it("does not move homeP when the signal's inputs are absent", async () => {
    // No env keys at all: the wrapper fails closed and returns null.
    const emptyCtx: SignalEvaluationContext = { ...ctx, env: {} };
    const r = await applyContinuousSignalTilt(0.5, [nflAgeConditionedRestSignal], emptyCtx);

    expect(r.votes).toHaveLength(0);
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(0.5);
    expect(r.netTilt).toBe(0);
  });
});
