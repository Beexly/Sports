/**
 * Isotonic regression diagnostics — offline R&D only.
 *
 * Explains WHY PAVA helped or hurt: plateau collapse, SSE, ranking
 * preservation, OOS Brier/NLL. Prefer CIR when distinct-value collapse
 * destroys ranking/Kelly. Apply remains OFF (CALIBRATION_ADJUSTMENTS).
 */

import {
  isotonicCalibration,
  centeredIsotonicCalibration,
  countDistinctPredictions,
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
  type IsotonicModel,
} from "./probability-calibration.js";
import { meanLogLoss } from "./certificate/proper-scoring.js";

export type IsotonicDebugReport = {
  readonly n: number;
  readonly nPlateaus: number;
  readonly nDistinctRaw: number;
  readonly nDistinctPava: number;
  readonly nDistinctCir: number;
  /** Fraction of raw distinct forecasts collapsed by PAVA plateaus. */
  readonly plateauCollapseRate: number;
  readonly inSampleSsePava: number;
  readonly inSampleSseCir: number;
  readonly inSampleSseRaw: number;
  readonly inSampleBrierRaw: number;
  readonly inSampleBrierPava: number;
  readonly inSampleBrierCir: number;
  readonly inSampleLogLossRaw: number;
  readonly inSampleLogLossPava: number;
  readonly inSampleLogLossCir: number;
  readonly inSampleEceRaw: number;
  readonly inSampleEcePava: number;
  readonly inSampleEceCir: number;
  /** Spearman-ish: fraction of pairs that keep order after map (1 = order-preserving). */
  readonly rankingPreservationPava: number;
  readonly rankingPreservationCir: number;
  readonly recommendation: "identity" | "isotonic_pava" | "isotonic_cir" | "prefer_parametric";
  readonly operatorHint: string;
  readonly applyOff: true;
};

function sse(samples: readonly CalibrationSample[], predict: (p: number) => number): number {
  let s = 0;
  for (const r of samples) {
    const e = predict(r.p) - r.y;
    s += e * e;
  }
  return samples.length === 0 ? NaN : s;
}

function mappedSamples(
  samples: readonly CalibrationSample[],
  predict: (p: number) => number,
): CalibrationSample[] {
  return samples.map((r) => ({ p: predict(r.p), y: r.y }));
}

/** Pairwise ranking preservation in [0,1] on a subsample for speed. */
function rankingPreservation(
  samples: readonly CalibrationSample[],
  predict: (p: number) => number,
  maxPairs = 2000,
): number {
  if (samples.length < 2) return 1;
  const idx = samples.map((_, i) => i);
  // stride subsample
  const step = Math.max(1, Math.floor(samples.length / 80));
  const pts = idx.filter((_, i) => i % step === 0).slice(0, 80);
  let agree = 0;
  let total = 0;
  for (let a = 0; a < pts.length; a++) {
    for (let b = a + 1; b < pts.length; b++) {
      if (total >= maxPairs) return total === 0 ? 1 : agree / total;
      const i = pts[a]!;
      const j = pts[b]!;
      const dp = samples[i]!.p - samples[j]!.p;
      const dq = predict(samples[i]!.p) - predict(samples[j]!.p);
      if (Math.abs(dp) < 1e-12) continue;
      total += 1;
      if (dp * dq > 0 || Math.abs(dq) < 1e-12) agree += 1;
    }
  }
  return total === 0 ? 1 : agree / total;
}

/**
 * Full isotonic debug on a sample (in-sample — pair with holdout bake-off).
 */
