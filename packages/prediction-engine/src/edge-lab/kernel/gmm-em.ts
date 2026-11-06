/**
 * Diagonal-covariance Gaussian mixture, fit by EM — pure math core, R&D only.
 *
 * Ported from arXiv:1906.11373 (Dutta, Yurko & Ventura, "Unsupervised
 * methods for identifying pass coverage among defensive backs with NFL
 * player tracking data"). Their model choice is exactly this: a Gaussian
 * mixture with DIAGONAL covariance fit by EM, soft posterior assignment
 * P(G(x)=g) = f_g(x) / Σ_h f_h(x), with the number of components selected
 * NOT by BIC/AIC but by leave-one-week-out partition STABILITY (adjusted
 * Rand index across held-out-week refits) — and a kill rule when no K is
 * stable. See docs/ops/edge/2026-08-26-paper-spec-coverage-gmm.md for the
 * full port spec (defense-week grain on nflverse weekly aggregates in place
 * of their per-CB 10Hz trajectory features, which sit behind a tracking
 * rights gate GSE has not cleared).
 *
 * The pure-core pattern of ingame-soccer.ts / poisson-its.ts applies:
 * everything here is already-testable math validated on synthetic data with
 * known true parameters; the real-data fit (defense-week feature module,
 * K-selection run, admission through walk-forward + placebo + trials
 * registry) is a separate, data-gated increment. `priced:false` throughout
 * that lane.
 *
 * Numerics (spec-mandated): all responsibilities in log space via
 * log-sum-exp — no linear-space density products anywhere; per-dimension
 * variance floor applied every M-step (prevents singular collapse onto a
 * point); convergence on relative log-likelihood change; seeded k-means++
 * init from the repo's mulberry32 with deterministic multi-restart
 * (sub-seed = seed + i), best final log-likelihood wins. Fully
 * deterministic from one integer seed.
 *
 * SEMANTIC-LABEL GATE (CodeRabbit finding on the spec, encoded in the type):
 * LOWO ARI proves partition STABILITY, not that a cluster means "man
 * coverage" — a stable polarity inversion would give a tendency signal the
 * wrong meaning. So the core emits ANONYMOUS cluster posteriors, and
 * `labelClustersByCushionRule` applies the pre-registered
 * lowest-mean-cushion → MAN mapping ONLY when handed an explicit
 * passed polarity validation; otherwise it returns `{ kind: "anonymous" }`.
 *
 * Pure. No I/O.
 */

import { mulberry32, type Rng } from "../rng.js";

export interface GmmFitOptions {
  readonly seed: number;
  /** Maximum EM iterations per restart. Default 500 (spec). */
  readonly maxIterations?: number;
  /** Convergence tolerance on relative log-likelihood change. Default 1e-8 (spec). */
  readonly tolerance?: number;
  /** Per-dimension variance floor applied every M-step. Default 1e-6 (spec). */
  readonly varianceFloor?: number;
  /** Deterministic restarts (sub-seed = seed + i); best final log-likelihood wins. Default 8. */
  readonly restarts?: number;
}

export interface DiagonalGmm {
  readonly k: number;
  readonly dim: number;
  readonly weights: readonly number[];
  readonly means: ReadonlyArray<readonly number[]>;
  readonly variances: ReadonlyArray<readonly number[]>;
  readonly logLikelihood: number;
  readonly iterations: number;
  readonly converged: boolean;
}

const LOG_2PI = Math.log(2 * Math.PI);

/** log Σ exp(v_i), stably: m + log Σ exp(v_i − m) with m = max v. */
export function logSumExp(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError("logSumExp: values must be non-empty");
  let m = -Infinity;
  for (const v of values) if (v > m) m = v;
  if (m === -Infinity) return -Infinity;
  let s = 0;
  for (const v of values) s += Math.exp(v - m);
  return m + Math.log(s);
}

