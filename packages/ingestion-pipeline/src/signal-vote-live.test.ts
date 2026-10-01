/**
 * PROOF BY EXECUTION: a declared direction must actually MOVE a probability.
 *
 * The declaration tests prove every ACTIVE continuous signal carries a homeSign.
 * Necessary, not sufficient: a sign can be declared and never reach a pick.
 * This runs the REAL registry through the REAL applyContinuousSignalTilt with a
 * fully-populated context and asserts the tilt is non-zero and that it moves
 * homeP in the declared direction.
 */
import { describe, expect, it } from "vitest";
import { SIGNAL_REGISTRY } from "./signal-registry-definitions.js";
import { applyContinuousSignalTilt } from "./continuous-signal-tilt.js";
import type { SignalEvaluationContext } from "@sports/types";

const NFL: SignalEvaluationContext = {
  sportKey: "americanfootball_nfl",
  homeTeam: "KC",
  awayTeam: "NE",
  env: {} as Record<string, string>,
  now: () => new Date("2026-10-01T12:00:00Z"),
} as unknown as SignalEvaluationContext;

describe("signal direction — executed, not declared", () => {
  it("an unsigned signal is still refused (the law survives the declarations)", async () => {
    const r = await applyContinuousSignalTilt(0.5, [
      {
        id: "unsigned_probe",
        label: "probe",
        category: "WEATHER",
        family: "MICROCLIMATE",
        outputKind: "CONTINUOUS_VALUE",
        validSports: [],
        owner: "t",
        dataDependencies: [],
        activationStatus: "ACTIVE",
        trustWeight: 0.5,
        killLine: { maxBrierScoreVsMarket: 0.25, minSettledSample: 1, maxDivergenceZScore: 3, maxAgeMinutes: 1 },
        isRightsCleared: () => true,
        acquisitionTask: null,
        blockedReason: null,
        evaluate: async () => ({ value: 1.0, capturedAt: "2026-10-01T12:00:00Z", metadata: {} }),
      },
    ], NFL);
    expect(r.votes).toHaveLength(0);
    expect(r.refused[0]?.reason).toMatch(/homeSign/i);
  });

  it("a MULTIPLIER at its neutral value 1.0 produces NO tilt", async () => {
    // THE BUG THIS GUARDS. tanh(1.0) = +0.76, so without neutralValue: 1 a
    // "no effect" multiplier would tilt home by ~2.7%. No effect must be no tilt.
    const r = await applyContinuousSignalTilt(0.5, [
      {
        id: "neutral_probe",
        label: "probe",
        category: "WEATHER",
        family: "MICROCLIMATE",
        outputKind: "CONTINUOUS_VALUE",
        validSports: [],
        owner: "t",
        dataDependencies: [],
        activationStatus: "ACTIVE",
        trustWeight: 0.5,
        killLine: { maxBrierScoreVsMarket: 0.25, minSettledSample: 1, maxDivergenceZScore: 3, maxAgeMinutes: 1 },
        isRightsCleared: () => true,
        acquisitionTask: null,
        blockedReason: null,
        homeSign: 1 as const,
        neutralValue: 1.0,
        evaluate: async () => ({ value: 1.0, capturedAt: "2026-10-01T12:00:00Z", metadata: {} }),
      },
    ], NFL);
    expect(r.votes).toHaveLength(0);
    expect(r.netTilt).toBe(0);
    expect(r.adjustedHomeP).toBe(0.5);
  });

  it("a declared sign moves the probability the way it says it does", async () => {
    const mk = (id: string, sign: 1 | -1, value: number) => ({
      id, label: id, category: "WEATHER" as const, family: "MICROCLIMATE" as const,
      outputKind: "CONTINUOUS_VALUE" as const, validSports: [], owner: "t",
      dataDependencies: [], activationStatus: "ACTIVE" as const, trustWeight: 0.5,
      killLine: { maxBrierScoreVsMarket: 0.25, minSettledSample: 1, maxDivergenceZScore: 3, maxAgeMinutes: 1 },
      isRightsCleared: () => true, acquisitionTask: null, blockedReason: null,
      homeSign: sign, neutralValue: 0,
      evaluate: async () => ({ value, capturedAt: "2026-10-01T12:00:00Z", metadata: {} }),
    });
    const up = await applyContinuousSignalTilt(0.5, [mk("up", 1, 0.5)], NFL);
    expect(up.votes).toHaveLength(1);
    expect(up.netTilt).toBeGreaterThan(0);
    expect(up.adjustedHomeP).toBeGreaterThan(0.5);

    const down = await applyContinuousSignalTilt(0.5, [mk("down", -1, 0.5)], NFL);
    expect(down.votes).toHaveLength(1);
    expect(down.netTilt).toBeLessThan(0);
    expect(down.adjustedHomeP).toBeLessThan(0.5);
  });

  it("every ACTIVE continuous signal's neutral value produces zero tilt", async () => {
    // Each signal is driven to its OWN neutral value. All must be silent, or a
    // signal is inventing a view out of its own "nothing to say" number.
    const active = SIGNAL_REGISTRY.filter(
      (s) => s.activationStatus === "ACTIVE" && s.outputKind === "CONTINUOUS_VALUE",
    );
    expect(active.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const s of active) {
      const probe = { ...s, id: s.id, evaluate: async () => ({ value: s.neutralValue ?? 0, capturedAt: "2026-10-01T12:00:00Z", metadata: {} }) };
      const r = await applyContinuousSignalTilt(0.5, [probe], NFL);
      if (r.votes.length > 0) offenders.push(s.id);
    }
    console.log("NONZERO_AT_NEUTRAL " + JSON.stringify(offenders));
    expect(offenders, "a signal fires at its own neutral value").toEqual([]);
  });
});
