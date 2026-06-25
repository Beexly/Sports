import { describe, it, expect } from "vitest";
import {
  toFeatureVector,
  BASELINE_MODEL,
  predictDelta,
  solveLinearSystem,
  fitRidge,
  forecastAction,
  evaluateForecastRmse,
  evaluateClvAtThreshold,
  walkForwardForecast,
  type ForecastFeatures,
  type ForecastSample,
  type RidgeModel,
} from "../closing-line-forecaster.js";

function feat(o: Partial<ForecastFeatures> = {}): ForecastFeatures {
  return {
    hoursToKickoff: 24,
    driftSoFar: 0,
    crossBookDispersion: 0,
    independentGap: 0,
    hasIndependent: 0,
    ...o,
  };
}

// A perfectly-linear data generator so least squares can recover the exact weights.
const PLANT_INTERCEPT = 0.5;
const PLANT = { drift: 0.3, disp: 0, gap: 0.5, hasInd: 0, hours: -0.01 };
function plantedSample(i: number): ForecastSample {
  const f = feat({
    driftSoFar: ((i % 7) - 3) * 0.5,
    crossBookDispersion: (i % 5) * 0.4,
    independentGap: ((i % 11) - 5) * 0.2,
    hasIndependent: (i % 2) as 0 | 1,
    hoursToKickoff: (i % 13) * 4,
  });
  const label =
    PLANT_INTERCEPT +
    PLANT.drift * f.driftSoFar +
    PLANT.disp * f.crossBookDispersion +
    PLANT.gap * f.independentGap +
    PLANT.hasInd * f.hasIndependent +
    PLANT.hours * f.hoursToKickoff;
  return { features: f, label };
}

describe("solveLinearSystem", () => {
  it("solves a well-posed system and recovers the known solution", () => {
    // x + y = 3 ; 2x − y = 0  → x=1, y=2
    const x = solveLinearSystem([[1, 1], [2, -1]], [3, 0]);
    expect(x).not.toBeNull();
    expect(x![0]).toBeCloseTo(1, 9);
    expect(x![1]).toBeCloseTo(2, 9);
  });

  it("returns null for a singular system", () => {
    expect(solveLinearSystem([[1, 1], [2, 2]], [1, 2])).toBeNull();
  });
});

describe("predictDelta", () => {
  it("is intercept + weighted feature sum", () => {
    const model: RidgeModel = { intercept: 1, weights: [2, 0, 0, 0, -0.5], lambda: 0, nTrain: 10 };
    const f = feat({ driftSoFar: 3, hoursToKickoff: 4 });
    // 1 + 2*3 + (-0.5)*4 = 1 + 6 − 2 = 5
    expect(predictDelta(model, f)).toBeCloseTo(5, 9);
  });

  it("the baseline model predicts zero for everything", () => {
    expect(predictDelta(BASELINE_MODEL, feat({ driftSoFar: 9, independentGap: -4 }))).toBe(0);
  });
});

describe("fitRidge", () => {
  it("recovers planted coefficients with λ=0 on noiseless data", () => {
    const samples = Array.from({ length: 200 }, (_, i) => plantedSample(i));
    const model = fitRidge(samples, 0);
    expect(model.intercept).toBeCloseTo(PLANT_INTERCEPT, 5);
    const [wDrift, wDisp, wGap, wHasInd, wHours] = model.weights;
    expect(wDrift).toBeCloseTo(PLANT.drift, 5);
    expect(wDisp!).toBeCloseTo(PLANT.disp, 5);
    expect(wGap!).toBeCloseTo(PLANT.gap, 5);
    expect(wHasInd!).toBeCloseTo(PLANT.hasInd, 5);
    expect(wHours!).toBeCloseTo(PLANT.hours, 5);
  });

  it("stays at the baseline when the sample is too small to fit", () => {
    const samples = Array.from({ length: 6 }, (_, i) => plantedSample(i));
    expect(fitRidge(samples, 1)).toBe(BASELINE_MODEL);
  });

  it("shrinks the feature weights toward zero as λ grows (intercept→mean y)", () => {
    const samples = Array.from({ length: 200 }, (_, i) => plantedSample(i));
    const meanY = samples.reduce((s, x) => s + x.label, 0) / samples.length;
    const model = fitRidge(samples, 1e7);
    expect(Math.abs(model.weights[0]!)).toBeLessThan(0.02); // drift weight crushed from 0.3
    expect(model.intercept).toBeCloseTo(meanY, 1);
  });
});

