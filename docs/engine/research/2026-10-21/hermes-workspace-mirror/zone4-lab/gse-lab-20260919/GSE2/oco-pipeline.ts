/**
 * Full OCO pipeline (shadow): online Beta → Brier-OGD ensemble → Hedge δ.
 *
 * Event-driven sequence per settlement:
 *   1. Calibrate each member p with shared (or per-member) online Beta θ_t
 *   2. Ensemble with w_t (simplex OGD on Brier)
 *   3. Publish if |p_ens−0.5| ≥ δ_t (δ from Hedge experts)
 *   4. Observe y; update θ, w, Hedge weights
 *
 * All shadow. No live gate flips. Live eligibility stays map-free.
 */

import {
  runBrierOgdEnsemble,
  projectProbabilitySimplex,
  type BrierOgdSample,
} from "./brier-ogd-ensemble.js";
import {
  applyOnlineBeta,
  type OnlineBetaParams,
} from "./online-beta-recalibration.js";
import {
  expertLossAtDelta,
  runAdaptiveDeltaHedge,
} from "./adaptive-delta-hedge.js";
import { brierDecomposition, type CalibrationSample } from "./probability-calibration.js";

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

export type OcoMemberSample = {
  readonly sampleId: string;
  readonly members: Readonly<Record<string, number>>;
  readonly y: 0 | 1;
  readonly t?: string | number;
};

export type OcoPipelineOptions = {
  readonly ensembleEta?: number;
  readonly betaEta?: number;
  readonly hedgeEta?: number;
  readonly deltas?: readonly number[];
  readonly sitOutLoss?: number;
  readonly aMin?: number;
  readonly aMax?: number;
  readonly bMin?: number;
  readonly bMax?: number;
  readonly aIdentityPull?: number;
  /** Shared Beta across members (default true). */
  readonly sharedBeta?: boolean;
};

export type OcoPipelineStep = {
  readonly sampleId: string;
  readonly ensP: number;
  readonly y: 0 | 1;
  readonly delta: number;
  readonly published: boolean;
  readonly brierIfPublished: number;
  readonly a: number;
  readonly b: number;
};

export type OcoPipelineReport = {
  readonly n: number;
  readonly publishedN: number;
  readonly meanBrierPublished: number;
  readonly meanBrierAllEns: number;
  readonly finalWeights: Readonly<Record<string, number>>;
  readonly finalBeta: OnlineBetaParams;
  readonly recommendedDelta: number;
  readonly publishedRes: number;
  readonly publishedRel: number;
  readonly publishedVarP: number;
  readonly rawMeanBrierEqual: number;
  readonly steps: readonly OcoPipelineStep[];
  readonly priced: false;
  readonly status: "shadow";
  readonly note: string;
};

/**
 * Run full OCO pipeline chronologically on multi-member samples.
 */
