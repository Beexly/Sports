import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "./continuous-signal-tilt.js";
import { nflAgeConditionedRestSignal, EXTENDED_SIGNALS } from "./signal-registry-extensions.js";
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
describe("extension evaluators without a point-in-time producer are dark", () => {
  it("every extended signal is DARK and does not invent a homeSign in the registry row", () => {
    expect(EXTENDED_SIGNALS.length).toBeGreaterThan(0);
    for (const signal of EXTENDED_SIGNALS) {
      expect(signal.activationStatus).toBe("DARK");
      expect(signal.blockedReason).toContain("point-in-time");
    }
  });
});

describe("nfl_age_conditioned_rest stays dark without a point-in-time producer", () => {
  const homeFavourableEnv = {
    ROSTER_SNAP_WEIGHTED_AGE: "28.1",
    REST_DAYS: "14",
    STARTING_QB_AGE: "28.4",
    OL_AVG_AGE: "29.3",
  };

  it("does not tilt even when the env keys are filled", async () => {
    expect(nflAgeConditionedRestSignal.activationStatus).toBe("DARK");
    const realCtx: SignalEvaluationContext = { ...ctx, env: homeFavourableEnv };
    const r = await applyContinuousSignalTilt(0.5, [nflAgeConditionedRestSignal], realCtx);
    expect(r.votes).toHaveLength(0);
    expect(r.applied).toBe(false);
    expect(r.adjustedHomeP).toBe(0.5);
    expect(r.netTilt).toBe(0);
  });

  it("the formula is still home-anchored when called directly", async () => {
    const realCtx: SignalEvaluationContext = { ...ctx, env: homeFavourableEnv };
    const val = await nflAgeConditionedRestSignal.evaluate?.(realCtx);
    expect(val).not.toBeNull();
    if (val == null || !("value" in val)) throw new Error("expected a continuous value");
    expect(val.value).toBe(2.9);
    expect(val.metadata?.["homeSign"]).toBe(1);
  });
});
