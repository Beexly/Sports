import { describe, it, expect } from "vitest";

import {
  validateBankrollInput,
  runBankrollOptimization,
  BANKROLL_MIN_BETS,
  BANKROLL_MAX_BETS,
  BANKROLL_DEFAULT_BETS,
  BANKROLL_DEFAULT_KELLY_MULTIPLIER,
  BANKROLL_DISCLAIMER,
  RUIN_THRESHOLD_PCT,
  type BankrollInput,
} from "@/lib/lab/bankroll-optimizer";

function baseInput(overrides: Partial<BankrollInput> = {}): BankrollInput {
  return {
    bankroll: 1000,
    winProbability: 0.55,
    americanOdds: 100, // even money — decimal 2.0, b = 1
    kellyMultiplier: 0.5,
    numBets: 100,
    seed: 42,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateBankrollInput
// ---------------------------------------------------------------------------

describe("validateBankrollInput", () => {
  it("rejects non-objects", () => {
    expect(validateBankrollInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validateBankrollInput("nope")).toHaveProperty("error");
    expect(validateBankrollInput(42)).toHaveProperty("error");
    expect(validateBankrollInput(undefined)).toHaveProperty("error");
  });

  it("requires bankroll", () => {
    expect(validateBankrollInput({ americanOdds: -110 })).toHaveProperty(
      "error",
    );
  });

  it("requires americanOdds", () => {
    expect(validateBankrollInput({ bankroll: 1000 })).toHaveProperty("error");
  });

  it("rejects americanOdds of exactly 0", () => {
    expect(
      validateBankrollInput({ bankroll: 1000, americanOdds: 0 }),
    ).toHaveProperty("error");
  });

  it("rejects absurdly large american odds", () => {
    expect(
      validateBankrollInput({ bankroll: 1000, americanOdds: 100000 }),
    ).toHaveProperty("error");
  });

  it("accepts a minimal valid body", () => {
    const res = validateBankrollInput({ bankroll: 1000, americanOdds: -110 });
    expect(res).not.toHaveProperty("error");
  });

  it("accepts numeric strings", () => {
    const res = validateBankrollInput({
      bankroll: "500",
      americanOdds: "-120",
      winProbability: "0.6",
      kellyMultiplier: "0.25",
      numBets: "300",
    });
    expect(res).not.toHaveProperty("error");
    const v = res as BankrollInput;
    expect(v.bankroll).toBe(500);
    expect(v.americanOdds).toBe(-120);
    expect(v.winProbability).toBe(0.6);
    expect(v.kellyMultiplier).toBe(0.25);
    expect(v.numBets).toBe(300);
  });

  it("clamps winProbability into [0,1]", () => {
    const hi = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      winProbability: 5,
    }) as BankrollInput;
    expect(hi.winProbability).toBe(1);

    const lo = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      winProbability: -3,
    }) as BankrollInput;
    expect(lo.winProbability).toBe(0);
  });

  it("keeps winProbability null when absent (derive from price)", () => {
    const v = validateBankrollInput({
      bankroll: 1000,
      americanOdds: -110,
    }) as BankrollInput;
    expect(v.winProbability).toBeNull();
  });

  it("defaults kellyMultiplier to half-Kelly", () => {
    const v = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
    }) as BankrollInput;
    expect(v.kellyMultiplier).toBe(BANKROLL_DEFAULT_KELLY_MULTIPLIER);
    expect(v.kellyMultiplier).toBe(0.5);
  });

  it("clamps kellyMultiplier into [0,1]", () => {
    const hi = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      kellyMultiplier: 4,
    }) as BankrollInput;
    expect(hi.kellyMultiplier).toBe(1);

    const lo = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      kellyMultiplier: -2,
    }) as BankrollInput;
    expect(lo.kellyMultiplier).toBe(0);
  });

  it("defaults numBets when absent", () => {
    const v = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
    }) as BankrollInput;
    expect(v.numBets).toBe(BANKROLL_DEFAULT_BETS);
  });

  it("clamps numBets to [MIN, MAX] and rounds", () => {
    const hi = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      numBets: 999999,
    }) as BankrollInput;
    expect(hi.numBets).toBe(BANKROLL_MAX_BETS);

    const lo = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      numBets: -5,
    }) as BankrollInput;
    expect(lo.numBets).toBe(BANKROLL_MIN_BETS);

    const rounded = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      numBets: 50.7,
    }) as BankrollInput;
    expect(rounded.numBets).toBe(51);
  });

  it("clamps a non-positive bankroll up to the floor", () => {
    const v = validateBankrollInput({
      bankroll: -100,
      americanOdds: 100,
    }) as BankrollInput;
    expect(v.bankroll).toBeGreaterThan(0);
  });

  it("rounds americanOdds to an integer", () => {
    const v = validateBankrollInput({
      bankroll: 1000,
      americanOdds: -110.6,
    }) as BankrollInput;
    expect(v.americanOdds).toBe(-111);
  });

  it("keeps seed null when absent and rounds when present", () => {
    const absent = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
    }) as BankrollInput;
    expect(absent.seed).toBeNull();

    const present = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      seed: 7.9,
    }) as BankrollInput;
    expect(present.seed).toBe(8);
  });

  it("ignores non-numeric junk values gracefully", () => {
    const v = validateBankrollInput({
      bankroll: 1000,
      americanOdds: 100,
      winProbability: "abc",
      kellyMultiplier: "xyz",
    }) as BankrollInput;
    expect(v.winProbability).toBeNull();
    expect(v.kellyMultiplier).toBe(BANKROLL_DEFAULT_KELLY_MULTIPLIER);
  });
});

