/**
 * Online Beta recalibration via Online Gradient Descent on log-loss.
 *
 * Map (Kull-style 2-param / Platt-on-logit):
 *   g_{a,b}(p) = σ(a · logit(p) + b)
 *
 * Cross-entropy in (a,b) is jointly convex:
 *   f(a,b) = −y·s + log(1+e^s),  s = a·z + b,  z = logit(p_raw)
 *   ∇f = (σ(s) − y) · (z, 1)
 *
 * OGD: θ_{t+1} = Π_K (θ_t − η_t ∇f_t)
 * with box constraints (a ∈ [aMin,aMax], b ∈ [bMin,bMax]).
 *
 * a > 1 expands underconfident mass near 0.5 → raises Var[g(P)] / RES when
 * data support it; a = 1, b = 0 is identity.
 *
 * R&D / shadow only. Does NOT flip CALIBRATION_ADJUSTMENTS or live eligibility.
 * Live p stays map-free until gates open.
 */

import type { CalibrationSample } from "./probability-calibration.js";
import { brierDecomposition } from "./probability-calibration.js";

const EPS = 1e-9;

function clampUnit(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function logit(p: number): number {
  const c = clampUnit(p);
  return Math.log(c / (1 - c));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export type OnlineBetaParams = {
  readonly a: number;
  readonly b: number;
};

export type OnlineBetaOptions = {
  readonly a0?: number;
  readonly b0?: number;
  readonly learningRate?: number;
  readonly etaSchedule?: "constant" | "one_over_sqrt_t";
  readonly aMin?: number;
  readonly aMax?: number;
  readonly bMin?: number;
  readonly bMax?: number;
  /** Optional L2 pull of a toward 1 (identity stretch). */
  readonly aIdentityPull?: number;
};

export type OnlineBetaStep = {
  readonly sampleId: string;
  readonly rawP: number;
  readonly calP: number;
  readonly y: 0 | 1;
  readonly aBefore: number;
  readonly bBefore: number;
  readonly logLoss: number;
  readonly brier: number;
};

export type OnlineBetaReport = {
  readonly n: number;
  readonly finalParams: OnlineBetaParams;
  readonly meanLogLossOnline: number;
  readonly meanBrierOnline: number;
  readonly meanBrierRaw: number;
  readonly meanLogLossRaw: number;
  readonly beatsRawBrier: boolean;
  readonly beatsRawLogLoss: boolean;
  /** Sample variance of calibrated online forecasts (RES proxy when calibrated). */
  readonly varCalP: number;
  readonly varRawP: number;
  readonly expansionA: number;
  readonly steps: readonly OnlineBetaStep[];
  readonly priced: false;
  readonly status: "shadow";
  readonly note: string;
};

function projectBox(
  a: number,
  b: number,
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): OnlineBetaParams {
  return {
    a: Math.min(aMax, Math.max(aMin, a)),
    b: Math.min(bMax, Math.max(bMin, b)),
  };
}

/** Apply g_{a,b}(p) = σ(a·logit(p)+b). */
export function applyOnlineBeta(p: number, params: OnlineBetaParams): number {
  const z = logit(p);
  return clampUnit(sigmoid(params.a * z + params.b));
}

/**
 * Chronological online OGD on Beta (a,b) under log-loss.
 * Predict-then-update: forecast uses θ_t before seeing y_t.
 */
export function runOnlineBetaRecalibration(
  samples: readonly (CalibrationSample & { readonly sampleId?: string; readonly t?: string | number })[],
  options: OnlineBetaOptions = {},
): OnlineBetaReport {
  const aMin = options.aMin ?? 0.05;
  const aMax = options.aMax ?? 5;
  const bMin = options.bMin ?? -3;
  const bMax = options.bMax ?? 3;
  const baseEta = options.learningRate ?? 0.15;
  const schedule = options.etaSchedule ?? "one_over_sqrt_t";
  const aPull = options.aIdentityPull ?? 0.02;

  let a = options.a0 ?? 1;
  let b = options.b0 ?? 0;
  ({ a, b } = projectBox(a, b, aMin, aMax, bMin, bMax));

  const ordered = [...samples].sort((x, y) => {
    const tx = x.t ?? x.sampleId ?? 0;
    const ty = y.t ?? y.sampleId ?? 0;
    if (typeof tx === "number" && typeof ty === "number") return tx - ty;
    return String(tx).localeCompare(String(ty));
  });

  const steps: OnlineBetaStep[] = [];
  let sumLl = 0;
  let sumBr = 0;
  let sumLlRaw = 0;
  let sumBrRaw = 0;
  const calPs: number[] = [];
  const rawPs: number[] = [];
  let t = 0;

  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i]!;
    if (!(s.p > 0 && s.p < 1) || (s.y !== 0 && s.y !== 1)) continue;
    t += 1;
    const rawP = clampUnit(s.p);
    const calP = applyOnlineBeta(rawP, { a, b });
    const y = s.y as 0 | 1;

    // log loss
    const ll =
      y === 1
        ? -Math.log(calP)
        : -Math.log(1 - calP);
    const llRaw =
      y === 1 ? -Math.log(rawP) : -Math.log(1 - rawP);
    const br = (calP - y) ** 2;
    const brRaw = (rawP - y) ** 2;

    sumLl += ll;
    sumBr += br;
    sumLlRaw += llRaw;
    sumBrRaw += brRaw;
    calPs.push(calP);
    rawPs.push(rawP);

    steps.push({
      sampleId: s.sampleId ?? `t${i}`,
      rawP,
      calP,
      y,
      aBefore: a,
      bBefore: b,
      logLoss: ll,
      brier: br,
    });

    // OGD on log-loss: ∇ = (σ(s) − y)(z, 1)
    const z = logit(rawP);
    const pred = calP; // = σ(a z + b)
    const err = pred - y;
    const eta = schedule === "one_over_sqrt_t" ? baseEta / Math.sqrt(t) : baseEta;
    // Optional pull of a toward 1 (prevents runaway stretch)
    const da = err * z + aPull * (a - 1);
    const db = err * 1;
    const next = projectBox(a - eta * da, b - eta * db, aMin, aMax, bMin, bMax);
    a = next.a;
    b = next.b;
  }

  const n = steps.length;
  const mean = (xs: number[]) =>
    xs.length === 0 ? NaN : xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = (xs: number[]) => {
    if (xs.length === 0) return NaN;
    const m = mean(xs);
    return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  };

  const meanBrierOnline = n === 0 ? NaN : sumBr / n;
  const meanBrierRaw = n === 0 ? NaN : sumBrRaw / n;
  const meanLogLossOnline = n === 0 ? NaN : sumLl / n;
  const meanLogLossRaw = n === 0 ? NaN : sumLlRaw / n;

  return {
    n,
    finalParams: { a, b },
    meanLogLossOnline,
    meanBrierOnline,
    meanBrierRaw,
    meanLogLossRaw,
    beatsRawBrier:
      n >= 30 &&
      Number.isFinite(meanBrierOnline) &&
      meanBrierOnline < meanBrierRaw - 1e-6,
    beatsRawLogLoss:
      n >= 30 &&
      Number.isFinite(meanLogLossOnline) &&
      meanLogLossOnline < meanLogLossRaw - 1e-6,
    varCalP: variance(calPs),
    varRawP: variance(rawPs),
    expansionA: a,
    steps,
    priced: false,
    status: "shadow",
    note:
      "Online Beta OGD on log-loss (shadow). a>1 expands underconfident mass when data support it. " +
      "Does not apply to live eligibility. Maps/apply gates stay OFF until RES floors clear.",
  };
}

