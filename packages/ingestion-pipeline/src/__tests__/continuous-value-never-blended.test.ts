/**
 * A CONTINUOUS_VALUE signal must never reach the independent blend as a win
 * probability.
 *
 * This is a guard against a specific, plausible future edit, not a hypothetical.
 * `nflWindElasticitySignal` returns `{ value: passingYardsMultiplier }`. Before
 * `SignalOutputKind` admitted CONTINUOUS_VALUE, that evaluator did not satisfy
 * `SignalEvaluator`, and the quickest way to make the compiler stop complaining
 * was to rename `value` to `homeFairProb`. That single rename would publish a
 * 0.92 yards multiplier as a 92% home win probability on a paying customer's
 * board. These tests fail if anyone does it.
 *
 * The rule has exactly ONE spelling, `isSignalProbabilityValue` in
 * @sports/types, which the runner imports. Both halves are pinned here: the
 * predicate's own boundaries, and the runner's behaviour through it.
 */
import { describe, expect, it, vi } from "vitest";
import { isSignalProbabilityValue, type SignalDefinition } from "@sports/types";

const DEFAULT_KILL_LINE = {
  maxBrierScoreVsMarket: 0.25,
  minSettledSample: 100,
  maxDivergenceZScore: 3,
  maxAgeMinutes: 360,
} as const;

function signal(over: Partial<SignalDefinition> & Pick<SignalDefinition, "id">): SignalDefinition {
  return {
    label: over.id,
    category: "TEAM_RATES",
    family: "EFFICIENCY",
    outputKind: "2WAY_PROBABILITY",
    validSports: [],
    owner: "test",
    dataDependencies: [],
    activationStatus: "ACTIVE",
    trustWeight: 0.5,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    ...over,
  } as SignalDefinition;
}

const CAPTURED_AT = "2026-09-19T00:00:00.000Z";

vi.mock("../signal-registry-definitions.js", () => ({
  SIGNAL_REGISTRY: [
    signal({
      id: "probability_signal",
      evaluate: () => ({ homeFairProb: 0.61, awayFairProb: 0.39, capturedAt: CAPTURED_AT }),
    }),
    signal({
      id: "continuous_signal",
      outputKind: "CONTINUOUS_VALUE",
      // The exact shape nflWindElasticitySignal returns today.
      evaluate: () => ({ value: 0.92, capturedAt: CAPTURED_AT }),
    }),
  ],
}));

const { runSignalRegistry } = await import("../signal-registry-runner.js");

const CTX = {
  sportKey: "americanfootball_nfl",
  homeTeam: "Kansas City Chiefs",
  awayTeam: "Baltimore Ravens",
  commenceTime: new Date("2026-09-19T00:20:00.000Z"),
  now: () => new Date(CAPTURED_AT),
  skipNetworkIndependents: true,
};

describe("isSignalProbabilityValue", () => {
  it("accepts a well-formed probability pair", () => {
    expect(isSignalProbabilityValue({ homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: CAPTURED_AT })).toBe(true);
  });

  it("REFUSES a continuous scalar, which is the whole point of the predicate", () => {
    expect(isSignalProbabilityValue({ value: 0.92, capturedAt: CAPTURED_AT })).toBe(false);
  });

  it("treats absence as refusal, never as a default", () => {
    expect(isSignalProbabilityValue(null)).toBe(false);
    expect(isSignalProbabilityValue(undefined)).toBe(false);
  });

  it("refuses non-finite and out-of-range probabilities rather than clamping them", () => {
    const cases = [
      { homeFairProb: Number.NaN, awayFairProb: 0.4 },
      { homeFairProb: Number.POSITIVE_INFINITY, awayFairProb: 0.4 },
      { homeFairProb: 1.01, awayFairProb: 0.4 },
      { homeFairProb: -0.01, awayFairProb: 0.4 },
      { homeFairProb: 0.6, awayFairProb: 1.5 },
    ];
    for (const c of cases) {
      expect(isSignalProbabilityValue({ ...c, capturedAt: CAPTURED_AT })).toBe(false);
    }
  });

  it("accepts the closed interval endpoints, so a legitimate 0 or 1 is not silently dropped", () => {
    expect(isSignalProbabilityValue({ homeFairProb: 0, awayFairProb: 1, capturedAt: CAPTURED_AT })).toBe(true);
  });
});

describe("runSignalRegistry drops continuous signals", () => {
  it("blends the probability signal and drops the continuous one", async () => {
    const out = await runSignalRegistry(CTX);
    expect(out.map((r) => r.source)).toEqual(["probability_signal"]);
  });

  it("never emits a row whose probability came from a scalar `value` field", async () => {
    const out = await runSignalRegistry(CTX);
    // 0.92 is the continuous signal's scalar. If it ever appears as a
    // probability, a yards multiplier has been published as a win rate.
    for (const row of out) {
      expect(row.homeFairProb).not.toBe(0.92);
      expect(row.awayFairProb).not.toBe(0.92);
    }
  });
});
