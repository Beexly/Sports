import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "./continuous-signal-tilt.js";
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
    evaluate: () => ({ value: 1.0, capturedAt: new Date().toISOString() }),
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
      [contSignal({ evaluate: () => ({ value: -1.5, capturedAt: new Date().toISOString() }) })],
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

    const heavy = contSignal({ trustWeight: 1.0, evaluate: () => ({ value: 2, capturedAt: new Date().toISOString() }) });
    const light = contSignal({ trustWeight: 0.05, evaluate: () => ({ value: 2, capturedAt: new Date().toISOString() }), id: "light" });
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
  });
});
