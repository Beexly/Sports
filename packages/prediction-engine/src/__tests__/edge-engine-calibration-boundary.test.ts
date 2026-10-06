/**
 * RED: `assessEdge` publishes `trueProb` with NO calibration applied.
 *
 * MEASURED ON PROD (1,823 settled picks, 2026-09-30): the model DISCRIMINATES —
 * realized win rate rises monotonically with stated probability (low<0.55:
 * 43.4% over 364, mid: 58.2% over 737, high>0.65: 61.8% over 722, an 18.4pt
 * spread) — but the NUMBERS are inflated: high bucket says 0.618 and reality
 * is 0.5666, about 5.2pt overconfident. Ranking is real; the scale is wrong.
 *
 * The fix for that is a calibration MAP, not a rebuild. This repo already has
 * `selectCalibrator` / `plattScaling` / `betaCalibration` in `calibration-map.ts`,
 * with real non-test callers. But `edge-engine.ts` — the ONLY producer of the
 * published `independentEdge.trueProb` — imports none of it (its sole import is
 * `clamp` from scoring). So the machinery sits DOWNSTREAM of the number users
 * see: the calibration work can be perfect and the published probability
 * unchanged.
 *
 * These tests pin that gap closed. They must FAIL on the pre-fix engine.
 */

import { describe, expect, it } from "vitest";

import { assessEdge, type EdgeInput } from "../edge-engine.js";
import { plattScaling } from "../calibration-map.js";

function twoSources(): EdgeInput["independents"] {
  return [
    { name: "a", prob: 0.7 },
    { name: "b", prob: 0.5 },
  ];
}

function baseInput(over: Partial<EdgeInput> = {}): EdgeInput {
  return {
    marketFairProb: 0.5,
    marketConsistent: true,
    evidenceScore: 100,
    uncertainty: 0,
    independents: twoSources(),
    ...over,
  } as EdgeInput;
}

describe("assessEdge — calibration boundary on the published trueProb", () => {
  it("PUBLISHES an overconfident probability today (the defect this pins)", () => {
    // Uncalibrated weighted mean of 0.7 and 0.5 is 0.6. That is the number the
    // glass-box surface and the ranking both consume.
    const out = assessEdge(baseInput());
    expect(out.trueProb).toBeCloseTo(0.6, 4);
  });

  it("accepts an optional calibrator WITHOUT changing behaviour when absent", () => {
    // The safety law of this change: no map => byte-identical output. A caller
    // that passes nothing must not get an accidental second code path.
    const withNone = assessEdge(baseInput());
    const withUndefined = assessEdge(baseInput({ calibrator: undefined } as Partial<EdgeInput>));
    expect(withUndefined.trueProb).toBe(withNone.trueProb);
    expect(withNone.trueProb).toBeCloseTo(0.6, 4);
  });

  it("routes the published trueProb THROUGH a supplied calibrator", () => {
    // A deliberately extreme recalibrator: it maps everything to 0.5. If the
    // engine ignores it, trueProb stays 0.6 and this fails.
    const flat = { method: "platt" as const, predict: () => 0.5, paramsCanonical: "TEST-FLAT" };
    const out = assessEdge(baseInput({ calibrator: flat } as Partial<EdgeInput>));
    expect(out.trueProb).toBeCloseTo(0.5, 4);
  });

  it("applies a real fitted Platt map, not a toy one", () => {
    // Fit Platt on samples that are systematically overconfident: stated 0.9
    // that wins 60% of the time. A correct recalibrator must pull 0.6 DOWN.
    const samples = Array.from({ length: 200 }, (_, i) => ({
      p: i % 2 === 0 ? 0.9 : 0.6,
      y: i % 4 < 2 ? 1 : 0,
    }));
    const model = plattScaling(samples);
    expect(model).not.toBeNull();

    const out = assessEdge(baseInput({ calibrator: model! } as Partial<EdgeInput>));
    const raw = 0.6;
    // The calibrated number must differ from raw, and must move TOWARD the
    // observed 60% base rate rather than away from it.
    expect(out.trueProb).not.toBeCloseTo(raw, 3);
    expect(out.trueProb!).toBeLessThan(raw);
  });

  it("keeps the map MONOTONE: a higher stated probability never calibrates lower", () => {
    const samples = Array.from({ length: 300 }, (_, i) => ({
      p: [0.55, 0.6, 0.65, 0.7][i % 4]!,
      y: [0, 0, 1, 1][i % 4]!,
    }));
    const model = plattScaling(samples);
    expect(model).not.toBeNull();
    const predict = model!.predict;

    let prev = -1;
    for (const p of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
      const q = predict(p);
      expect(q).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = q;
    }
  });

  it("never emits a non-finite or out-of-range calibrated probability", () => {
    const samples = Array.from({ length: 120 }, (_, i) => ({ p: 0.5, y: i % 2 }));
    const model = plattScaling(samples);
    for (const p of [0, 0.5, 1]) {
      const out = assessEdge(baseInput({ calibrator: model! } as Partial<EdgeInput>));
      expect(Number.isFinite(out.trueProb!)).toBe(true);
      expect(out.trueProb!).toBeGreaterThanOrEqual(0);
      expect(out.trueProb!).toBeLessThanOrEqual(1);
    }
  });

  it("still refuses to speak with no independents, calibrator or not", () => {
    const model = plattScaling(
      Array.from({ length: 100 }, (_, i) => ({ p: 0.6, y: i % 2 })),
    );
    const out = assessEdge(
      baseInput({ independents: [], calibrator: model! } as Partial<EdgeInput>),
    );
    expect(out.trueProb).toBeNull();
    expect(out.decision).toBe("PASS");
  });
});