// ---------------------------------------------------------------------------
// runBankrollOptimization — Kelly formula sanity
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — Kelly fraction", () => {
  it("p=0.55 at even odds gives ~0.10 full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.55, americanOdds: 100 }),
    );
    expect(out.fullKellyFraction).toBeCloseTo(0.1, 5);
  });

  it("p=0.6 at even odds gives ~0.20 full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, americanOdds: 100 }),
    );
    expect(out.fullKellyFraction).toBeCloseTo(0.2, 5);
  });

  it("half-Kelly applied = 0.5 × full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 0.5 }),
    );
    expect(out.appliedKellyFraction).toBeCloseTo(out.fullKellyFraction * 0.5, 6);
  });

  it("quarter-Kelly applied = 0.25 × full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 0.25 }),
    );
    expect(out.appliedKellyFraction).toBeCloseTo(
      out.fullKellyFraction * 0.25,
      6,
    );
  });

  it("full Kelly (multiplier=1) applied == full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 1 }),
    );
    expect(out.appliedKellyFraction).toBeCloseTo(out.fullKellyFraction, 6);
  });

  it("recommended stake = applied fraction × bankroll", () => {
    const out = runBankrollOptimization(
      baseInput({ bankroll: 2000, winProbability: 0.6, kellyMultiplier: 0.5 }),
    );
    expect(out.recommendedStake).toBeCloseTo(
      out.appliedKellyFraction * 2000,
      2,
    );
  });

  it("zero multiplier yields zero applied fraction and stake", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 0 }),
    );
    expect(out.appliedKellyFraction).toBe(0);
    expect(out.recommendedStake).toBe(0);
  });

  it("scales Kelly with the bet price (worse price => smaller fraction)", () => {
    const fav = runBankrollOptimization(
      baseInput({ winProbability: 0.6, americanOdds: -200 }),
    );
    const even = runBankrollOptimization(
      baseInput({ winProbability: 0.6, americanOdds: 100 }),
    );
    expect(fav.fullKellyFraction).toBeLessThan(even.fullKellyFraction);
  });
});

// ---------------------------------------------------------------------------
// Negative / zero edge — never bet -EV
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — never bet a negative edge", () => {
  it("negative-edge spot returns a zero stake", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.45, americanOdds: 100 }),
    );
    expect(out.fullKellyFraction).toBe(0);
    expect(out.appliedKellyFraction).toBe(0);
    expect(out.recommendedStake).toBe(0);
  });

  it("negative-edge spot reports a negative edge%", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.45, americanOdds: 100 }),
    );
    expect(out.edgePct).toBeLessThan(0);
  });

  it("a price-implied (no-edge) probability yields ~zero edge and zero stake", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: null, americanOdds: -110 }),
    );
    expect(out.winProbabilityDerived).toBe(true);
    expect(out.edgePct).toBeCloseTo(0, 4);
    expect(out.fullKellyFraction).toBe(0);
    expect(out.recommendedStake).toBe(0);
  });

  it("exactly break-even probability gives no edge", () => {
    // -110 => break-even ~0.5238
    const out = runBankrollOptimization(
      baseInput({ winProbability: null, americanOdds: -110 }),
    );
    expect(out.winProbability).toBeCloseTo(110 / 210, 4);
  });

  it("positive edge produces a positive stake", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, americanOdds: -110 }),
    );
    expect(out.fullKellyFraction).toBeGreaterThan(0);
    expect(out.recommendedStake).toBeGreaterThan(0);
    expect(out.edgePct).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge percentage
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — edge percentage", () => {
  it("p=0.55 even odds gives +10% edge", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.55, americanOdds: 100 }),
    );
    // EV = p*b - (1-p) = 0.55*1 - 0.45 = 0.10 => 10%
    expect(out.edgePct).toBeCloseTo(10, 2);
  });

  it("p=0.5 even odds gives 0% edge", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.5, americanOdds: 100 }),
    );
    expect(out.edgePct).toBeCloseTo(0, 4);
  });
});