export function runOcoPipeline(
  samples: readonly OcoMemberSample[],
  options: OcoPipelineOptions = {},
): OcoPipelineReport {
  const ensembleEta = options.ensembleEta ?? 0.25;
  const betaEta0 = options.betaEta ?? 0.12;
  const hedgeEta = options.hedgeEta ?? 0.35;
  const deltas = options.deltas ?? [0, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2];
  const sitOut = options.sitOutLoss ?? 0.25;
  const aMin = options.aMin ?? 0.05;
  const aMax = options.aMax ?? 5;
  const bMin = options.bMin ?? -3;
  const bMax = options.bMax ?? 3;
  const aPull = options.aIdentityPull ?? 0.02;
  const sharedBeta = options.sharedBeta !== false;

  const ordered = [...samples].sort((a, b) => {
    const ta = a.t ?? a.sampleId;
    const tb = b.t ?? b.sampleId;
    if (typeof ta === "number" && typeof tb === "number") return ta - tb;
    return String(ta).localeCompare(String(tb));
  });

  const modelIds = new Set<string>();
  for (const s of ordered) {
    for (const [k, v] of Object.entries(s.members)) {
      if (Number.isFinite(v) && v > 0 && v < 1) modelIds.add(k);
    }
  }
  const ids = [...modelIds].sort();
  let wMap = new Map(ids.map((id) => [id, 1]));
  let weights = projectProbabilitySimplex(wMap, ids);

  // Shared Beta params (or per-model)
  let a = 1;
  let b = 0;
  const perModel: Record<string, OnlineBetaParams> = Object.fromEntries(
    ids.map((id) => [id, { a: 1, b: 0 }]),
  );

  let hedgeW = Array.from({ length: deltas.length }, () => 1 / deltas.length);
  const normalize = (w: number[]) => {
    const s = w.reduce((x, y) => x + y, 0);
    return s <= 0 ? w.map(() => 1 / w.length) : w.map((x) => x / s);
  };

  const steps: OcoPipelineStep[] = [];
  const pubSamples: CalibrationSample[] = [];
  let sumEnsBr = 0;
  let sumEqBr = 0;
  let t = 0;

  for (const sample of ordered) {
    const active = ids.filter((id) => {
      const p = sample.members[id];
      return p != null && Number.isFinite(p) && p > 0 && p < 1;
    });
    if (active.length === 0) continue;
    t += 1;

    // 1) Calibrate members
    const cal: Record<string, number> = {};
    for (const id of active) {
      const raw = clampUnit(sample.members[id]!);
      const th = sharedBeta ? { a, b } : perModel[id]!;
      cal[id] = applyOnlineBeta(raw, th);
    }

    // 2) Ensemble
    const activeW = projectProbabilitySimplex(
      new Map(active.map((id) => [id, weights[id] ?? 0])),
      active,
    );
    let ens = 0;
    let eq = 0;
    for (const id of active) {
      ens += activeW[id]! * cal[id]!;
      eq += cal[id]! / active.length;
    }
    ens = clampUnit(ens);
    eq = clampUnit(eq);
    const y = sample.y;
    sumEnsBr += (ens - y) ** 2;
    sumEqBr += (eq - y) ** 2;

    // 3) Choose δ via Hedge
    const j = hedgeW.reduce(
      (bi, w, i, arr) => (w > arr[bi]! ? i : bi),
      0,
    );
    const delta = deltas[j]!;
    const published = Math.abs(ens - 0.5) >= delta;
    const brierIfPub = (ens - y) ** 2;

    steps.push({
      sampleId: sample.sampleId,
      ensP: ens,
      y,
      delta,
      published,
      brierIfPublished: brierIfPub,
      a: sharedBeta ? a : perModel[active[0]!]!.a,
      b: sharedBeta ? b : perModel[active[0]!]!.b,
    });
    if (published) {
      pubSamples.push({ p: ens, y });
    }

    // 4) Updates
    // Ensemble OGD on Brier
    const etaW = ensembleEta / Math.sqrt(t);
    const gradScale = 2 * (ens - y);
    const nextW = new Map<string, number>();
    for (const id of ids) {
      const prior = weights[id] ?? 0;
      if (active.includes(id)) {
        nextW.set(id, prior - etaW * gradScale * cal[id]!);
      } else {
        nextW.set(id, prior);
      }
    }
    weights = projectProbabilitySimplex(nextW, ids);

    // Online Beta OGD on log-loss (shared: use ens raw as mean of raw members)
    const etaB = betaEta0 / Math.sqrt(t);
    if (sharedBeta) {
      // Use ensemble of raw for beta update features, loss on cal ens
      const rawMean =
        active.reduce((s, id) => s + clampUnit(sample.members[id]!), 0) /
        active.length;
      const z = logit(rawMean);
      const pred = applyOnlineBeta(rawMean, { a, b });
      const err = pred - y;
      a = Math.min(aMax, Math.max(aMin, a - etaB * (err * z + aPull * (a - 1))));
      b = Math.min(bMax, Math.max(bMin, b - etaB * err));
    } else {
      for (const id of active) {
        const raw = clampUnit(sample.members[id]!);
        const th = perModel[id]!;
        const z = logit(raw);
        const pred = applyOnlineBeta(raw, th);
        const err = pred - y;
        const na = Math.min(
          aMax,
          Math.max(aMin, th.a - etaB * (err * z + aPull * (th.a - 1))),
        );
        const nb = Math.min(bMax, Math.max(bMin, th.b - etaB * err));
        perModel[id] = { a: na, b: nb };
      }
    }

    // Hedge δ update — each expert loss on ens p
    const losses = deltas.map((d) => expertLossAtDelta(ens, y, d, sitOut).loss);
    hedgeW = normalize(hedgeW.map((w, i) => w * Math.exp(-hedgeEta * losses[i]!)));
  }

  const n = steps.length;
  const pubN = pubSamples.length;
  const meanBrierPublished =
    pubN === 0
      ? NaN
      : pubSamples.reduce((s, r) => s + (r.p - r.y) ** 2, 0) / pubN;
  const meanBrierAllEns = n === 0 ? NaN : sumEnsBr / n;
  const decomp = pubN > 0 ? brierDecomposition(pubSamples) : null;
  const varP =
    pubN === 0
      ? NaN
      : (() => {
          const m = pubSamples.reduce((s, r) => s + r.p, 0) / pubN;
          return pubSamples.reduce((s, r) => s + (r.p - m) ** 2, 0) / pubN;
        })();

  const recDeltaIdx = hedgeW.reduce(
    (bi, w, i, arr) => (w > arr[bi]! ? i : bi),
    0,
  );

  return {
    n,
    publishedN: pubN,
    meanBrierPublished,
    meanBrierAllEns,
    finalWeights: weights,
    finalBeta: sharedBeta
      ? { a, b }
      : { a: 1, b: 0 }, // summary only when shared
    recommendedDelta: deltas[recDeltaIdx]!,
    publishedRes: decomp?.resolution ?? NaN,
    publishedRel: decomp?.reliability ?? NaN,
    publishedVarP: varP,
    rawMeanBrierEqual: n === 0 ? NaN : sumEqBr / n,
    steps,
    priced: false,
    status: "shadow",
    note:
      "Full OCO pipeline (shadow): online Beta + Brier-OGD ensemble + Hedge δ. " +
      "Does not flip CALIBRATION_ADJUSTMENTS, PERFORMANCE_STATS, or SELECTIVE_PUBLISH_DELTA. " +
      "Advisory only until live RES floors + integrity hold.",
  };
}

/**
 * Convenience: single-stream samples → synthetic two-member (raw + shrink) OCO run.
 * Useful when only one p series exists (eligibility p).
 */
export function runOcoPipelineFromSingleP(
  samples: readonly (CalibrationSample & {
    readonly sampleId?: string;
    readonly t?: string | number;
  })[],
  options?: OcoPipelineOptions,
): OcoPipelineReport {
  const mapped: OcoMemberSample[] = samples.map((s, i) => {
    const p = clampUnit(s.p);
    // Member diversity: raw + mild shrink toward 0.5 (identity pull baseline)
    const shrunk = clampUnit(0.5 + 0.85 * (p - 0.5));
    return {
      sampleId: s.sampleId ?? `s${i}`,
      t: s.t ?? i,
      y: s.y,
      members: { raw: p, shrink: shrunk },
    };
  });
  return runOcoPipeline(mapped, options);
}

/** Re-export helpers for bake-off consumers. */
export { runAdaptiveDeltaHedge } from "./adaptive-delta-hedge.js";
export { runOnlineBetaRecalibration, fitResAwareBeta } from "./online-beta-recalibration.js";
export { runBrierOgdEnsemble } from "./brier-ogd-ensemble.js";