function validateData(data: ReadonlyArray<readonly number[]>, k: number): number {
  const n = data.length;
  if (n === 0) throw new RangeError("fitDiagonalGmm: data must be non-empty");
  if (!Number.isInteger(k) || k < 1) throw new RangeError(`fitDiagonalGmm: k must be a positive integer, got ${k}`);
  if (k > n) throw new RangeError(`fitDiagonalGmm: k (${k}) exceeds the number of observations (${n})`);
  const dim = data[0]!.length;
  if (dim === 0) throw new RangeError("fitDiagonalGmm: observations must have at least one dimension");
  for (const row of data) {
    if (row.length !== dim) throw new RangeError("fitDiagonalGmm: ragged data — every observation must share one dimension");
    for (const v of row) {
      if (!Number.isFinite(v)) throw new RangeError("fitDiagonalGmm: every observation value must be finite");
    }
  }
  return dim;
}

function sqDist(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let j = 0; j < a.length; j++) {
    const d = a[j]! - b[j]!;
    s += d * d;
  }
  return s;
}

/** k-means++-style seeding: first center uniform, each next proportional to squared distance to the nearest chosen center. */
function kmeansPlusPlusCenters(
  data: ReadonlyArray<readonly number[]>,
  k: number,
  rng: Rng,
): number[][] {
  const centers: number[][] = [[...data[Math.floor(rng() * data.length)]!]];
  const d2 = data.map((x) => sqDist(x, centers[0]!));
  while (centers.length < k) {
    const total = d2.reduce((s, v) => s + v, 0);
    let idx: number;
    if (total > 0) {
      let r = rng() * total;
      idx = 0;
      while (idx < data.length - 1 && r >= d2[idx]!) {
        r -= d2[idx]!;
        idx++;
      }
    } else {
      // All points coincide with existing centers — fall back to uniform.
      idx = Math.floor(rng() * data.length);
    }
    const c = [...data[idx]!];
    centers.push(c);
    for (let i = 0; i < data.length; i++) {
      const d = sqDist(data[i]!, c);
      if (d < d2[i]!) d2[i] = d;
    }
  }
  return centers;
}

/** log N(x; mu, diag(sigma2)) for one component. */
function logDensityDiag(x: readonly number[], mu: readonly number[], sigma2: readonly number[]): number {
  let s = 0;
  for (let j = 0; j < x.length; j++) {
    const v = sigma2[j]!;
    const d = x[j]! - mu[j]!;
    s += -0.5 * (LOG_2PI + Math.log(v)) - (d * d) / (2 * v);
  }
  return s;
}