/**
 * Offline RES-aware Beta: grid-search (a,b) maximizing holdout RES subject to
 * REL ≤ maxRel, with optional λ(a−1)² penalty on train Brier.
 * Chronological: train on first trainFrac, evaluate on rest.
 */
export type ResCalibratorOptions = {
  readonly trainFrac?: number;
  readonly maxRel?: number;
  readonly lambdaA?: number;
  readonly aGrid?: readonly number[];
  readonly bGrid?: readonly number[];
  readonly minTrainN?: number;
  readonly minValN?: number;
};

export type ResCalibratorReport = {
  readonly nTrain: number;
  readonly nVal: number;
  readonly params: OnlineBetaParams | null;
  readonly trainBrier: number;
  readonly valBrier: number;
  readonly valRes: number;
  readonly valRel: number;
  readonly rawValBrier: number;
  readonly rawValRes: number;
  readonly rawValRel: number;
  readonly resGain: number;
  readonly varCal: number;
  readonly varRaw: number;
  readonly selected: boolean;
  readonly priced: false;
  readonly status: "shadow";
  readonly note: string;
};

function sampleVar(ps: readonly number[]): number {
  if (ps.length === 0) return NaN;
  const m = ps.reduce((s, x) => s + x, 0) / ps.length;
  return ps.reduce((s, x) => s + (x - m) ** 2, 0) / ps.length;
}

