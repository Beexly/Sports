/**
 * CPAE completion-probability surface — pure math core, R&D only.
 *
 * Ported from arXiv:1906.03339 (Deshpande & Evans, "Expected hypothetical
 * completion probability"): a GAM-with-logit-link completion surface over
 * pass location, per-group (QB or defense) surfaces shrunk toward the
 * league by local data mass, and a group-level CPAE aggregate (their
 * Eq. 1 — see cpae-aggregate.ts). The paper's OTHER half — image-scraping
 * NGS chart JPEGs — is rights-gated and deliberately NOT ported; see
 * docs/ops/edge/2026-08-26-paper-spec-cpae-gam-surface.md.
 *
 * GRAIN HONESTY (the spec's core adaptation): nflverse play-by-play carries
 * continuous pass DEPTH (air_yards) but only three horizontal bins
 * (pass_location ∈ {left, middle, right}), so the paper's continuous
 * tensor-product smoother becomes a DISCRETE tensor product — a natural
 * cubic spline basis over depth crossed with the 3 location indicators —
 * and the paper's 2-D KDE becomes discrete cell masses (a 2-D KDE would
 * cosplay resolution the public data does not have).
 *
 * Smoothing: the paper's smoother choice is "supported by cross-validation"
 * whose procedure the paper does not detail; the spec's bounded stand-in is
 * the existing fitLogistic's L2 penalty (λ swept only inside walk-forward
 * folds by the future data-gated fit — never here).
 *
 * AS-OF DISCIPLINE (CodeRabbit finding on the spec, satisfied structurally):
 * this module performs NO data loading. Every function takes caller-supplied
 * rows; the caller owns the as-of cutoff filter, and the leakage mutation
 * test in the test file proves rows outside a caller's filter cannot move a
 * prior-labeled output.
 *
 * The pure-core pattern of ingame-soccer.ts / poisson-its.ts applies:
 * the real fit-on-load, the NGS ρ-validation run (QB grain ONLY — defense
 * has no vendor ground truth and needs its own separately defined gate,
 * the second CodeRabbit finding), λ/N_median tuning, and admission through
 * walk-forward + placebo + trials registry are separate, data-gated
 * increments. priced:false throughout that lane.
 *
 * Pure. No I/O.
 */

import { fitLogistic, predictLogistic, type LogisticModel } from "./logistic.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import type { DropbackPlay } from "./expected-completion.js";

export const CPAE_SURFACE_MODEL_VERSION = "gse-cpae-surface-v1";

/** Interior depth knots (yards past LOS), from the spec. */
export const CPAE_DEPTH_KNOTS: readonly number[] = [-2, 2, 6, 10, 15, 20, 30];

/** Depth domain — evaluation clamps to this range. */
export const CPAE_DEPTH_DOMAIN: readonly [number, number] = [-10, 60];

const LOCATIONS = ["left", "middle", "right"] as const;
export type PassLocationBin = (typeof LOCATIONS)[number];

/** Full knot vector: domain boundaries + interior knots — 9 knots, so the natural cubic basis has 9 functions. */
const FULL_KNOTS: readonly number[] = [CPAE_DEPTH_DOMAIN[0], ...CPAE_DEPTH_KNOTS, CPAE_DEPTH_DOMAIN[1]];

export const CPAE_BASIS_SIZE = FULL_KNOTS.length; // 9

/** Canonical ordered feature contract: 9 basis × 3 locations + 6 context = 33. */
export const CPAE_SURFACE_FEATURE_KEYS: readonly string[] = [
  ...LOCATIONS.flatMap((loc) => Array.from({ length: CPAE_BASIS_SIZE }, (_, k) => `b${k + 1}_${loc}`)),
  "qbHit",
  "down",
  "ydstogo",
  "yardline100",
  "shotgun",
  "noHuddle",
];

/**
 * Natural cubic spline basis (ESL §5.2.1 construction) over the 9-knot
 * vector, evaluated at `depth` clamped to the domain:
 *   N_1(x) = 1, N_2(x) = x, N_{k+2}(x) = d_k(x) − d_{K−1}(x)
 * with d_k(x) = [(x−ξ_k)_+³ − (x−ξ_K)_+³] / (ξ_K − ξ_k). C² at every
 * interior knot; linear beyond the boundary knots by the natural
 * constraint (and constant outside the domain via the clamp, which is
 * strictly stronger). Throws on a non-finite depth — a non-finite feature
 * is a caller bug, not a value to smooth over.
 */