function emOnce(
  data: ReadonlyArray<readonly number[]>,
  k: number,
  dim: number,
  rng: Rng,
  maxIterations: number,
  tolerance: number,
  varianceFloor: number,
): DiagonalGmm {
  const n = data.length;

  // Init from the k-means++ hard partition: pi/mu/sigma2 of each center's
  // nearest-assignment cluster, variances floored.
  const centers = kmeansPlusPlusCenters(data, k, rng);
  const assign = data.map((x) => {
    let best = 0;
    let bestD = Infinity;
    for (let g = 0; g < k; g++) {
      const d = sqDist(x, centers[g]!);
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    }
    return best;
  });
  let weights = new Array<number>(k).fill(0);
  let means: number[][] = Array.from({ length: k }, () => new Array<number>(dim).fill(0));
  let variances: number[][] = Array.from({ length: k }, () => new Array<number>(dim).fill(0));
  const counts = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    const g = assign[i]!;
    counts[g]!++;
    for (let j = 0; j < dim; j++) means[g]![j]! += data[i]![j]!;
  }
  for (let g = 0; g < k; g++) {
    const c = Math.max(counts[g]!, 1);
    for (let j = 0; j < dim; j++) means[g]![j]! /= c;
    weights[g] = Math.max(counts[g]!, 1) / n;
  }
  const wSum = weights.reduce((s, w) => s + w, 0);
  weights = weights.map((w) => w / wSum);
  for (let i = 0; i < n; i++) {
    const g = assign[i]!;
    for (let j = 0; j < dim; j++) {
      const d = data[i]![j]! - means[g]![j]!;
      variances[g]![j]! += d * d;
    }
  }
  for (let g = 0; g < k; g++) {
    const c = Math.max(counts[g]!, 1);
    for (let j = 0; j < dim; j++) variances[g]![j] = Math.max(variances[g]![j]! / c, varianceFloor);
  }

  // EM, entirely in log space.
  let logLik = -Infinity;
  let iterations = 0;
  let converged = false;
  const logResp: number[][] = Array.from({ length: n }, () => new Array<number>(k).fill(0));

  for (let iter = 1; iter <= maxIterations; iter++) {
    iterations = iter;

    // E-step: log r_ig = log pi_g + logdens_ig − logSumExp_h(...).
    let nextLogLik = 0;
    for (let i = 0; i < n; i++) {
      const terms = new Array<number>(k);
      for (let g = 0; g < k; g++) {
        terms[g] = Math.log(weights[g]!) + logDensityDiag(data[i]!, means[g]!, variances[g]!);
      }
      const lse = logSumExp(terms);
      nextLogLik += lse;
      for (let g = 0; g < k; g++) logResp[i]![g] = terms[g]! - lse;
    }

    // M-step with per-dimension variance floor and component-mass guard.
    const newWeights = new Array<number>(k).fill(0);
    const newMeans: number[][] = Array.from({ length: k }, () => new Array<number>(dim).fill(0));
    const newVariances: number[][] = Array.from({ length: k }, () => new Array<number>(dim).fill(0));
    for (let g = 0; g < k; g++) {
      let ng = 0;
      for (let i = 0; i < n; i++) ng += Math.exp(logResp[i]![g]!);
      // Effective-mass guard: a component starved below ~1 point cannot be
      // re-estimated honestly — re-anchor it on the point the mixture
      // explains worst (deterministic, no rng consumed) rather than divide
      // by ~0 mass or silently produce NaN.
      if (ng < 1) {
        let worstI = 0;
        let worstL = Infinity;
        for (let i = 0; i < n; i++) {
          const terms = new Array<number>(k);
          for (let h = 0; h < k; h++) {
            terms[h] = Math.log(weights[h]!) + logDensityDiag(data[i]!, means[h]!, variances[h]!);
          }
          const l = logSumExp(terms);
          if (l < worstL) {
            worstL = l;
            worstI = i;
          }
        }
        newWeights[g] = 1 / n;
        for (let j = 0; j < dim; j++) {
          newMeans[g]![j] = data[worstI]![j]!;
          newVariances[g]![j] = varianceFloor;
        }
        continue;
      }
      newWeights[g] = ng / n;
      for (let i = 0; i < n; i++) {
        const r = Math.exp(logResp[i]![g]!);
        for (let j = 0; j < dim; j++) newMeans[g]![j]! += r * data[i]![j]!;
      }
      for (let j = 0; j < dim; j++) newMeans[g]![j]! /= ng;
      for (let i = 0; i < n; i++) {
        const r = Math.exp(logResp[i]![g]!);
        for (let j = 0; j < dim; j++) {
          const d = data[i]![j]! - newMeans[g]![j]!;
          newVariances[g]![j]! += r * d * d;
        }
      }
      for (let j = 0; j < dim; j++) newVariances[g]![j] = Math.max(newVariances[g]![j]! / ng, varianceFloor);
    }
    const totalW = newWeights.reduce((s, w) => s + w, 0);
    weights = newWeights.map((w) => w / totalW);
    means = newMeans;
    variances = newVariances;

    const rel = Math.abs(nextLogLik - logLik) / Math.max(1, Math.abs(nextLogLik));
    logLik = nextLogLik;
    if (rel <= tolerance) {
      converged = true;
      break;
    }
  }

  return { k, dim, weights, means, variances, logLikelihood: logLik, iterations, converged };
}

/**
 * Fit a k-component diagonal-covariance GMM by seeded EM with deterministic
 * multi-restart. Throws RangeError on empty/ragged/non-finite data, k < 1,
 * or k > n (caller-bug convention, matching linalg.ts). The best final
 * log-likelihood across restarts wins; identical seeds yield identical fits.
 */