export function fitResAwareBeta(
  samplesChrono: readonly CalibrationSample[],
  options: ResCalibratorOptions = {},
): ResCalibratorReport {
  const trainFrac = options.trainFrac ?? 0.7;
  const maxRel = options.maxRel ?? 0.015;
  const lambdaA = options.lambdaA ?? 0.1;
  const aGrid = options.aGrid ?? [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  const bGrid = options.bGrid ?? [-0.5, -0.25, 0, 0.25, 0.5];
  const minTrainN = options.minTrainN ?? 40;
  const minValN = options.minValN ?? 20;

  const n = samplesChrono.length;
  const cut = Math.max(1, Math.floor(n * trainFrac));
  const train = samplesChrono.slice(0, cut);
  const val = samplesChrono.slice(cut);

  const empty = (note: string): ResCalibratorReport => ({
    nTrain: train.length,
    nVal: val.length,
    params: null,
    trainBrier: NaN,
    valBrier: NaN,
    valRes: NaN,
    valRel: NaN,
    rawValBrier: NaN,
    rawValRes: NaN,
    rawValRel: NaN,
    resGain: NaN,
    varCal: NaN,
    varRaw: NaN,
    selected: false,
    priced: false,
    status: "shadow",
    note,
  });

  if (train.length < minTrainN || val.length < minValN) {
    return empty("Insufficient chrono split for RES-aware Beta.");
  }

  const rawVal = brierDecomposition(val);
  const rawVar = sampleVar(val.map((s) => s.p));

  let best: {
    a: number;
    b: number;
    trainBrier: number;
    valBrier: number;
    valRes: number;
    valRel: number;
    varCal: number;
  } | null = null;

  for (const a of aGrid) {
    for (const b of bGrid) {
      const params = { a, b };
      // Train objective: Brier + λ(a−1)²
      let trainBr = 0;
      for (const s of train) {
        const g = applyOnlineBeta(s.p, params);
        trainBr += (g - s.y) ** 2;
      }
      trainBr = trainBr / train.length + lambdaA * (a - 1) ** 2;

      const calVal = val.map((s) => ({
        p: applyOnlineBeta(s.p, params),
        y: s.y,
      }));
      const d = brierDecomposition(calVal);
      if (d.reliability > maxRel + 1e-9) continue;
      if (
        !best ||
        d.resolution > best.valRes + 1e-9 ||
        (Math.abs(d.resolution - best.valRes) < 1e-9 && d.brier < best.valBrier - 1e-9)
      ) {
        best = {
          a,
          b,
          trainBrier: trainBr,
          valBrier: d.brier,
          valRes: d.resolution,
          valRel: d.reliability,
          varCal: sampleVar(calVal.map((x) => x.p)),
        };
      }
    }
  }

  if (!best) {
    return {
      ...empty(
        `No (a,b) cleared REL≤${maxRel} on validation — refuse stretch; keep identity.`,
      ),
      rawValBrier: rawVal.brier,
      rawValRes: rawVal.resolution,
      rawValRel: rawVal.reliability,
      varRaw: rawVar,
    };
  }

  return {
    nTrain: train.length,
    nVal: val.length,
    params: { a: best.a, b: best.b },
    trainBrier: best.trainBrier,
    valBrier: best.valBrier,
    valRes: best.valRes,
    valRel: best.valRel,
    rawValBrier: rawVal.brier,
    rawValRes: rawVal.resolution,
    rawValRel: rawVal.reliability,
    resGain: best.valRes - rawVal.resolution,
    varCal: best.varCal,
    varRaw: rawVar,
    selected: true,
    priced: false,
    status: "shadow",
    note:
      "RES-aware Beta: max val RES s.t. REL≤maxRel with λ(a−1)². Shadow only — apply OFF until live RES floors.",
  };
}
