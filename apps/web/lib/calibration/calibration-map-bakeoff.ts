/**
 * Offline map bake-off: Raw | Temperature (Newton NLL) | Platt | Beta | Isotonic PAVA | CIR
 * Full Murphy Brier decomposition + log loss on each. Apply OFF.
 *
 * Plus: CV selectCalibrator (ECE), isotonic debug (plateaus/ranking), log-loss diagnose.
 * Does NOT re-implement calibrators — package + web helpers. Ranking-first note preserved.
 */

import type { CalibrationSample, IsotonicDebugReport, LogLossSliceReport } from "@sports/prediction-engine";
import {
  betaCalibration,
  brierDecomposition,
  expectedCalibrationError,
  fitTemperature as fitTempPackage,
  fitTemperatureNewton,
  applyTemperature,
  selectCalibrator,
  debugIsotonicCalibration,
  diagnoseLogLoss,
  meanLogLoss,
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
    logLoss: meanLogLoss(samples.map((r) => ({ p: r.p, y: r.y }))),
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
  /** Package CV selector (OOF equal-mass ECE + noise bar). */
  readonly cvSelect?: {
    readonly recommended: string;
    readonly rawOofEce: number;
    readonly nullGainMargin: number;
    readonly scores: readonly { method: string; oofEce: number | null }[];
  };
  /** In-sample isotonic plateaus / ranking diagnostics (apply OFF). */
  readonly isotonicDebug?: IsotonicDebugReport;
  /** Full-sample log-loss geometry. */
  readonly logLossDiagnose?: LogLossSliceReport;
  /** Fitted T from Newton NLL (train), if available. */
  readonly temperatureT?: number | null;
  readonly applyOff: true;
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

  const isotonicDebug = debugIsotonicCalibration(samplesChrono);
  const logLossDiagnose = diagnoseLogLoss(samplesChrono);

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
      isotonicDebug,
      logLossDiagnose,
      temperatureT: null,
      applyOff: true,
    };
  }

  const trainY = train.map((r) => ({ p: r.p, y: r.y as 0 | 1 }));
  const platt = fitPlattFromProbs(trainY);
  const iso = fitIsotonicPava(trainY);
  const tempNewton = fitTemperatureNewton(trainY);
  const tempPkg = tempNewton ?? fitTempPackage(trainY);
  const tempLocal = fitTempLocal(
    train.map((r) => ({ logit: logit(r.p), outcome: r.y as 0 | 1 })),
  );
  const beta = betaCalibration(trainY);

  // CV family selection on full chrono sample (internal folds) — ECE objective
  let cvSelect: CalibrationMapBakeoff["cvSelect"];
  try {
    if (samplesChrono.length >= 40) {
      const sel = selectCalibrator(samplesChrono);
      if (sel) {
        cvSelect = {
          recommended: sel.recommended,
          rawOofEce: sel.rawOofEce,
          nullGainMargin: sel.nullGainMargin,
          scores: sel.scores.map((s) => ({
            method: s.method,
            oofEce: s.oofEce,
          })),
        };
      }
    }
  } catch {
    cvSelect = undefined;
  }

  const methods: MapDecompRow[] = [
    decomp("raw", test),
    decomp(
      "temperature_nll",
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
      "Maps cut REL + log-loss, not RES. Temperature fit = grid + Newton NLL. " +
      "CV selectCalibrator uses OOF equal-mass ECE + noise bar. Isotonic debug is in-sample.",
    rankingFirst:
      "Live Res thin ⇒ selective + independents before enabling any map. Maps never unlock PROVEN alone.",
    bestByBrier,
    bestByLogLoss,
    cvSelect,
    isotonicDebug,
    logLossDiagnose,
    temperatureT: tempPkg?.T ?? tempLocal.T ?? null,
    applyOff: true,
  };
}