export function fitDiagonalGmm(
  data: ReadonlyArray<readonly number[]>,
  k: number,
  options: GmmFitOptions,
): DiagonalGmm {
  const dim = validateData(data, k);
  const maxIterations = options.maxIterations ?? 500;
  const tolerance = options.tolerance ?? 1e-8;
  const varianceFloor = options.varianceFloor ?? 1e-6;
  const restarts = options.restarts ?? 8;
  if (!Number.isInteger(maxIterations) || maxIterations < 1) throw new RangeError("fitDiagonalGmm: maxIterations must be a positive integer");
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("fitDiagonalGmm: tolerance must be finite and > 0");
  if (!Number.isFinite(varianceFloor) || varianceFloor <= 0) throw new RangeError("fitDiagonalGmm: varianceFloor must be finite and > 0");
  if (!Number.isInteger(restarts) || restarts < 1) throw new RangeError("fitDiagonalGmm: restarts must be a positive integer");

  let best: DiagonalGmm | null = null;
  for (let r = 0; r < restarts; r++) {
    const rng = mulberry32(options.seed + r);
    const fit = emOnce(data, k, dim, rng, maxIterations, tolerance, varianceFloor);
    if (best === null || fit.logLikelihood > best.logLikelihood) best = fit;
  }
  return best!;
}

/** Mixture log-density log Σ_g pi_g N(x; mu_g, diag(sigma2_g)) at one point. */
export function gmmLogDensity(model: DiagonalGmm, x: readonly number[]): number {
  if (x.length !== model.dim) throw new RangeError(`gmmLogDensity: x has dim ${x.length}, model expects ${model.dim}`);
  const terms = new Array<number>(model.k);
  for (let g = 0; g < model.k; g++) {
    terms[g] = Math.log(model.weights[g]!) + logDensityDiag(x, model.means[g]!, model.variances[g]!);
  }
  return logSumExp(terms);
}

/** The paper's soft assignment: posterior P(G(x)=g), log-sum-exp normalized, sums to 1. */
export function gmmPosteriors(model: DiagonalGmm, x: readonly number[]): number[] {
  if (x.length !== model.dim) throw new RangeError(`gmmPosteriors: x has dim ${x.length}, model expects ${model.dim}`);
  const terms = new Array<number>(model.k);
  for (let g = 0; g < model.k; g++) {
    terms[g] = Math.log(model.weights[g]!) + logDensityDiag(x, model.means[g]!, model.variances[g]!);
  }
  const lse = logSumExp(terms);
  return terms.map((t) => Math.exp(t - lse));
}

/** Hard labels: argmax posterior per observation. */
export function gmmHardLabels(model: DiagonalGmm, data: ReadonlyArray<readonly number[]>): number[] {
  return data.map((x) => {
    const post = gmmPosteriors(model, x);
    let best = 0;
    for (let g = 1; g < post.length; g++) if (post[g]! > post[best]!) best = g;
    return best;
  });
}

// ---------------------------------------------------------------------------
// z-scoring (train-weeks-only discipline)
// ---------------------------------------------------------------------------

export interface ZScoreStats {
  readonly mean: readonly number[];
  readonly sd: readonly number[];
}

/** Fit per-dimension mean/sd on TRAINING data only (the spec's leak rule). A zero-variance dimension gets sd 1 (passes through centered). */
export function zScoreFit(train: ReadonlyArray<readonly number[]>): ZScoreStats {
  if (train.length === 0) throw new RangeError("zScoreFit: train must be non-empty");
  const dim = train[0]!.length;
  const mean = new Array<number>(dim).fill(0);
  for (const row of train) {
    if (row.length !== dim) throw new RangeError("zScoreFit: ragged data");
    for (let j = 0; j < dim; j++) mean[j]! += row[j]!;
  }
  for (let j = 0; j < dim; j++) mean[j]! /= train.length;
  const sd = new Array<number>(dim).fill(0);
  for (const row of train) {
    for (let j = 0; j < dim; j++) {
      const d = row[j]! - mean[j]!;
      sd[j]! += d * d;
    }
  }
  for (let j = 0; j < dim; j++) {
    const v = Math.sqrt(sd[j]! / train.length);
    sd[j] = v > 0 ? v : 1;
  }
  return { mean, sd };
}

export function zScoreApply(stats: ZScoreStats, x: readonly number[]): number[] {
  if (x.length !== stats.mean.length) throw new RangeError("zScoreApply: dimension mismatch");
  return x.map((v, j) => (v - stats.mean[j]!) / stats.sd[j]!);
}