export function debugIsotonicCalibration(
  samples: readonly CalibrationSample[],
): IsotonicDebugReport {
  const n = samples.length;
  const identity = (p: number) => Math.min(1, Math.max(0, p));
  if (n === 0) {
    return {
      n: 0,
      nPlateaus: 0,
      nDistinctRaw: 0,
      nDistinctPava: 0,
      nDistinctCir: 0,
      plateauCollapseRate: NaN,
      inSampleSsePava: NaN,
      inSampleSseCir: NaN,
      inSampleSseRaw: NaN,
      inSampleBrierRaw: NaN,
      inSampleBrierPava: NaN,
      inSampleBrierCir: NaN,
      inSampleLogLossRaw: NaN,
      inSampleLogLossPava: NaN,
      inSampleLogLossCir: NaN,
      inSampleEceRaw: NaN,
      inSampleEcePava: NaN,
      inSampleEceCir: NaN,
      rankingPreservationPava: NaN,
      rankingPreservationCir: NaN,
      recommendation: "identity",
      operatorHint: "Empty sample — no isotonic fit.",
      applyOff: true,
    };
  }

  const pava: IsotonicModel = isotonicCalibration(samples);
  const cir: IsotonicModel = centeredIsotonicCalibration(samples);
  const rawVals = samples.map((s) => s.p);
  const nDistinctRaw = new Set(rawVals.map((p) => Math.round(p * 1e6) / 1e6)).size;
  const mappedPava = mappedSamples(samples, pava.predict);
  const mappedCir = mappedSamples(samples, cir.predict);
  const nDistinctPava = countDistinctPredictions(pava);
  const nDistinctCir = countDistinctPredictions(cir);
  const nPlateaus = pava.points.length;

  const rawB = brierDecomposition(samples);
  const pavaB = brierDecomposition(mappedPava);
  const cirB = brierDecomposition(mappedCir);

  const collapse =
    nDistinctRaw > 0 ? Math.max(0, 1 - nDistinctPava / nDistinctRaw) : 0;

  const rankPava = rankingPreservation(samples, pava.predict);
  const rankCir = rankingPreservation(samples, cir.predict);

  const nllRaw = meanLogLoss(samples.map((r) => ({ p: r.p, y: r.y })));
  const nllPava = meanLogLoss(mappedPava.map((r) => ({ p: r.p, y: r.y })));
  const nllCir = meanLogLoss(mappedCir.map((r) => ({ p: r.p, y: r.y })));

  // Prefer parametric when plateaus destroy ranking and n is small
  let recommendation: IsotonicDebugReport["recommendation"] = "identity";
  let hint = "In-sample diagnostics only — confirm on holdout bake-off before any apply.";

  if (n < 50) {
    recommendation = "prefer_parametric";
    hint =
      "n<50: prefer Temperature/Platt (low variance) over PAVA plateaus. Apply still OFF.";
  } else if (pavaB.brier < rawB.brier - 1e-4 && collapse < 0.5) {
    recommendation = "isotonic_pava";
    hint =
      "PAVA improves in-sample Brier with moderate plateau collapse. Verify OOS; apply OFF.";
  } else if (cirB.brier <= pavaB.brier + 1e-4 && rankCir > rankPava + 0.02) {
    recommendation = "isotonic_cir";
    hint =
      "CIR preserves ranking better than PAVA plateaus at similar Brier. Apply OFF.";
  } else if (collapse > 0.55 || rankPava < 0.85) {
    recommendation = "prefer_parametric";
    hint =
      "High plateau collapse / ranking damage — prefer Temp/Platt/Beta offline. Apply OFF.";
  } else if (nllPava < nllRaw - 1e-4) {
    recommendation = nDistinctCir > nDistinctPava ? "isotonic_cir" : "isotonic_pava";
    hint = "NLL improved in-sample; still need holdout confirmation. Apply OFF.";
  } else {
    recommendation = "identity";
    hint = "Maps do not clearly help in-sample — keep identity; raise RES first.";
  }

  return {
    n,
    nPlateaus,
    nDistinctRaw,
    nDistinctPava,
    nDistinctCir,
    plateauCollapseRate: collapse,
    inSampleSsePava: sse(samples, pava.predict),
    inSampleSseCir: sse(samples, cir.predict),
    inSampleSseRaw: sse(samples, identity),
    inSampleBrierRaw: rawB.brier,
    inSampleBrierPava: pavaB.brier,
    inSampleBrierCir: cirB.brier,
    inSampleLogLossRaw: nllRaw,
    inSampleLogLossPava: nllPava,
    inSampleLogLossCir: nllCir,
    inSampleEceRaw: expectedCalibrationError(samples),
    inSampleEcePava: expectedCalibrationError(mappedPava),
    inSampleEceCir: expectedCalibrationError(mappedCir),
    rankingPreservationPava: rankPava,
    rankingPreservationCir: rankCir,
    recommendation,
    operatorHint: hint,
    applyOff: true,
  };
}
