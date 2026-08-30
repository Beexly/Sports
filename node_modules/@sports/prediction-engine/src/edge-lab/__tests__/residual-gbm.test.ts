import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng.js";
import { trainResidualGbm, type ResidualGbmRow } from "../residual-gbm.js";

// ---------------------------------------------------------------------------
// Synthetic data helpers
// ---------------------------------------------------------------------------

/** Deterministic uniform draw in [lo, hi) from a shared rng stream. */
function uniform(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Step function used as an easily-learnable g(x) for the offset test. */
function stepG(form: number): number {
  return form >= 0 ? 1.5 : -1.5;
}

describe("trainResidualGbm — line-as-offset structural rule", () => {
  it("tracks line + g(x) when the line is correlated with x but the residual has real signal", () => {
    const rng = mulberry32(1001);
    const rows: ResidualGbmRow[] = [];
    for (let i = 0; i < 400; i++) {
      const form = uniform(rng, -3, 3);
      const line = 5 + 0.4 * form + uniform(rng, -0.1, 0.1); // line correlated with form
      const noise = uniform(rng, -0.1, 0.1);
      const y = line + stepG(form) + noise;
      rows.push({ features: new Map([["form", form]]), line, y });
    }

    const model = trainResidualGbm(rows, { seed: 5, rounds: 200, eta: 0.15 });

    for (const form of [-2.5, -1, -0.25, 0.25, 1, 2.5]) {
      const testLine = 10; // an arbitrary line, independent of training lines
      const predicted = model.predict(new Map([["form", form]]), testLine);
      const expected = testLine + stepG(form);
      expect(Math.abs(predicted - expected)).toBeLessThan(0.6);
    }
  });

  it("ANTI-REDISCOVERY: when g(x)=0 (y = line + noise), the model cannot manufacture fake skill from the line", () => {
    const rng = mulberry32(2002);
    const n = 500;
    const validationFraction = 0.2;
    const rows: ResidualGbmRow[] = [];
    const noises: number[] = [];
    for (let i = 0; i < n; i++) {
      const form = uniform(rng, -3, 3);
      const line = 5 + 0.4 * form + uniform(rng, -0.1, 0.1); // line correlated with form...
      const noise = uniform(rng, -0.5, 0.5); // ...but the residual is PURE noise, no g(x)
      const y = line + noise;
      noises.push(noise);
      rows.push({ features: new Map([["form", form]]), line, y });
    }

    const model = trainResidualGbm(rows, { seed: 9, rounds: 200, eta: 0.1, validationFraction });

    // Noise-only floor: the best any model can do on the validation slice is
    // the pinball loss of predicting 0 against the ACTUAL noise draws that
    // landed in that (time-ordered, last) slice.
    const nVal = Math.round(n * validationFraction);
    const valNoise = noises.slice(n - nVal);
    const noiseFloor =
      valNoise.reduce((acc, v) => acc + 0.5 * Math.abs(v), 0) / valNoise.length;

    expect(model.diagnostics.bestValPinballLoss).not.toBeNull();
    const valLoss = model.diagnostics.bestValPinballLoss!;

    // The pin: validation loss stays close to the honest noise floor. If the
    // model had instead re-learned the line's 0.4-per-unit slope on `form`
    // (i.e. rediscovered the line), val loss would blow up well past the
    // floor because that "skill" doesn't generalize off the training draws.
    expect(valLoss).toBeLessThan(noiseFloor * 1.75);

    // |f(x)| stays tiny across the input range — nowhere near the ~2.4-unit
    // swing (0.4 * 6-unit form range) it would show if it had copied the
    // line's dependence on `form` into f(x).
    let maxAbsF = 0;
    for (let form = -3; form <= 3; form += 0.25) {
      const testLine = 7;
      const f = model.predict(new Map([["form", form]]), testLine) - testLine;
      maxAbsF = Math.max(maxAbsF, Math.abs(f));
    }
    expect(maxAbsF).toBeLessThan(0.5);

    // Surfaced for the record (see task RETURN requirement): val loss vs. floor.
    // eslint-disable-next-line no-console
    console.log(
      `[anti-rediscovery] valPinballLoss=${valLoss.toFixed(4)} noiseFloor=${noiseFloor.toFixed(4)} ratio=${(valLoss / noiseFloor).toFixed(3)} maxAbsF=${maxAbsF.toFixed(4)}`,
    );
  });
});

describe("trainResidualGbm — feature-key guard", () => {
  const forbiddenRows: ResidualGbmRow[] = [
    { features: new Map([["open_spread", 1]]), line: 3, y: 4 },
    { features: new Map([["open_spread", 2]]), line: 3.5, y: 3.9 },
  ];

  it("throws RangeError by default when a feature key looks market-derived", () => {
    expect(() => trainResidualGbm(forbiddenRows)).toThrow(RangeError);
  });

  it("does not throw when opts.allowMarketFeatures is true", () => {
    expect(() => trainResidualGbm(forbiddenRows, { allowMarketFeatures: true })).not.toThrow();
  });

  it("also guards predict() calls, independent of what the model was trained on", () => {
    const cleanRows: ResidualGbmRow[] = [
      { features: new Map([["form", 1]]), line: 3, y: 4 },
      { features: new Map([["form", -1]]), line: 3.2, y: 2.9 },
    ];
    const model = trainResidualGbm(cleanRows, { rounds: 5 });
    expect(() => model.predict(new Map([["total_price", 1]]), 3)).toThrow(RangeError);
  });
});

describe("trainResidualGbm — pinball quantile recovery", () => {
  it("q=0.5 recovers the median and q=0.8 shifts up with pinned ordering, on asymmetric noise", () => {
    const rng = mulberry32(3003);
    const n = 500;
    const residuals: number[] = [];
    const rows: ResidualGbmRow[] = [];
    for (let i = 0; i < n; i++) {
      const unrelated = uniform(rng, -1, 1); // present but uncorrelated with y
      const line = 20;
      // Right-skewed residual: mostly a small draw, occasionally a large
      // positive spike — median well below the mean, q=0.8 well above it.
      const spike = rng() < 0.3 ? uniform(rng, 5, 9) : 0;
      const base = uniform(rng, -1, 1);
      const residual = base + spike;
      residuals.push(residual);
      rows.push({ features: new Map([["unrelated", unrelated]]), line, y: line + residual });
    }

    const sortedResiduals = [...residuals].sort((a, b) => a - b);
    const empiricalMedian = sortedResiduals[Math.floor(0.5 * n)]!;
    const empiricalP80 = sortedResiduals[Math.floor(0.8 * n)]!;
    expect(empiricalP80).toBeGreaterThan(empiricalMedian + 1); // sanity: distribution really is skewed

    const modelMedian = trainResidualGbm(rows, { seed: 11, rounds: 150, quantile: 0.5 });
    const modelP80 = trainResidualGbm(rows, { seed: 11, rounds: 150, quantile: 0.8 });

    const testLine = 100;
    const testFeatures = new Map([["unrelated", 0]]);
    const predMedian = modelMedian.predict(testFeatures, testLine) - testLine;
    const predP80 = modelP80.predict(testFeatures, testLine) - testLine;

    expect(Math.abs(predMedian - empiricalMedian)).toBeLessThan(0.75);
    expect(Math.abs(predP80 - empiricalP80)).toBeLessThan(0.75);

    // Pinned ordering: the higher quantile must predict higher, everywhere.
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      const feats = new Map([["unrelated", v]]);
      const pm = modelMedian.predict(feats, testLine);
      const p8 = modelP80.predict(feats, testLine);
      expect(p8).toBeGreaterThan(pm);
    }
  });
});