// ---------------------------------------------------------------------------
// K selection by leave-one-week-out ARI stability (the paper's method — not BIC)
// ---------------------------------------------------------------------------

export type LowoAriSelection =
  | { readonly outcome: "selected"; readonly k: number; readonly meanAriByK: ReadonlyMap<number, number> }
  | { readonly outcome: "unstable"; readonly meanAriByK: ReadonlyMap<number, number> };

/**
 * Leave-one-week-out stability selection. For each candidate K and each
 * held-out week, refit on the remaining weeks and hard-label the FULL
 * pooled dataset with that fold's model; a K's stability is the mean
 * pairwise ARI across its folds' labelings. The best-mean-ARI K is selected
 * ONLY if its mean ARI reaches `minStableAri` (default 0.7); otherwise the
 * result is the spec's mandated typed kill — `{ outcome: "unstable" }`,
 * which the caller must route to the trials registry as a recorded negative
 * rather than defaulting to some K (there is no default-K value in this
 * type, the same no-overclaim discipline as poisson-its's ChangeCallout).
 */
export function selectKByLowoAri(
  weeklyData: ReadonlyArray<ReadonlyArray<readonly number[]>>,
  candidateKs: readonly number[],
  options: GmmFitOptions & { readonly minStableAri?: number },
): LowoAriSelection {
  if (weeklyData.length < 2) throw new RangeError("selectKByLowoAri: need at least 2 weeks for leave-one-week-out");
  if (candidateKs.length === 0) throw new RangeError("selectKByLowoAri: candidateKs must be non-empty");
  const minStableAri = options.minStableAri ?? 0.7;
  const pooled = weeklyData.flat();

  const meanAriByK = new Map<number, number>();
  for (const k of candidateKs) {
    const foldLabels: number[][] = [];
    for (let held = 0; held < weeklyData.length; held++) {
      const train = weeklyData.filter((_, w) => w !== held).flat();
      if (train.length < k) continue; // fold too thin to fit this K
      const model = fitDiagonalGmm(train, k, options);
      foldLabels.push(gmmHardLabels(model, pooled));
    }
    if (foldLabels.length < 2) {
      meanAriByK.set(k, Number.NaN);
      continue;
    }
    let sum = 0;
    let pairs = 0;
    for (let a = 0; a < foldLabels.length; a++) {
      for (let b = a + 1; b < foldLabels.length; b++) {
        sum += adjustedRandIndexInternal(foldLabels[a]!, foldLabels[b]!);
        pairs++;
      }
    }
    meanAriByK.set(k, sum / pairs);
  }

  let bestK: number | null = null;
  let bestAri = -Infinity;
  for (const [k, ari] of meanAriByK) {
    if (Number.isFinite(ari) && ari > bestAri) {
      bestAri = ari;
      bestK = k;
    }
  }
  if (bestK !== null && bestAri >= minStableAri) {
    return { outcome: "selected", k: bestK, meanAriByK };
  }
  return { outcome: "unstable", meanAriByK };
}

/**
 * Feature-influence diagnostic (their Influence_m): mean LOWO ARI with all
 * features minus mean LOWO ARI with feature m dropped — a large positive
 * value means feature m is load-bearing for partition stability.
 */
export function featureInfluence(
  weeklyData: ReadonlyArray<ReadonlyArray<readonly number[]>>,
  k: number,
  options: GmmFitOptions,
): number[] {
  if (weeklyData.length < 2) throw new RangeError("featureInfluence: need at least 2 weeks");
  const dim = weeklyData[0]?.[0]?.length ?? 0;
  if (dim < 2) throw new RangeError("featureInfluence: need at least 2 features to drop one");

  const meanAriFor = (drop: number | null): number => {
    const project = (row: readonly number[]) => (drop === null ? [...row] : row.filter((_, j) => j !== drop));
    const weeks = weeklyData.map((w) => w.map(project));
    const pooled = weeks.flat();
    const foldLabels: number[][] = [];
    for (let held = 0; held < weeks.length; held++) {
      const train = weeks.filter((_, w) => w !== held).flat();
      if (train.length < k) continue;
      const model = fitDiagonalGmm(train, k, options);
      foldLabels.push(gmmHardLabels(model, pooled));
    }
    if (foldLabels.length < 2) return Number.NaN;
    let sum = 0;
    let pairs = 0;
    for (let a = 0; a < foldLabels.length; a++) {
      for (let b = a + 1; b < foldLabels.length; b++) {
        sum += adjustedRandIndexInternal(foldLabels[a]!, foldLabels[b]!);
        pairs++;
      }
    }
    return sum / pairs;
  };

  const baseline = meanAriFor(null);
  const out = new Array<number>(dim);
  for (let j = 0; j < dim; j++) out[j] = baseline - meanAriFor(j);
  return out;
}

