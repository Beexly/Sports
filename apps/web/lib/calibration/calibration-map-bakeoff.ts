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
  fitResAwareBeta,
  applyOnlineBeta,
  runOcoPipelineFromSingleP,
  runOnlineBetaRecalibration,
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
  /** RES-aware Beta (max val RES s.t. REL cap + λ(a−1)²). Shadow. */
  readonly resAwareBeta?: {
    readonly selected: boolean;
    readonly a: number | null;
    readonly b: number | null;
    readonly valRes: number;
    readonly resGain: number;
    readonly valRel: number;
    readonly valBrier: number;
  };
  /** Online Beta OGD (log-loss) on chrono sample — shadow. */
  readonly onlineBeta?: {
    readonly a: number;
    readonly b: number;
    readonly meanBrierOnline: number;
    readonly meanBrierRaw: number;
    readonly varCalP: number;
    readonly varRawP: number;
    readonly beatsRawBrier: boolean;
  };
  /** Single-stream OCO pipeline summary — shadow. */
  readonly ocoPipeline?: {
    readonly publishedN: number;
    readonly meanBrierPublished: number;
    readonly publishedRes: number;
    readonly publishedVarP: number;
    readonly recommendedDelta: number;
    readonly finalA: number;
    readonly finalB: number;
  };
  /** Full vs sliding-window Online Beta OGD metrics — shadow. */
  readonly slidingWindowOgd?: {
    readonly window: number;
    readonly nFull: number;
    readonly nWindow: number;
    readonly fullA: number;
    readonly windowA: number;
    readonly deltaA: number;
    readonly deltaVarCal: number;
    readonly expansionPreferred: "full" | "window" | "neither";
    readonly operatorHint: string;
  };
  /** Hedge adaptive-δ analysis — shadow advisory. */
  readonly hedgeAdaptiveDelta?: {
    readonly recommendedDelta: number;
    readonly bestFixedDelta: number;
    readonly regretVsBestFixed: number;
    readonly weightOnRecommended: number;
    readonly publishedBrier: number;
    readonly sitOutBrier: number;
    readonly integrityStatus: string;
    readonly operatorHint: string;
  };
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


  // RES-aware Beta (grid max RES s.t. REL) + online Beta OGD + OCO single-p (all shadow)
  const resFit = fitResAwareBeta(samplesChrono, {
    trainFrac,
    maxRel: 0.015,
    lambdaA: 0.1,
  });
  if (resFit.selected && resFit.params) {
    methods.push(
      decomp(
        "res_aware_beta",
        test.map((r) => ({
          p: applyOnlineBeta(r.p, resFit.params!),
          y: r.y,
        })),
      ),
    );
  } else {
    methods.push({
      method: "res_aware_beta",
      n: test.length,
      brier: NaN,
      ece: NaN,
      reliability: NaN,
      resolution: NaN,
      uncertainty: NaN,
      logLoss: NaN,
    });
  }

  const chronoTagged = samplesChrono.map((r, i) => ({ ...r, sampleId: `c${i}`, t: i }));
  const onlineBetaRep = runOnlineBetaRecalibration(chronoTagged);
  const ocoRep = runOcoPipelineFromSingleP(chronoTagged);
  const slidingOgd = analyzeSlidingWindowOgd(chronoTagged, { window: 120 });
  const hedgeAnalysis = analyzeAdaptiveDeltaHedge(
    chronoTagged.map((s) => ({
      sampleId: s.sampleId,
      p: s.p,
      y: s.y as 0 | 1,
      t: s.t,
    })),
  );

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
      "RES-aware Beta can raise Val RES when underconfident (a>1) under REL cap — still shadow. " +
      "Online Beta OGD + sliding-window OGD + OCO + Hedge-δ analysis are shadow; live eligibility stays map-free. " +
      "Temperature fit = grid + Newton NLL. CV selectCalibrator = OOF ECE + noise bar.",
    rankingFirst:
      "Live Res thin ⇒ independents + selective/pause first. RES-cal / OCO may expand Var[P] only when data support underconfidence — never free stretch.",
    bestByBrier,
    bestByLogLoss,
    cvSelect,
    isotonicDebug,
    logLossDiagnose,
    temperatureT: tempPkg?.T ?? tempLocal.T ?? null,
    resAwareBeta: {
      selected: resFit.selected,
      a: resFit.params?.a ?? null,
      b: resFit.params?.b ?? null,
      valRes: resFit.valRes,
      resGain: resFit.resGain,
      valRel: resFit.valRel,
      valBrier: resFit.valBrier,
    },
    onlineBeta: {
      a: onlineBetaRep.finalParams.a,
      b: onlineBetaRep.finalParams.b,
      meanBrierOnline: onlineBetaRep.meanBrierOnline,
      meanBrierRaw: onlineBetaRep.meanBrierRaw,
      varCalP: onlineBetaRep.varCalP,
      varRawP: onlineBetaRep.varRawP,
      beatsRawBrier: onlineBetaRep.beatsRawBrier,
    },
    ocoPipeline: {
      publishedN: ocoRep.publishedN,
      meanBrierPublished: ocoRep.meanBrierPublished,
      publishedRes: ocoRep.publishedRes,
      publishedVarP: ocoRep.publishedVarP,
      recommendedDelta: ocoRep.recommendedDelta,
      finalA: ocoRep.finalBeta.a,
      finalB: ocoRep.finalBeta.b,
    },
    slidingWindowOgd: {
      window: slidingOgd.window,
      nFull: slidingOgd.nFull,
      nWindow: slidingOgd.nWindow,
      fullA: slidingOgd.full.a,
      windowA: slidingOgd.sliding.a,
      deltaA: slidingOgd.deltaA,
      deltaVarCal: slidingOgd.deltaVarCal,
      expansionPreferred: slidingOgd.expansionPreferred,
      operatorHint: slidingOgd.operatorHint,
    },
    hedgeAdaptiveDelta: {
      recommendedDelta: hedgeAnalysis.report.recommendedDelta,
      bestFixedDelta: hedgeAnalysis.report.bestFixedDelta,
      regretVsBestFixed: hedgeAnalysis.regretVsBestFixed,
      weightOnRecommended: hedgeAnalysis.weightOnRecommended,
      publishedBrier: hedgeAnalysis.publishedBrier,
      sitOutBrier: hedgeAnalysis.sitOutBrier,
      integrityStatus: hedgeAnalysis.integrityStatus,
      operatorHint: hedgeAnalysis.operatorHint,
    },
    applyOff: true,
  };
}