describe("trainResidualGbm — monotone constraints", () => {
  function localDip(x: number): number {
    // Overall increasing trend with a deliberate local decrease near x=0.5.
    return x - 2.2 * Math.max(0, 1 - Math.abs(x - 0.5) / 0.6);
  }

  function buildDipRows(rng: () => number, n: number): ResidualGbmRow[] {
    const rows: ResidualGbmRow[] = [];
    for (let i = 0; i < n; i++) {
      const pace = uniform(rng, -3, 3);
      const line = 10;
      const noise = uniform(rng, -0.05, 0.05);
      rows.push({ features: new Map([["recent_pace", pace]]), line, y: line + localDip(pace) + noise });
    }
    return rows;
  }

  const grid: number[] = [];
  for (let x = -3; x <= 3 + 1e-9; x += 0.25) grid.push(Math.round(x * 100) / 100);

  it("unconstrained fit actually reproduces the local dip (sanity check the setup is meaningful)", () => {
    const rng = mulberry32(4004);
    const rows = buildDipRows(rng, 500);
    const model = trainResidualGbm(rows, { seed: 21, rounds: 200, eta: 0.15, validationFraction: 0.15 });

    const responses = grid.map((x) => model.predict(new Map([["recent_pace", x]]), 10) - 10);
    let sawDecrease = false;
    for (let i = 1; i < responses.length; i++) {
      if (responses[i]! < responses[i - 1]! - 1e-9) sawDecrease = true;
    }
    expect(sawDecrease).toBe(true);
  });

  it("with a +1 monotone constraint, the fitted univariate response is non-decreasing over the grid", () => {
    const rng = mulberry32(4004); // same seed/data as the sanity check above
    const rows = buildDipRows(rng, 500);
    const model = trainResidualGbm(rows, {
      seed: 21,
      rounds: 200,
      eta: 0.15,
      validationFraction: 0.15,
      monotone: new Map([["recent_pace", 1]]),
    });

    const responses = grid.map((x) => model.predict(new Map([["recent_pace", x]]), 10) - 10);
    for (let i = 1; i < responses.length; i++) {
      expect(responses[i]!).toBeGreaterThanOrEqual(responses[i - 1]! - 1e-9);
    }
  });
});