export function naturalCubicBasis(depth: number): readonly number[] {
  if (!Number.isFinite(depth)) throw new RangeError(`naturalCubicBasis: depth must be finite, got ${depth}`);
  const x = Math.min(Math.max(depth, CPAE_DEPTH_DOMAIN[0]), CPAE_DEPTH_DOMAIN[1]);
  const K = FULL_KNOTS.length;
  const xiK = FULL_KNOTS[K - 1]!;
  const pos3 = (v: number) => (v > 0 ? v * v * v : 0);
  const d = (k: number) => (pos3(x - FULL_KNOTS[k]!) - pos3(x - xiK)) / (xiK - FULL_KNOTS[k]!);
  const out = new Array<number>(K);
  out[0] = 1;
  out[1] = x;
  const dLast = d(K - 2);
  for (let k = 0; k < K - 2; k++) out[k + 2] = d(k) - dLast;
  return out;
}

/**
 * The 33-feature row for one dropback: depth basis × location indicator
 * (the discrete tensor product), plus the gse-xcomp-v1 context block
 * verbatim. Plays with `passLocation === null` are UNUSABLE — the caller
 * must exclude them (fail closed, never imputed); this function throws on
 * one to make silent imputation impossible.
 */
export function cpaeSurfaceFeatureRow(play: DropbackPlay): number[] {
  if (play.passLocation === null) {
    throw new RangeError("cpaeSurfaceFeatureRow: passLocation is null — uncharted plays are excluded, never imputed");
  }
  const basis = naturalCubicBasis(play.airYards);
  const row = new Array<number>(CPAE_SURFACE_FEATURE_KEYS.length).fill(0);
  const locIdx = LOCATIONS.indexOf(play.passLocation);
  for (let k = 0; k < CPAE_BASIS_SIZE; k++) row[locIdx * CPAE_BASIS_SIZE + k] = basis[k]!;
  const ctx = LOCATIONS.length * CPAE_BASIS_SIZE;
  row[ctx] = play.qbHit;
  row[ctx + 1] = play.down;
  row[ctx + 2] = play.ydstogo;
  row[ctx + 3] = play.yardline100;
  row[ctx + 4] = play.shotgun;
  row[ctx + 5] = play.noHuddle;
  return row;
}

export interface CpaeSurfaceModel {
  readonly logistic: LogisticModel;
  readonly provenance: ExpectedMetricProvenance;
}

/** Minimum usable plays required to fit — mirrors expected-completion.ts's floor. */
export const MIN_PLAYS_TO_FIT_CPAE_SURFACE = 200;

function isUsable(play: DropbackPlay): boolean {
  return (
    play.passerId.length > 0 &&
    (play.complete === 0 || play.complete === 1) &&
    play.passLocation !== null &&
    Number.isFinite(play.airYards) &&
    Number.isFinite(play.yardline100) &&
    Number.isFinite(play.down) &&
    Number.isFinite(play.ydstogo)
  );
}

/**
 * Fit the surface on caller-supplied plays (the caller owns the as-of
 * cutoff — this function never loads data). `l2` is the smoothing penalty
 * (the spec's bounded stand-in for the paper's undetailed CV; default
 * matches fitLogistic's 1e-3). Returns null below the minimum sample or on
 * degenerate labels — a metric is never served from an unfit model.
 */
export function fitCpaeSurface(
  plays: readonly DropbackPlay[],
  options: { readonly minSample?: number; readonly l2?: number } = {},
): CpaeSurfaceModel | null {
  const minSample = options.minSample ?? MIN_PLAYS_TO_FIT_CPAE_SURFACE;
  const usable = plays.filter(isUsable);
  if (usable.length < minSample) return null;

  const rows = usable.map(cpaeSurfaceFeatureRow);
  const labels = usable.map((p) => p.complete);
  const logistic = fitLogistic(rows, labels, options.l2 === undefined ? {} : { l2: options.l2 });
  if (logistic === null) return null;

  return {
    logistic,
    provenance: {
      modelVersion: CPAE_SURFACE_MODEL_VERSION,
      method: "logistic-regression",
      featureKeys: [...CPAE_SURFACE_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(CPAE_SURFACE_FEATURE_KEYS),
      sampleSize: logistic.sampleSize,
    },
  };
}

/** Predict P(complete) for one usable dropback under a fitted surface. */
export function predictCpaeCompletionProbability(model: CpaeSurfaceModel, play: DropbackPlay): number {
  return predictLogistic(model.logistic, cpaeSurfaceFeatureRow(play));
}
