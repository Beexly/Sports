import { describe, it, expect } from "vitest";

import {
  validateParlayInput,
  runParlayAnalysis,
  PARLAY_MAX_LEGS,
  PARLAY_MIN_STAKE,
  PARLAY_MAX_STAKE,
  PARLAY_DEFAULT_STAKE,
  PARLAY_DEFAULT_RUIN_BETS,
  PARLAY_MAX_RUIN_BETS,
  PARLAY_DISCLAIMER,
  type ParlayAnalyzerInput,
} from "@/lib/lab/parlay-analyzer";

function baseInput(
  overrides: Partial<ParlayAnalyzerInput> = {},
): ParlayAnalyzerInput {
  return {
    legs: [
      { label: "Leg 1", americanOdds: -110, winProbability: null },
      { label: "Leg 2", americanOdds: -110, winProbability: null },
    ],
    stakeUnits: 1,
    correlation: 0,
    numBetsForRuin: 100,
    seed: 42,
    ...overrides,
  };
}

function valid(raw: unknown): ParlayAnalyzerInput {
  const res = validateParlayInput(raw);
  if ("error" in res) {
    throw new Error(`expected valid input, got error: ${res.error}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// validateParlayInput — bad bodies
// ---------------------------------------------------------------------------

describe("validateParlayInput — bad bodies", () => {
  it("rejects null", () => {
    expect(validateParlayInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
  });

  it("rejects a string", () => {
    expect(validateParlayInput("nope")).toHaveProperty("error");
  });

  it("rejects a number", () => {
    expect(validateParlayInput(42)).toHaveProperty("error");
  });

  it("rejects undefined", () => {
    expect(validateParlayInput(undefined)).toHaveProperty("error");
  });

  it("rejects a missing legs field", () => {
    expect(validateParlayInput({ stakeUnits: 1 })).toHaveProperty("error");
  });

  it("rejects legs that is not an array", () => {
    expect(validateParlayInput({ legs: "x" })).toHaveProperty("error");
  });

  it("rejects an empty legs array", () => {
    expect(validateParlayInput({ legs: [] })).toEqual({
      error: expect.stringContaining("non-empty"),
    });
  });

  it("rejects more than PARLAY_MAX_LEGS legs", () => {
    const legs = Array.from({ length: PARLAY_MAX_LEGS + 1 }, () => ({
      americanOdds: -110,
    }));
    expect(validateParlayInput({ legs })).toEqual({
      error: expect.stringContaining(`${PARLAY_MAX_LEGS}`),
    });
  });

  it("accepts exactly PARLAY_MAX_LEGS legs", () => {
    const legs = Array.from({ length: PARLAY_MAX_LEGS }, () => ({
      americanOdds: -110,
    }));
    expect(validateParlayInput({ legs })).not.toHaveProperty("error");
  });

  it("rejects a non-object leg entry", () => {
    expect(validateParlayInput({ legs: [123] })).toHaveProperty("error");
  });

  it("rejects a null leg entry", () => {
    expect(validateParlayInput({ legs: [null] })).toHaveProperty("error");
  });

  it("rejects a leg with neither odds nor probability", () => {
    expect(validateParlayInput({ legs: [{ label: "x" }] })).toEqual({
      error: expect.stringContaining("americanOdds or winProbability"),
    });
  });

  it("rejects a leg whose only odds value is 0 (treated as not provided)", () => {
    expect(
      validateParlayInput({ legs: [{ americanOdds: 0 }] }),
    ).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// validateParlayInput — leg parsing
// ---------------------------------------------------------------------------

describe("validateParlayInput — leg parsing", () => {
  it("accepts a leg priced by americanOdds", () => {
    const v = valid({ legs: [{ americanOdds: 150 }] });
    expect(v.legs[0]?.americanOdds).toBe(150);
    expect(v.legs[0]?.winProbability).toBeNull();
  });

  it("accepts a leg defined by winProbability only", () => {
    const v = valid({ legs: [{ winProbability: 0.6 }] });
    expect(v.legs[0]?.americanOdds).toBeNull();
    expect(v.legs[0]?.winProbability).toBeCloseTo(0.6, 6);
  });

  it("accepts a leg with both odds and probability", () => {
    const v = valid({ legs: [{ americanOdds: -120, winProbability: 0.58 }] });
    expect(v.legs[0]?.americanOdds).toBe(-120);
    expect(v.legs[0]?.winProbability).toBeCloseTo(0.58, 6);
  });

  it("parses numeric-string odds", () => {
    const v = valid({ legs: [{ americanOdds: "-110" }] });
    expect(v.legs[0]?.americanOdds).toBe(-110);
  });

  it("parses numeric-string probability", () => {
    const v = valid({ legs: [{ winProbability: "0.5" }] });
    expect(v.legs[0]?.winProbability).toBeCloseTo(0.5, 6);
  });

  it("defaults a missing label to 'Leg N'", () => {
    const v = valid({ legs: [{ americanOdds: -110 }, { americanOdds: 120 }] });
    expect(v.legs[0]?.label).toBe("Leg 1");
    expect(v.legs[1]?.label).toBe("Leg 2");
  });

  it("uses a supplied label", () => {
    const v = valid({ legs: [{ label: "Lakers ML", americanOdds: -150 }] });
    expect(v.legs[0]?.label).toBe("Lakers ML");
  });

  it("truncates an overlong label to 48 chars", () => {
    const long = "x".repeat(100);
    const v = valid({ legs: [{ label: long, americanOdds: -110 }] });
    expect(v.legs[0]?.label.length).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// validateParlayInput — clamps & defaults
// ---------------------------------------------------------------------------

describe("validateParlayInput — clamps & defaults", () => {
  it("clamps tiny american odds magnitude up to 100", () => {
    const v = valid({ legs: [{ americanOdds: 5 }] });
    expect(v.legs[0]?.americanOdds).toBe(100);
  });

  it("clamps small negative odds magnitude to -100", () => {
    const v = valid({ legs: [{ americanOdds: -5 }] });
    expect(v.legs[0]?.americanOdds).toBe(-100);
  });

  it("clamps a probability >= 1 to below 1", () => {
    const v = valid({ legs: [{ winProbability: 5 }] });
    const p = v.legs[0]?.winProbability ?? 0;
    expect(p).toBeLessThan(1);
    expect(p).toBeGreaterThan(0.99);
  });

  it("clamps a probability <= 0 to just above 0", () => {
    const v = valid({ legs: [{ winProbability: -1 }] });
    const p = v.legs[0]?.winProbability ?? 1;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.01);
  });

  it("defaults stakeUnits when absent", () => {
    const v = valid({ legs: [{ americanOdds: -110 }] });
    expect(v.stakeUnits).toBe(PARLAY_DEFAULT_STAKE);
  });

  it("clamps stakeUnits to the minimum", () => {
    const v = valid({ legs: [{ americanOdds: -110 }], stakeUnits: 0 });
    expect(v.stakeUnits).toBe(PARLAY_MIN_STAKE);
  });

  it("clamps stakeUnits to the maximum", () => {
    const v = valid({
      legs: [{ americanOdds: -110 }],
      stakeUnits: 999_999_999,
    });
    expect(v.stakeUnits).toBe(PARLAY_MAX_STAKE);
  });

  it("defaults correlation to 0 when absent", () => {
    const v = valid({ legs: [{ americanOdds: -110 }] });
    expect(v.correlation).toBe(0);
  });

  it("clamps correlation to [-1, 1]", () => {
    expect(valid({ legs: [{ americanOdds: -110 }], correlation: 5 }).correlation).toBe(1);
    expect(valid({ legs: [{ americanOdds: -110 }], correlation: -5 }).correlation).toBe(-1);
  });

  it("defaults numBetsForRuin when absent", () => {
    const v = valid({ legs: [{ americanOdds: -110 }] });
    expect(v.numBetsForRuin).toBe(PARLAY_DEFAULT_RUIN_BETS);
  });

  it("rounds and clamps numBetsForRuin", () => {
    const v = valid({
      legs: [{ americanOdds: -110 }],
      numBetsForRuin: 10_000_000,
    });
    expect(v.numBetsForRuin).toBe(PARLAY_MAX_RUIN_BETS);
  });

  it("defaults seed to null", () => {
    const v = valid({ legs: [{ americanOdds: -110 }] });
    expect(v.seed).toBeNull();
  });

  it("rounds a fractional seed", () => {
    const v = valid({ legs: [{ americanOdds: -110 }], seed: 12.7 });
    expect(v.seed).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// runParlayAnalysis — payout & probability math
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — payout & probability math", () => {
  it("multiplies leg decimal odds into the payout multiplier", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 100, winProbability: null },
          { label: "B", americanOdds: 100, winProbability: null },
        ],
      }),
    );
    // 2.0 × 2.0 = 4.0
    expect(out.payoutMultiplier).toBeCloseTo(4, 4);
  });

  it("2-leg independent combined prob equals leg1 × leg2", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.6 },
          { label: "B", americanOdds: null, winProbability: 0.5 },
        ],
        correlation: 0,
      }),
    );
    const p0 = out.legs[0]?.trueWinProbability ?? 0;
    const p1 = out.legs[1]?.trueWinProbability ?? 0;
    expect(out.independentWinProbability).toBeCloseTo(p0 * p1, 5);
    expect(out.independentWinProbability).toBeCloseTo(0.3, 5);
  });

  it("with correlation 0 the correlated prob equals the independent prob", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.6 },
          { label: "B", americanOdds: null, winProbability: 0.55 },
        ],
        correlation: 0,
      }),
    );
    expect(out.correlatedWinProbability).toBeCloseTo(
      out.independentWinProbability,
      6,
    );
  });

  it("reports leg count", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: -110, winProbability: null },
          { label: "B", americanOdds: -110, winProbability: null },
          { label: "C", americanOdds: -110, winProbability: null },
        ],
      }),
    );
    expect(out.legCount).toBe(3);
    expect(out.legs.length).toBe(3);
  });

  it("derives implied probability from the price for an odds-only leg", () => {
    const out = runParlayAnalysis(
      baseInput({ legs: [{ label: "A", americanOdds: -110, winProbability: null }] }),
    );
    // -110 implied ≈ 0.5238; without a user prob, trueWinProbability falls back to implied.
    expect(out.legs[0]?.impliedWinProbability).toBeCloseTo(0.5238, 3);
    expect(out.legs[0]?.trueWinProbability).toBeCloseTo(0.5238, 3);
  });

  it("derives a fair price for a probability-only leg", () => {
    const out = runParlayAnalysis(
      baseInput({ legs: [{ label: "A", americanOdds: null, winProbability: 0.5 }] }),
    );
    // p = 0.5 → even money → +100, decimal 2.0
    expect(out.legs[0]?.decimalOdds).toBeCloseTo(2, 3);
  });

  it("uses the user probability as 'true' even when odds are also given", () => {
    const out = runParlayAnalysis(
      baseInput({ legs: [{ label: "A", americanOdds: -200, winProbability: 0.5 }] }),
    );
    expect(out.legs[0]?.trueWinProbability).toBeCloseTo(0.5, 5);
    // implied from -200 ≈ 0.6667 — distinct from the user's 0.5
    expect(out.legs[0]?.impliedWinProbability).toBeCloseTo(0.6667, 3);
  });

  it("profitOnWin scales with stake", () => {
    const single = runParlayAnalysis(baseInput({ stakeUnits: 1 }));
    const triple = runParlayAnalysis(baseInput({ stakeUnits: 3 }));
    // Each result rounds profit to 4 dp independently, so compare at 3 dp.
    expect(triple.profitOnWin).toBeCloseTo(single.profitOnWin * 3, 3);
  });

  it("totalReturnOnWin equals stake plus profit", () => {
    const out = runParlayAnalysis(baseInput({ stakeUnits: 2 }));
    expect(out.totalReturnOnWin).toBeCloseTo(out.stakeUnits + out.profitOnWin, 4);
  });
});

// ---------------------------------------------------------------------------
// runParlayAnalysis — EV signs
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — expected value", () => {
  it("is positive when each leg true prob beats its implied price (+EV)", () => {
    // Priced at -110 each (implied ~0.524) but user believes 0.65 each → +EV.
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: -110, winProbability: 0.65 },
          { label: "B", americanOdds: -110, winProbability: 0.65 },
        ],
      }),
    );
    expect(out.expectedValueUnits).toBeGreaterThan(0);
    expect(out.expectedValuePct).toBeGreaterThan(0);
    expect(out.edgePoints).toBeGreaterThan(0);
  });

  it("is ~0 for odds-only legs (true prob = the price's own implied prob)", () => {
    // With no user estimate, the "true" probability honestly falls back to each
    // leg's implied price, so the modeled edge is zero by construction — the
    // tool does not invent a de-vigged advantage out of thin air.
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: -110, winProbability: null },
          { label: "B", americanOdds: -110, winProbability: null },
        ],
      }),
    );
    expect(Math.abs(out.expectedValueUnits)).toBeLessThan(0.01);
    expect(Math.abs(out.expectedValuePct)).toBeLessThan(1);
    expect(Math.abs(out.edgePoints)).toBeLessThan(0.5);
  });

  it("is negative when the user underrates legs vs the price (−EV)", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: -110, winProbability: 0.4 },
          { label: "B", americanOdds: -110, winProbability: 0.4 },
        ],
      }),
    );
    expect(out.expectedValueUnits).toBeLessThan(0);
  });

  it("is approximately zero for a leg priced exactly at its true probability", () => {
    // p = 0.5 leg priced at +100 (fair): single-leg EV ≈ 0.
    const out = runParlayAnalysis(
      baseInput({
        legs: [{ label: "A", americanOdds: 100, winProbability: 0.5 }],
        correlation: 0,
      }),
    );
    expect(Math.abs(out.expectedValueUnits)).toBeLessThan(0.02);
  });

  it("EV equals p·profit − (1−p)·stake by construction", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 120, winProbability: 0.55 },
          { label: "B", americanOdds: 140, winProbability: 0.5 },
        ],
        stakeUnits: 2,
      }),
    );
    const p = out.correlatedWinProbability;
    const expected = p * out.profitOnWin - (1 - p) * out.stakeUnits;
    expect(out.expectedValueUnits).toBeCloseTo(expected, 3);
  });
});

// ---------------------------------------------------------------------------
// runParlayAnalysis — breakeven math
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — breakeven win-rate", () => {
  it("breakeven equals 1 / payoutMultiplier", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 100, winProbability: null },
          { label: "B", americanOdds: 100, winProbability: null },
        ],
      }),
    );
    expect(out.breakevenWinProbability).toBeCloseTo(1 / out.payoutMultiplier, 4);
  });

  it("a 4.0× payout has a 25% breakeven", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 100, winProbability: null },
          { label: "B", americanOdds: 100, winProbability: null },
        ],
      }),
    );
    expect(out.breakevenWinProbability).toBeCloseTo(0.25, 3);
  });

  it("edgePoints is the gap between true prob and breakeven, in points", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 100, winProbability: 0.6 },
          { label: "B", americanOdds: 100, winProbability: 0.6 },
        ],
        correlation: 0,
      }),
    );
    const expected =
      (out.correlatedWinProbability - out.breakevenWinProbability) * 100;
    expect(out.edgePoints).toBeCloseTo(expected, 2);
  });

  it("breakeven is between 0 and 1", () => {
    const out = runParlayAnalysis(baseInput());
    expect(out.breakevenWinProbability).toBeGreaterThan(0);
    expect(out.breakevenWinProbability).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// runParlayAnalysis — correlation extremes
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — correlation", () => {
  it("positive correlation raises the joint probability above independence", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.5 },
          { label: "B", americanOdds: null, winProbability: 0.5 },
        ],
        correlation: 0.8,
      }),
    );
    expect(out.correlatedWinProbability).toBeGreaterThan(
      out.independentWinProbability,
    );
  });

  it("negative correlation lowers the joint probability below independence", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.5 },
          { label: "B", americanOdds: null, winProbability: 0.5 },
        ],
        correlation: -0.8,
      }),
    );
    expect(out.correlatedWinProbability).toBeLessThan(
      out.independentWinProbability,
    );
  });

  it("clamps the correlated probability to [0, 1] at the +1 extreme", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.5 },
          { label: "B", americanOdds: null, winProbability: 0.5 },
          { label: "C", americanOdds: null, winProbability: 0.5 },
        ],
        correlation: 1,
      }),
    );
    expect(out.correlatedWinProbability).toBeGreaterThanOrEqual(0);
    expect(out.correlatedWinProbability).toBeLessThanOrEqual(1);
  });

  it("clamps the correlated probability to [0, 1] at the -1 extreme", () => {
    const out = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: null, winProbability: 0.5 },
          { label: "B", americanOdds: null, winProbability: 0.5 },
          { label: "C", americanOdds: null, winProbability: 0.5 },
        ],
        correlation: -1,
      }),
    );
    expect(out.correlatedWinProbability).toBeGreaterThanOrEqual(0);
    expect(out.correlatedWinProbability).toBeLessThanOrEqual(1);
  });

  it("a single-leg parlay is unaffected by correlation", () => {
    const indep = runParlayAnalysis(
      baseInput({
        legs: [{ label: "A", americanOdds: null, winProbability: 0.6 }],
        correlation: 0,
      }),
    );
    const corr = runParlayAnalysis(
      baseInput({
        legs: [{ label: "A", americanOdds: null, winProbability: 0.6 }],
        correlation: 0.9,
      }),
    );
    expect(corr.correlatedWinProbability).toBeCloseTo(
      indep.correlatedWinProbability,
      6,
    );
  });
});

// ---------------------------------------------------------------------------
// runParlayAnalysis — risk of ruin
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — risk of ruin", () => {
  it("returns a ruin probability in [0, 1]", () => {
    const out = runParlayAnalysis(baseInput({ numBetsForRuin: 200 }));
    expect(out.riskOfRuin.ruinProbability).toBeGreaterThanOrEqual(0);
    expect(out.riskOfRuin.ruinProbability).toBeLessThanOrEqual(1);
  });

  it("echoes the simulated bet count", () => {
    const out = runParlayAnalysis(baseInput({ numBetsForRuin: 321 }));
    expect(out.riskOfRuin.numBets).toBe(321);
  });

  it("uses the correlated win probability per bet", () => {
    const out = runParlayAnalysis(baseInput());
    expect(out.riskOfRuin.perBetWinProbability).toBeCloseTo(
      out.correlatedWinProbability,
      5,
    );
  });

  it("a strongly −EV parlay carries higher ruin risk than a +EV one", () => {
    const minusEV = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: -110, winProbability: 0.3 },
          { label: "B", americanOdds: -110, winProbability: 0.3 },
        ],
        numBetsForRuin: 500,
        seed: 7,
      }),
    );
    const plusEV = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 200, winProbability: 0.7 },
          { label: "B", americanOdds: 200, winProbability: 0.7 },
        ],
        numBetsForRuin: 500,
        seed: 7,
      }),
    );
    expect(minusEV.riskOfRuin.ruinProbability).toBeGreaterThanOrEqual(
      plusEV.riskOfRuin.ruinProbability,
    );
  });

  it("reports a positive starting bankroll and trial count", () => {
    const out = runParlayAnalysis(baseInput());
    expect(out.riskOfRuin.startingBankrollUnits).toBeGreaterThan(0);
    expect(out.riskOfRuin.trials).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — determinism", () => {
  it("is fully deterministic given the same seed", () => {
    const a = runParlayAnalysis(baseInput({ seed: 123, numBetsForRuin: 300 }));
    const b = runParlayAnalysis(baseInput({ seed: 123, numBetsForRuin: 300 }));
    expect(b).toEqual(a);
  });

  it("non-random outputs match even with a null seed", () => {
    const a = runParlayAnalysis(baseInput({ seed: null }));
    const b = runParlayAnalysis(baseInput({ seed: null }));
    expect(b.payoutMultiplier).toBe(a.payoutMultiplier);
    expect(b.correlatedWinProbability).toBe(a.correlatedWinProbability);
    expect(b.riskOfRuin.ruinProbability).toBe(a.riskOfRuin.ruinProbability);
  });

  it("different seeds can produce different ruin estimates", () => {
    const a = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 150, winProbability: 0.45 },
          { label: "B", americanOdds: 150, winProbability: 0.45 },
        ],
        seed: 1,
        numBetsForRuin: 400,
      }),
    );
    const b = runParlayAnalysis(
      baseInput({
        legs: [
          { label: "A", americanOdds: 150, winProbability: 0.45 },
          { label: "B", americanOdds: 150, winProbability: 0.45 },
        ],
        seed: 99999,
        numBetsForRuin: 400,
      }),
    );
    // Not a hard guarantee they differ, but the deterministic math must match.
    expect(b.payoutMultiplier).toBe(a.payoutMultiplier);
    expect(b.correlatedWinProbability).toBe(a.correlatedWinProbability);
  });
});

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

describe("runParlayAnalysis — honesty disclaimer", () => {
  it("attaches the disclaimer constant", () => {
    const out = runParlayAnalysis(baseInput());
    expect(out.disclaimer).toBe(PARLAY_DISCLAIMER);
  });

  it("frames the tool as a model explorer, not a published pick", () => {
    expect(PARLAY_DISCLAIMER.toLowerCase()).toContain("not a published pick");
  });

  it("flags the correlation model as an approximation", () => {
    expect(PARLAY_DISCLAIMER.toLowerCase()).toContain("approximation");
  });
});
