/**
 * Out-of-fold calibration with a parametric tail (handoff §2 P1).
 *
 * Isotonic (PAVA) overfits the sparse high-confidence tail — exactly where
 * the money is — so the map applied there is BETA calibration (parametric,
 * 3 dof, monotone by construction after the repo's sign guards), while the
 * dense middle keeps isotonic's flexibility. The two are blended linearly
 * across a transition band so the composite stays continuous, then wrapped
 * in a monotone envelope (see `monotoneEnvelope` — a position-varying
 * cross-fade is not automatically monotone), so RANKING IS UNCHANGED —
 * calibration only relocates p across the betting threshold 1/d (§2 P1).
 *
 * Selection is by BRIER RELIABILITY-RESOLUTION DECOMPOSITION on held-out
 * OOF sub-folds, NOT fixed-bin ECE (ECE is optimistically biased — §2 P1;
 * this deliberately diverges from the repo's older `selectCalibrator`,
 * which scores OOF-ECE). Candidates: isotonic-only, beta-only, tail-blend.
 * All fitting happens on OUT-OF-FOLD predictions supplied by the caller
 * (the walk-forward harness) — never on training-fold outputs.
 */

import {
  betaCalibration,
  type BetaModel,
} from "../calibration-map.js";
import {
  brierDecomposition,
  isotonicCalibration,
  type CalibrationSample,
} from "../probability-calibration.js";
import { mulberry32, shuffled } from "./rng.js";

export type CalibrationMap = (p: number) => number;

export interface BlendOptions {
  /** Tail zones: below lo / above hi use the parametric map. */
  readonly tailLo?: number; // default 0.15
  readonly tailHi?: number; // default 0.85
  /** Half-width of the linear cross-fade band at each boundary. */
  readonly band?: number; // default 0.05
}

const clamp01 = (x: number): number => Math.min(1 - 1e-9, Math.max(1e-9, x));