describe("forecastAction", () => {
  it("bets HOME when the line is expected to fall, AWAY when it is expected to rise, else PASS", () => {
    const fallModel: RidgeModel = { intercept: -2, weights: [0, 0, 0, 0, 0], lambda: 0, nTrain: 99 };
    const riseModel: RidgeModel = { intercept: 2, weights: [0, 0, 0, 0, 0], lambda: 0, nTrain: 99 };
    const flatModel: RidgeModel = { intercept: 0.5, weights: [0, 0, 0, 0, 0], lambda: 0, nTrain: 99 };

    expect(forecastAction(fallModel, feat(), 1).recommendation).toBe("BET_HOME");
    expect(forecastAction(riseModel, feat(), 1).recommendation).toBe("BET_AWAY");
    // |expected CLV| = 0.5 < τ=1 → PASS (thin forecast never fires)
    expect(forecastAction(flatModel, feat(), 1).recommendation).toBe("PASS");
  });
});

describe("evaluateForecastRmse", () => {
  it("beats the baseline when predictions track the realized move", () => {
    const rows = Array.from({ length: 50 }, (_, i) => {
      const d = ((i % 9) - 4) * 0.5; // varied realized deltas
      return { predictedDelta: d, realizedDelta: d }; // perfect
    });
    const e = evaluateForecastRmse(rows);
    expect(e.rmse).toBeCloseTo(0, 9);
    expect(e.baselineRmse).toBeGreaterThan(0);
    expect(e.rmseImprovement).toBeGreaterThan(0);
    expect(e.directionalAccuracy).toBe(1);
  });

  it("ties the baseline when the forecaster just predicts zero", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      predictedDelta: 0,
      realizedDelta: ((i % 9) - 4) * 0.5,
    }));
    const e = evaluateForecastRmse(rows);
    expect(e.rmseImprovement).toBeCloseTo(0, 9);
  });
});

describe("evaluateClvAtThreshold", () => {
  it("books positive CLV when fired bets land on the favorable side", () => {
    // Predict the line falls (−1); it really falls (−1) → BET_HOME → HOME CLV = +1.
    const rows = Array.from({ length: 10 }, () => ({ predictedDelta: -1, realizedDelta: -1 }));
    const r = evaluateClvAtThreshold(rows, 0.5);
    expect(r.fired).toBe(10);
    expect(r.passed).toBe(0);
    expect(r.beatCloseRate).toBe(1);
    expect(r.meanSignedClv).toBeCloseTo(1, 9);
  });

  it("passes when no forecast clears the threshold", () => {
    const rows = Array.from({ length: 8 }, () => ({ predictedDelta: 0.1, realizedDelta: -1 }));
    const r = evaluateClvAtThreshold(rows, 0.5);
    expect(r.fired).toBe(0);
    expect(r.passed).toBe(8);
    expect(r.beatCloseRate).toBe(0);
  });
});

describe("walkForwardForecast", () => {
  it("beats the Δ̂=0 baseline out-of-sample on a learnable signal", () => {
    // label = 0.4 * driftSoFar, perfectly learnable; features vary by index.
    const samples: ForecastSample[] = Array.from({ length: 120 }, (_, i) => {
      const f = feat({ driftSoFar: ((i % 11) - 5) * 0.5, hoursToKickoff: (i % 7) * 6 });
      return { features: f, label: 0.4 * f.driftSoFar };
    });
    const oos = walkForwardForecast(samples, { minTrain: 30, lambda: 0.001 });
    expect(oos.length).toBeGreaterThan(50);
    const e = evaluateForecastRmse(oos);
    expect(e.rmseImprovement).toBeGreaterThan(0.1 * e.baselineRmse);
    expect(e.directionalAccuracy).toBeGreaterThan(0.9);
  });

  it("does NOT manufacture an improvement when the label is independent of features", () => {
    // Features carry no information; label varies on its own → best fit ≈ predict the mean.
    const samples: ForecastSample[] = Array.from({ length: 120 }, (_, i) => ({
      features: feat({ driftSoFar: 0, crossBookDispersion: 0, independentGap: 0, hoursToKickoff: 10 }),
      label: ((i % 2 === 0 ? 1 : -1) * ((i % 5) + 1)) / 5,
    }));
    const oos = walkForwardForecast(samples, { minTrain: 30, lambda: 1 });
    const e = evaluateForecastRmse(oos);
    expect(e.rmseImprovement).toBeLessThan(0.1);
  });
});