// ---------------------------------------------------------------------------
// Semantic-label polarity gate (the CodeRabbit finding, mechanically encoded)
// ---------------------------------------------------------------------------

export type ClusterLabeling =
  | { readonly kind: "anonymous" }
  | { readonly kind: "man_zone"; readonly manCluster: number };

/**
 * Apply the pre-registered lowest-mean-cushion → MAN mapping ONLY when the
 * caller presents an explicitly PASSED polarity validation. With `null` or a
 * failed validation, clusters stay anonymous — a stable-but-inverted
 * polarity must never silently give `oppManTendency` the wrong meaning.
 */
export function labelClustersByCushionRule(
  model: DiagonalGmm,
  cushionFeatureIndex: number,
  polarityValidation: { readonly passed: boolean } | null,
): ClusterLabeling {
  if (!Number.isInteger(cushionFeatureIndex) || cushionFeatureIndex < 0 || cushionFeatureIndex >= model.dim) {
    throw new RangeError(`labelClustersByCushionRule: cushionFeatureIndex ${cushionFeatureIndex} out of range for dim ${model.dim}`);
  }
  if (polarityValidation === null || !polarityValidation.passed) return { kind: "anonymous" };
  let manCluster = 0;
  for (let g = 1; g < model.k; g++) {
    if (model.means[g]![cushionFeatureIndex]! < model.means[manCluster]![cushionFeatureIndex]!) manCluster = g;
  }
  return { kind: "man_zone", manCluster };
}

// Internal ARI used by the selection loops; the public export lives in
// stats.ts per the spec ("exact formula, no approximation"), re-exported
// there — this module keeps a private copy so kernel/ stays dependency-light.
// Dependency direction: stats.ts imports FROM kernel/gmm-em.ts (this file),
// one-way — this file must never import from stats.ts, or that becomes a cycle.
function adjustedRandIndexInternal(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new RangeError("adjustedRandIndex: partitions must have equal length");
  if (a.length === 0) throw new RangeError("adjustedRandIndex: partitions must be non-empty");
  const n = a.length;
  const labelIndexA = new Map<number, number>();
  const labelIndexB = new Map<number, number>();
  for (const l of a) if (!labelIndexA.has(l)) labelIndexA.set(l, labelIndexA.size);
  for (const l of b) if (!labelIndexB.has(l)) labelIndexB.set(l, labelIndexB.size);
  const contingency: number[][] = Array.from({ length: labelIndexA.size }, () => new Array<number>(labelIndexB.size).fill(0));
  for (let i = 0; i < n; i++) contingency[labelIndexA.get(a[i]!)!]![labelIndexB.get(b[i]!)!]!++;

  const choose2 = (m: number): number => (m * (m - 1)) / 2;
  let index = 0;
  for (const row of contingency) for (const nij of row) index += choose2(nij);
  const aSums = contingency.map((row) => row.reduce((s, v) => s + v, 0));
  const bSums = new Array<number>(labelIndexB.size).fill(0);
  for (const row of contingency) for (let j = 0; j < row.length; j++) bSums[j]! += row[j]!;
  const sumA = aSums.reduce((s, v) => s + choose2(v), 0);
  const sumB = bSums.reduce((s, v) => s + choose2(v), 0);
  const expected = (sumA * sumB) / choose2(n);
  const max = (sumA + sumB) / 2;
  if (max === expected) return 1; // degenerate (e.g. both single-cluster) — identical by convention
  return (index - expected) / (max - expected);
}

export { adjustedRandIndexInternal as adjustedRandIndex };