describe("trainResidualGbm — early stopping", () => {
  it("stops before the round budget on noisy data, and the best-round model beats the last-round model on validation", () => {
    const rng = mulberry32(5005);
    const n = 300;
    const rows: ResidualGbmRow[] = [];
    for (let i = 0; i < n; i++) {
      const noise1 = uniform(rng, -1, 1);
      const noise2 = uniform(rng, -1, 1);
      const line = 5;
      // Pure noise residual — no learnable structure, so val loss should
      // stop improving almost immediately and patience should trigger.
      const y = line + uniform(rng, -0.5, 0.5);
      rows.push({ features: new Map([["noise1", noise1], ["noise2", noise2]]), line, y });
    }

    const maxRounds = 200;
    const model = trainResidualGbm(rows, { seed: 31, rounds: maxRounds, eta: 0.1, validationFraction: 0.25 });

    expect(model.diagnostics.roundsRun).toBeLessThan(maxRounds); // patience-triggered stop, not budget exhaustion
    expect(model.diagnostics.roundsUsed).toBeLessThan(model.diagnostics.roundsRun); // truncated back to the best round
    expect(model.diagnostics.bestValPinballLoss).not.toBeNull();
    expect(model.diagnostics.finalRoundValPinballLoss).not.toBeNull();
    expect(model.diagnostics.bestValPinballLoss!).toBeLessThan(model.diagnostics.finalRoundValPinballLoss!);
  });
});

describe("trainResidualGbm — determinism", () => {
  it("the same seed produces identical predictions and identical diagnostics", () => {
    const rng = mulberry32(6006);
    const rows: ResidualGbmRow[] = [];
    for (let i = 0; i < 200; i++) {
      const a = uniform(rng, -2, 2);
      const b = uniform(rng, -2, 2);
      const line = 8 + 0.1 * a;
      const y = line + 0.7 * a - 0.3 * b + uniform(rng, -0.2, 0.2);
      rows.push({ features: new Map([["a", a], ["b", b]]), line, y });
    }

    const opts = { seed: 77, rounds: 120, eta: 0.12, subsample: 0.7 } as const;
    const modelA = trainResidualGbm(rows, opts);
    const modelB = trainResidualGbm(rows, opts);

    const queries: Array<[number, number, number]> = [
      [1, 1, 9],
      [-1.5, 0.5, 12],
      [0, 0, 3],
    ];
    for (const [a, b, line] of queries) {
      const feats = new Map([["a", a], ["b", b]]);
      expect(modelA.predict(feats, line)).toBe(modelB.predict(feats, line));
    }
    expect(modelA.diagnostics.roundsUsed).toBe(modelB.diagnostics.roundsUsed);
    expect(modelA.diagnostics.bestValPinballLoss).toBe(modelB.diagnostics.bestValPinballLoss);

    // A different seed is expected to draw a different subsample sequence
    // and so (generically) produce a different prediction somewhere.
    const modelC = trainResidualGbm(rows, { ...opts, seed: 78 });
    const feats = new Map([["a", 1], ["b", 1]]);
    const predA = modelA.predict(feats, 9);
    const predC = modelC.predict(feats, 9);
    expect(predA).not.toBe(predC);
  });
});
