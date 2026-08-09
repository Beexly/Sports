/**
 * Offline map bake-off: Raw | Temperature | Platt | Beta | Isotonic PAVA | CIR
 * Full Murphy Brier decomposition + log loss on each. Apply OFF.
 *
 * Does NOT re-implement calibrators — uses package betaCalibration / fitTemperature
 * and existing web Platt / PAVA helpers. Ranking-first note preserved.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  betaCalibration,
  brierDecomposition,
  expectedCalibrationError,
  fitTemperature as fitTempPackage,
  applyTemperature,
} from "@sports/prediction-engine";
import { fitPlattFromProbs, applyPlattToProb } from "@/lib/calibration/platt-scaling";
import { fitIsotonicPava, applyIsotonic, applyIsotonicCir } from "@/lib/calibration/isotonic-pava";
import { fitTemperature as fitTempLocal, temperaturePredict } from "@/lib/calibration/temperature-map";

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
  /** Best map by holdout Brier (not RES — maps do not raise RES). */
  readonly bestByBrier: string | null;
  /** Best map by holdout log loss. */
  readonly bestByLogLoss: string | null;
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
      bestByBrier: null,
      bestByLogLoss: null,
    };
  }

  const trainY = train.map((r) => ({ p: r.p, y: r.y as 0 | 1 }));
  const platt = fitPlattFromProbs(trainY);
  const iso = fitIsotonicPava(trainY);
  const tempPkg = fitTempPackage(trainY);
  // Local grid-fit as fallback if package returns null (degenerate train)
  const tempLocal = fitTempLocal(
    train.map((r) => ({ logit: logit(r.p), outcome: r.y as 0 | 1 })),
  );
  const beta = betaCalibration(trainY);

  const methods: MapDecompRow[] = [
    decomp("raw", test),
    decomp(
      "temperature",
      test.map((r) => ({
        p: tempPkg
          ? applyTemperature(r.p, tempPkg.T)
          : temperaturePredict(logit(r.p), tempLocal.T),
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
  ];

  if (beta != null) {
    methods.push(
      decomp(
        "beta_calibration",
        test.map((r) => ({
          p: beta.predict(r.p),
          y: r.y,
        })),
      ),
    );
  } else {
    methods.push({
      method: "beta_calibration",
      n: test.length,
      brier: NaN,
      ece: NaN,
      reliability: NaN,
      resolution: NaN,
      uncertainty: NaN,
      logLoss: NaN,
    });
  }

  methods.push(
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
  );

  const finite = methods.filter((m) => Number.isFinite(m.brier));
  let bestByBrier: string | null = null;
  let bestByLogLoss: string | null = null;
  let bestB = Infinity;
  let bestL = Infinity;
  for (const m of finite) {
    if (m.brier < bestB) {
      bestB = m.brier;
      bestByBrier = m.method;
    }
    if (Number.isFinite(m.logLoss) && m.logLoss < bestL) {
      bestL = m.logLoss;
      bestByLogLoss = m.method;
    }
  }

  return {
    generatedAt,
    nTrain: train.length,
    nTest: test.length,
    methods,
    note:
      "Offline only. Apply CALIBRATION_ADJUSTMENTS only after Res improves and holdout floors pass. " +
      "Maps primarily cut reliability (REL) and log loss, not resolution (RES). " +
      "Beta (Kull 2017) includes identity map; Platt cannot. CIR preserves ranking vs PAVA plateaus.",
    rankingFirst:
      "Live Res≈0.002 ⇒ selective publish + independent modelProb / sport models before enabling any map.",
    bestByBrier,
    bestByLogLoss,
  };
}
