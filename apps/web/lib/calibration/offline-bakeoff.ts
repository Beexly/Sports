/**
 * Offline time-holdout bake-off: Raw vs Temperature vs Platt MLE vs Platt MAP vs EB bins.
 * Internal artifact only — never production maps / eligibility.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";
import { fitPlatt, fitPlattMap, applyPlatt, fitPlattMapHierarchical, type ProbOutcome } from "@/lib/calibration/platt-map";
import { shrinkBin, fitEmpiricalBayesNu } from "@/lib/calibration/bayes-bins";
import { fitIsotonicPava, applyIsotonic } from "@/lib/calibration/isotonic-pava";

export interface BakeoffMethodResult {
  readonly method: string;
  readonly nTest: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyReliability: number;
  readonly murphyResolution: number;
  readonly murphyUncertainty: number;
  readonly logLoss: number;
}

export interface BakeoffReport {
  readonly generatedAt: string;
  readonly nTrain: number;
  readonly nTest: number;
  readonly methods: readonly BakeoffMethodResult[];
  readonly note: string;
}

function logLoss(samples: readonly { p: number; y: 0 | 1 }[]): number {
  const eps = 1e-15;
  if (samples.length === 0) return NaN;
  let s = 0;
  for (const r of samples) {
    const p = Math.min(1 - eps, Math.max(eps, r.p));
    s += r.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / samples.length;
}

function score(samples: readonly CalibrationSample[]): Omit<BakeoffMethodResult, "method" | "nTest"> {
  if (samples.length === 0) {
    return {
      brier: NaN,
      ece: NaN,
      murphyReliability: NaN,
      murphyResolution: NaN,
      murphyUncertainty: NaN,
      logLoss: NaN,
    };
  }
  const decomp = brierDecomposition(samples);
  return {
    brier: decomp.brier,
    ece: expectedCalibrationError(samples),
    murphyReliability: decomp.reliability,
    murphyResolution: decomp.resolution,
    murphyUncertainty: decomp.uncertainty,
    logLoss: logLoss(samples),
  };
}

/** Fit temperature T minimizing Brier on train (grid). */
export function fitTemperature(train: readonly ProbOutcome[]): number {
  let bestT = 1;
  let bestB = Infinity;
  for (let t = 0.5; t <= 3.0; t += 0.1) {
    const mapped: CalibrationSample[] = train.map((r) => {
      // temperature on logit
      const p = Math.min(1 - 1e-6, Math.max(1e-6, r.p));
      const logit = Math.log(p / (1 - p)) / t;
      const q = 1 / (1 + Math.exp(-logit));
      return { p: q, y: r.y };
    });
    const b = brierDecomposition(mapped).brier;
    if (b < bestB) {
      bestB = b;
      bestT = t;
    }
  }
  return bestT;
}

function applyTemperature(p: number, T: number): number {
  const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
  const logit = Math.log(x / (1 - x)) / T;
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Time holdout: first trainFrac chronologically train, rest test.
 * samples assumed oldest→newest or any order if already sliced.
 */
export function runOfflineBakeoff(
  samplesChrono: readonly CalibrationSample[],
  trainFrac = 0.7,
  groupKeysChrono?: readonly string[],
): BakeoffReport {
  const n = samplesChrono.length;
  const cut = Math.max(1, Math.floor(n * trainFrac));
  const train = samplesChrono.slice(0, cut) as ProbOutcome[];
  const test = samplesChrono.slice(cut);
  const generatedAt = new Date().toISOString();

  if (test.length === 0) {
    return {
      generatedAt,
      nTrain: train.length,
      nTest: 0,
      methods: [],
      note: "Insufficient samples for holdout — R&D only.",
    };
  }

  const T = fitTemperature(train);
  const plattMle = fitPlatt(train, { map: false });
  const plattMap = fitPlattMap(train);

  // EB bins from train reliability-style 10 bins
  const trainBins = Array.from({ length: 10 }, (_, i) => {
    const lo = i / 10;
    const hi = (i + 1) / 10;
    let wins = 0;
    let nn = 0;
    let sumP = 0;
    for (const r of train) {
      if (r.p >= lo && (i === 9 ? r.p <= hi : r.p < hi)) {
        nn += 1;
        wins += r.y;
        sumP += r.p;
      }
    }
    return { meanForecast: nn ? sumP / nn : (lo + hi) / 2, wins, n: nn };
  });
  const eb = fitEmpiricalBayesNu(trainBins);

  const methods: BakeoffMethodResult[] = [];

  const raw = score(test);
  methods.push({ method: "raw", nTest: test.length, ...raw });

  const tempMapped = test.map((r) => ({ p: applyTemperature(r.p, T), y: r.y }));
  methods.push({ method: "temperature", nTest: test.length, ...score(tempMapped) });

  const mleMapped = test.map((r) => ({ p: applyPlatt(r.p, plattMle), y: r.y }));
  methods.push({ method: "platt_mle", nTest: test.length, ...score(mleMapped) });

  const mapMapped = test.map((r) => ({ p: applyPlatt(r.p, plattMap), y: r.y }));
  methods.push({ method: "platt_map", nTest: test.length, ...score(mapMapped) });

  const iso = fitIsotonicPava(train.map((r) => ({ p: r.p, y: r.y as 0 | 1 }))); // true PAVA
  const isoMapped = test.map((r) => ({ p: applyIsotonic(r.p, iso), y: r.y }));
  methods.push({ method: "isotonic_pava", nTest: test.length, ...score(isoMapped) });

  // EB bin: map p to shrunk rate of containing bin
  const ebMapped = test.map((r) => {
    const idx = Math.min(9, Math.floor(r.p * 10));
    const b = trainBins[idx]!;
    const p = shrinkBin(b.wins, b.n, eb.priorMean, eb.nu);
    return { p, y: r.y };
  });
  methods.push({ method: "eb_bins", nTest: test.length, ...score(ebMapped) });

  // Hierarchical MAP Platt (global A,B + EB τ group intercepts) when group keys present
  if (groupKeysChrono && groupKeysChrono.length === samplesChrono.length) {
    const trainG = train.map((r, i) => ({
      ...r,
      groupKey: groupKeysChrono[i] ?? "unknown",
    }));
    const h = fitPlattMapHierarchical(trainG);
    const hMapped = test.map((r, i) => {
      const gk = groupKeysChrono[cut + i] ?? "unknown";
      const u = h.groupIntercept[gk] ?? 0;
      const p = applyPlatt(r.p, h.global);
      // apply intercept in logit space
      const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
      const logit = Math.log(x / (1 - x)) + u;
      const q = 1 / (1 + Math.exp(-logit));
      return { p: q, y: r.y };
    });
    methods.push({
      method: `hierarchical_eb(tau=${h.tau.toFixed(3)})`,
      nTest: test.length,
      ...score(hMapped),
    });
  }

  return {
    generatedAt,
    nTrain: train.length,
    nTest: test.length,
    methods,
    note: "Offline R&D bake-off only. Does not enable CALIBRATION_ADJUSTMENTS or publish.",
  };
}
