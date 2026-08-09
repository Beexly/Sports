/**
 * Offline map bake-off: Raw | Temperature | Platt | Isotonic PAVA
 * Full Murphy Brier decomposition on each. Apply OFF.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";
import { fitPlattFromProbs, applyPlattToProb } from "@/lib/calibration/platt-scaling";
import { fitIsotonicPava, applyIsotonic, applyIsotonicCir } from "@/lib/calibration/isotonic-pava";
import { fitTemperature, temperaturePredict } from "@/lib/calibration/temperature-map";

// temperature-map may export logit differently - use local
function logit(p: number): number {
  const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return Math.log(x / (1 - x));
}

export type MapDecompRow = {
  readonly method: string;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly logLoss: number;
};

function logLoss(samples: readonly CalibrationSample[]): number {
  const eps = 1e-15;
  if (samples.length === 0) return NaN;
  let s = 0;
  for (const r of samples) {
    const p = Math.min(1 - eps, Math.max(eps, r.p));
    s += r.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / samples.length;
}

function decomp(method: string, samples: readonly CalibrationSample[]): MapDecompRow {
  if (samples.length === 0) {
    return {
      method,
      n: 0,
      brier: NaN,
      ece: NaN,
      reliability: NaN,
      resolution: NaN,
      uncertainty: NaN,
      logLoss: NaN,
    };
  }
  const d = brierDecomposition(samples);
  return {
    method,
    n: samples.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    reliability: d.reliability,
    resolution: d.resolution,
    uncertainty: d.uncertainty,
    logLoss: logLoss(samples),
  };
}

export type CalibrationMapBakeoff = {
  readonly generatedAt: string;
  readonly nTrain: number;
  readonly nTest: number;
  readonly methods: readonly MapDecompRow[];
  readonly note: string;
  readonly rankingFirst: string;
};

/**
 * Time-ordered holdout: first trainFrac train, rest test.
 * Fits maps on train, evaluates Murphy decomp on test.
 */
export function runCalibrationMapBakeoff(
  samplesChrono: readonly CalibrationSample[],
  trainFrac = 0.7,
): CalibrationMapBakeoff {
  const n = samplesChrono.length;
  const cut = Math.max(1, Math.floor(n * trainFrac));
  const train = samplesChrono.slice(0, cut);
  const test = samplesChrono.slice(cut);
  const generatedAt = new Date().toISOString();

  if (test.length === 0) {
    return {
      generatedAt,
      nTrain: train.length,
      nTest: 0,
      methods: [],
      note: "Insufficient holdout.",
      rankingFirst:
        "If resolution stays near 0, maps cannot unlock PROVEN — raise ranking first.",
    };
  }

  const trainY = train.map((r) => ({ p: r.p, y: r.y as 0 | 1 }));
  const platt = fitPlattFromProbs(trainY);
  const iso = fitIsotonicPava(trainY);
  const temp = fitTemperature(
    train.map((r) => ({ logit: logit(r.p), outcome: r.y as 0 | 1 })),
  );

  const methods: MapDecompRow[] = [
    decomp("raw", test),
    decomp(
      "temperature",
      test.map((r) => ({
        p: temperaturePredict(logit(r.p), temp.T),
        y: r.y,
      })),
    ),
    decomp(
      "platt_map_irls",
      test.map((r) => ({
        p: applyPlattToProb(r.p, platt.A, platt.B),
        y: r.y,
      })),
    ),
    decomp(
      "isotonic_pava",
      test.map((r) => ({
        p: applyIsotonic(r.p, iso),
        y: r.y,
      })),
    ),
    decomp(
      "isotonic_cir",
      test.map((r) => ({
        p: applyIsotonicCir(r.p, iso),
        y: r.y,
      })),
    ),
  ];

  return {
    generatedAt,
    nTrain: train.length,
    nTest: test.length,
    methods,
    note:
      "Offline only. Apply CALIBRATION_ADJUSTMENTS only after Res improves and holdout floors pass. " +
      "Maps primarily cut reliability (REL), not resolution (RES).",
    rankingFirst:
      "Live Res≈0.002 ⇒ selective publish + sport models before enabling any map.",
  };
}