/** Apply a fitted BetaModel: sigmoid(a·ln p − b·ln(1−p) + c). */
export function applyBeta(model: BetaModel, p: number): number {
  const pc = clamp01(p);
  const z = model.a * Math.log(pc) - model.b * Math.log(1 - pc) + model.c;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Monotone envelope: a position-varying cross-fade of two monotone maps is
 * NOT itself guaranteed monotone (the w'(iso − beta) term can locally
 * invert where the maps disagree). The ranking-preservation guarantee (§2
 * P1 "monotone map ⇒ ranking unchanged") is restored by the standard
 * monotone rearrangement: evaluate on a fine grid, take the running max,
 * interpolate. Values move by at most the local blend disagreement.
 */
export function monotoneEnvelope(map: CalibrationMap, gridSize = 2001): CalibrationMap {
  const xs = Array.from({ length: gridSize }, (_, i) => i / (gridSize - 1));
  const ys: number[] = [];
  let running = -Infinity;
  for (const x of xs) {
    running = Math.max(running, map(x));
    ys.push(running);
  }
  return (p: number): number => {
    if (p <= 0) return ys[0]!;
    if (p >= 1) return ys[gridSize - 1]!;
    const t = p * (gridSize - 1);
    const i = Math.floor(t);
    const frac = t - i;
    return ys[i]! * (1 - frac) + ys[Math.min(i + 1, gridSize - 1)]! * frac;
  };
}

/** Compose the tail-blend map from an isotonic middle + beta tails. */
export function tailBlendMap(
  iso: CalibrationMap,
  beta: CalibrationMap,
  opts: BlendOptions = {},
): CalibrationMap {
  const lo = opts.tailLo ?? 0.15;
  const hi = opts.tailHi ?? 0.85;
  const band = opts.band ?? 0.05;
  const raw = (p: number): number => {
    if (p <= lo - band) return beta(p);
    if (p >= hi + band) return beta(p);
    if (p >= lo + band && p <= hi - band) return iso(p);
    // Cross-fade: weight of iso rises from 0 at the outer edge to 1 inside.
    if (p < lo + band) {
      const w = (p - (lo - band)) / (2 * band);
      return (1 - w) * beta(p) + w * iso(p);
    }
    const w = ((hi + band) - p) / (2 * band);
    return (1 - w) * beta(p) + w * iso(p);
  };
  return monotoneEnvelope(raw);
}

export type BlendCandidate = "isotonic" | "beta" | "tail-blend" | "identity";

export interface OofCalibrationFit {
  readonly selected: BlendCandidate;
  readonly map: CalibrationMap;
  /** Held-out Brier decomposition per candidate (mean across sub-folds). */
  readonly scores: readonly {
    readonly candidate: BlendCandidate;
    readonly brier: number;
    readonly reliability: number;
    readonly resolution: number;
  }[];
  readonly sampleSize: number;
}

/**
 * Fit + select on OOF samples via K-fold cross-fit: for each sub-fold, fit
 * every candidate on the complement and score the held-out Brier
 * decomposition; select the candidate with the lowest mean held-out Brier
 * (equivalently min reliability − resolution, uncertainty being common).
 * The returned map is the winner refit on ALL OOF samples. Falls back to
 * identity when data is too thin — an inactive calibrator is a safe
 * passthrough, never a fabricated one.
 */
export function fitOofCalibration(
  oofSamples: readonly CalibrationSample[],
  opts: { readonly folds?: number; readonly seed?: number; readonly minSample?: number } & BlendOptions = {},
): OofCalibrationFit {
  const folds = opts.folds ?? 4;
  const minSample = opts.minSample ?? 200;
  const n = oofSamples.length;
  if (n < minSample) {
    return {
      selected: "identity",
      map: (p) => p,
      scores: [],
      sampleSize: n,
    };
  }

  const rng = mulberry32(opts.seed ?? 0xca11b);
  const order = shuffled(
    Array.from({ length: n }, (_, i) => i),
    rng,
  );
  const foldOf = new Array<number>(n);
  order.forEach((idx, rank) => {
    foldOf[idx] = rank % folds;
  });

  const candidates: BlendCandidate[] = ["isotonic", "beta", "tail-blend"];
  const totals = new Map<BlendCandidate, { brier: number; rel: number; res: number; folds: number }>();

  const buildCandidate = (
    candidate: BlendCandidate,
    train: readonly CalibrationSample[],
  ): CalibrationMap | null => {
    if (candidate === "isotonic") {
      const iso = isotonicCalibration(train);
      return (p) => iso.predict(p);
    }
    const betaModel = betaCalibration(train);
    if (!betaModel) return null;
    const beta: CalibrationMap = (p) => applyBeta(betaModel, p);
    if (candidate === "beta") return beta;
    const iso = isotonicCalibration(train);
    return tailBlendMap((p) => iso.predict(p), beta, opts);
  };

  for (let k = 0; k < folds; k++) {
    const train = oofSamples.filter((_, i) => foldOf[i] !== k);
    const held = oofSamples.filter((_, i) => foldOf[i] === k);
    if (train.length < 50 || held.length < 20) continue;
    for (const candidate of candidates) {
      const map = buildCandidate(candidate, train);
      if (!map) continue;
      const scored = held.map((s) => ({ p: map(s.p), y: s.y }));
      const d = brierDecomposition(scored);
      const agg = totals.get(candidate) ?? { brier: 0, rel: 0, res: 0, folds: 0 };
      agg.brier += d.brier;
      agg.rel += d.reliability;
      agg.res += d.resolution;
      agg.folds += 1;
      totals.set(candidate, agg);
    }
  }

  const scores = [...totals.entries()]
    .filter(([, v]) => v.folds > 0)
    .map(([candidate, v]) => ({
      candidate,
      brier: v.brier / v.folds,
      reliability: v.rel / v.folds,
      resolution: v.res / v.folds,
    }))
    .sort((a, b) => a.brier - b.brier);

  const winner = scores[0];
  if (!winner) {
    return { selected: "identity", map: (p) => p, scores: [], sampleSize: n };
  }
  const finalMap = buildCandidate(winner.candidate, oofSamples);
  if (!finalMap) {
    return { selected: "identity", map: (p) => p, scores, sampleSize: n };
  }
  return { selected: winner.candidate, map: finalMap, scores, sampleSize: n };
}