// ---------------------------------------------------------------------------
// Expected log-growth
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — expected log-growth", () => {
  it("is positive for a positive-edge applied fraction", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 0.5 }),
    );
    expect(out.expectedLogGrowthPerBet).toBeGreaterThan(0);
  });

  it("is zero when no stake is applied (no edge)", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.45 }),
    );
    expect(out.expectedLogGrowthPerBet).toBe(0);
  });

  it("is finite even at full Kelly", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.7, kellyMultiplier: 1 }),
    );
    expect(Number.isFinite(out.expectedLogGrowthPerBet)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Monte Carlo simulation, determinism, risk of ruin
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — Monte Carlo", () => {
  it("is deterministic given the same seed", () => {
    const a = runBankrollOptimization(baseInput({ seed: 7 }));
    const b = runBankrollOptimization(baseInput({ seed: 7 }));
    expect(a.medianEndingBankroll).toBe(b.medianEndingBankroll);
    expect(a.riskOfRuin).toBe(b.riskOfRuin);
    expect(a.trajectory).toEqual(b.trajectory);
    expect(a.drawdownSummary).toEqual(b.drawdownSummary);
  });

  it("produces different draws for different seeds", () => {
    const a = runBankrollOptimization(baseInput({ seed: 1 }));
    const b = runBankrollOptimization(baseInput({ seed: 999 }));
    // Highly unlikely the full median trajectory is identical.
    expect(a.trajectory).not.toEqual(b.trajectory);
  });

  it("risk of ruin is within [0,1]", () => {
    const out = runBankrollOptimization(baseInput({ winProbability: 0.52 }));
    expect(out.riskOfRuin).toBeGreaterThanOrEqual(0);
    expect(out.riskOfRuin).toBeLessThanOrEqual(1);
  });

  it("reports the configured ruin threshold", () => {
    const out = runBankrollOptimization(baseInput());
    expect(out.ruinThresholdPct).toBe(RUIN_THRESHOLD_PCT);
  });

  it("a strong edge has a higher median ending bankroll than a weak one", () => {
    const strong = runBankrollOptimization(
      baseInput({ winProbability: 0.65, seed: 5 }),
    );
    const weak = runBankrollOptimization(
      baseInput({ winProbability: 0.52, seed: 5 }),
    );
    expect(strong.medianEndingBankroll).toBeGreaterThan(
      weak.medianEndingBankroll,
    );
  });

  it("a positive-edge bettor grows the bankroll on the median path", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.6, kellyMultiplier: 0.5, numBets: 300, seed: 3 }),
    );
    expect(out.medianEndingBankroll).toBeGreaterThan(out.bankroll);
  });

  it("flat bankroll when no stake is applied (no edge => no ruin)", () => {
    const out = runBankrollOptimization(
      baseInput({ winProbability: 0.45, numBets: 200 }),
    );
    expect(out.medianEndingBankroll).toBe(out.bankroll);
    expect(out.riskOfRuin).toBe(0);
  });

  it("aggressive full-Kelly on a thin edge raises risk of ruin vs half-Kelly", () => {
    const full = runBankrollOptimization(
      baseInput({
        winProbability: 0.53,
        kellyMultiplier: 1,
        numBets: 500,
        seed: 11,
      }),
    );
    const half = runBankrollOptimization(
      baseInput({
        winProbability: 0.53,
        kellyMultiplier: 0.5,
        numBets: 500,
        seed: 11,
      }),
    );
    expect(full.riskOfRuin).toBeGreaterThanOrEqual(half.riskOfRuin);
  });

  it("median ending bankroll is positive", () => {
    const out = runBankrollOptimization(baseInput());
    expect(out.medianEndingBankroll).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Drawdown summary
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — drawdown summary", () => {
  it("reports drawdown fractions within [0,1]", () => {
    const out = runBankrollOptimization(baseInput({ winProbability: 0.55 }));
    const d = out.drawdownSummary;
    for (const v of [
      d.meanMaxDrawdownPct,
      d.medianMaxDrawdownPct,
      d.p95MaxDrawdownPct,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("p95 drawdown >= median drawdown", () => {
    const out = runBankrollOptimization(baseInput({ winProbability: 0.55 }));
    expect(out.drawdownSummary.p95MaxDrawdownPct).toBeGreaterThanOrEqual(
      out.drawdownSummary.medianMaxDrawdownPct,
    );
  });

  it("no drawdown when no stake is applied", () => {
    const out = runBankrollOptimization(baseInput({ winProbability: 0.45 }));
    expect(out.drawdownSummary.meanMaxDrawdownPct).toBe(0);
    expect(out.drawdownSummary.p95MaxDrawdownPct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Trajectory
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — trajectory", () => {
  it("is compact (<= ~40 points)", () => {
    const out = runBankrollOptimization(baseInput({ numBets: 5000 }));
    expect(out.trajectory.length).toBeGreaterThan(0);
    expect(out.trajectory.length).toBeLessThanOrEqual(40);
  });

  it("starts at the initial bankroll", () => {
    const out = runBankrollOptimization(baseInput({ bankroll: 1000 }));
    expect(out.trajectory[0]?.bet).toBe(0);
    expect(out.trajectory[0]?.bankroll).toBeCloseTo(1000, 2);
  });

  it("bet indices are non-decreasing", () => {
    const out = runBankrollOptimization(baseInput({ numBets: 1000 }));
    for (let i = 1; i < out.trajectory.length; i++) {
      expect(out.trajectory[i]!.bet).toBeGreaterThanOrEqual(
        out.trajectory[i - 1]!.bet,
      );
    }
  });

  it("trajectory bankrolls are all positive", () => {
    const out = runBankrollOptimization(baseInput());
    for (const t of out.trajectory) {
      expect(t.bankroll).toBeGreaterThan(0);
    }
  });

  it("returns every point when numBets is small", () => {
    const out = runBankrollOptimization(baseInput({ numBets: 10 }));
    expect(out.trajectory.length).toBe(11); // 0..10
  });
});

// ---------------------------------------------------------------------------
// Echoed fields & disclaimer
// ---------------------------------------------------------------------------

describe("runBankrollOptimization — output shape & honesty", () => {
  it("echoes inputs back faithfully", () => {
    const out = runBankrollOptimization(
      baseInput({ bankroll: 1500, americanOdds: -120, numBets: 250 }),
    );
    expect(out.bankroll).toBe(1500);
    expect(out.americanOdds).toBe(-120);
    expect(out.numBets).toBe(250);
  });

  it("converts american to decimal odds correctly", () => {
    const out = runBankrollOptimization(baseInput({ americanOdds: 100 }));
    expect(out.decimalOdds).toBeCloseTo(2.0, 4);
  });

  it("flags a derived win probability when none supplied", () => {
    const derived = runBankrollOptimization(
      baseInput({ winProbability: null }),
    );
    expect(derived.winProbabilityDerived).toBe(true);

    const supplied = runBankrollOptimization(
      baseInput({ winProbability: 0.6 }),
    );
    expect(supplied.winProbabilityDerived).toBe(false);
  });

  it("always carries the honesty / responsible-gaming disclaimer", () => {
    const out = runBankrollOptimization(baseInput());
    expect(out.disclaimer).toBe(BANKROLL_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("gambling involves risk");
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
  });

  it("never produces NaN in any numeric output", () => {
    const out = runBankrollOptimization(baseInput({ winProbability: 0.58 }));
    const numbers = [
      out.fullKellyFraction,
      out.appliedKellyFraction,
      out.recommendedStake,
      out.edgePct,
      out.expectedLogGrowthPerBet,
      out.medianEndingBankroll,
      out.riskOfRuin,
      out.drawdownSummary.meanMaxDrawdownPct,
    ];
    for (const n of numbers) {
      expect(Number.isNaN(n)).toBe(false);
    }
  });
});
