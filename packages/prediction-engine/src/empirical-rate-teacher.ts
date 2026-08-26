/**
 * Empirical-rate teacher — R&D (NOT wired into live scoring).
 *
 * Ported from arXiv:2607.00164 (Singh, Reddy & Chopra, "Verifiable Rewards for
 * Calibrated Probabilistic Forecasting"; CC BY-NC-ND — method only, no text/
 * figure/code reuse). Their reward-target ablation showed a single realized
 * outcome (0/1) is too high-variance a training/eval target; a state-
 * conditioned empirical win rate p̂(x), estimated from historical outcomes and
 * hierarchically shrunk toward coarser parent buckets, is both lower-variance
 * and — on their held-out NFL win-probability data — a STRONGER forecaster
 * than several purpose-built models (their Table 4).
 *
 * This module is the general-purpose piece: given samples pre-discretized
 * into a dimension hierarchy (e.g. pickType × market-q-band × sport), fit a
 * hierarchical empirical-Bayes bucket-rate model —
 *
 *   p̂_level = (w + M · p̂_parent) / (n + M)     (their §1.3, pseudocount M)
 *
 * — walked from the global rate down through each dimension prefix to the
 * full bucket. An unseen bucket at predict time contributes (w=0, n=0), which
 * the same formula reduces to its parent's already-shrunk value — the
 * standard graceful fallback to the nearest observed coarser level.
 *
 * `teacherGapReport` scores an existing forecaster (raw confidence, PAVA,
 * CIR, or the market's own q) against the teacher and against outcomes — see
 * `docs/ops/edge/2026-08-26-paper-spec-rlvr-empirical-rate.md` §3a for the
 * convergence test this feeds: if independent forecasters converge on the
 * teacher's held-out Brier, that is affirmative evidence they carry no
 * information beyond state, which turns a Brier-floor diagnosis into a
 * positive statement (resolution must come from new covariates) rather than
 * a shrug.
 */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(value: number, digits = 4): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

export interface TeacherSample {
  /** Realized binary outcome: 1 = win, 0 = loss. */
  readonly y: 0 | 1;
  /**
   * Pre-discretized bucket index per configured dimension, same order and
   * cardinality as `TeacherConfig.dims`. Binning (e.g. market-q into bands)
   * is the caller's responsibility — see `binIndexFromEdges`.
   */
  readonly bucket: readonly number[];
}

export interface TeacherDim {
  readonly name: string;
  /** Number of distinct bucket indices this dimension takes, i.e. [0, cardinality). */
  readonly cardinality: number;
}

export interface TeacherConfig {
  /** Dimensions in hierarchy order — first dim is shrunk toward the global rate, second toward the first, etc. */
  readonly dims: readonly TeacherDim[];
  /** Empirical-Bayes pseudocount M (paper default 25). */
  readonly pseudocount?: number;
}

export interface TeacherModel {
  readonly dims: readonly TeacherDim[];
  readonly pseudocount: number;
  /** Raw (unshrunk) win rate over all fit samples — the hierarchy's root. 0.5 if fit on zero samples. */
  readonly globalRate: number;
  readonly sampleSize: number;
  /** Number of distinct full-bucket keys observed during fit (diagnostic — low cardinality vs sample size signals under-conditioning). */
  readonly bucketCount: number;
  /** Predict p̂(x) for a feature-bucket tuple, walking the shrinkage hierarchy. */
  readonly predict: (bucket: readonly number[]) => number;
}

function bucketKey(bucket: readonly number[], upTo: number): string {
  return bucket.slice(0, upTo).join(",");
}

/**
 * Fit the hierarchical empirical-Bayes bucket-rate model. Pure; does not
 * mutate `samples`. Throws on malformed config or out-of-range bucket
 * indices — a silently-clamped bad bucket would misattribute a sample to the
 * wrong cell and corrupt every ancestor level's rate.
 */
export function fitEmpiricalRateTeacher(
  samples: readonly TeacherSample[],
  config: TeacherConfig,
): TeacherModel {
  const pseudocount = config.pseudocount ?? 25;
  if (!Number.isFinite(pseudocount) || pseudocount < 0) {
    throw new RangeError(`fitEmpiricalRateTeacher: pseudocount must be >= 0, got ${pseudocount}`);
  }
  const dims = config.dims;
  const k = dims.length;
  for (const [i, d] of dims.entries()) {
    if (!Number.isInteger(d.cardinality) || d.cardinality < 1) {
      throw new RangeError(`fitEmpiricalRateTeacher: dims[${i}] (${d.name}) cardinality must be a positive integer, got ${d.cardinality}`);
    }
  }
  for (const [i, s] of samples.entries()) {
    if (s.bucket.length !== k) {
      throw new RangeError(`fitEmpiricalRateTeacher: sample ${i} has ${s.bucket.length} bucket dims, expected ${k}`);
    }
    for (let d = 0; d < k; d++) {
      const v = s.bucket[d]!;
      if (!Number.isInteger(v) || v < 0 || v >= dims[d]!.cardinality) {
        throw new RangeError(
          `fitEmpiricalRateTeacher: sample ${i} bucket[${d}] (${dims[d]!.name}) out of range [0, ${dims[d]!.cardinality}): ${v}`,
        );
      }
    }
  }

  const n = samples.length;
  const globalRate = n > 0 ? samples.reduce((sum, s) => sum + s.y, 0) / n : 0.5;

  // One map per level (1..k), keyed by the joined bucket-index prefix.
  const levelMaps: Map<string, { w: number; n: number }>[] = Array.from({ length: k }, () => new Map());
  for (const s of samples) {
    for (let level = 1; level <= k; level++) {
      const key = bucketKey(s.bucket, level);
      const cur = levelMaps[level - 1]!.get(key) ?? { w: 0, n: 0 };
      cur.w += s.y;
      cur.n += 1;
      levelMaps[level - 1]!.set(key, cur);
    }
  }

  const predict = (bucket: readonly number[]): number => {
    if (bucket.length !== k) {
      throw new RangeError(`predict: expected ${k} bucket dims, got ${bucket.length}`);
    }
    let p = globalRate;
    for (let level = 1; level <= k; level++) {
      const key = bucketKey(bucket, level);
      const cell = levelMaps[level - 1]!.get(key) ?? { w: 0, n: 0 };
      const denom = cell.n + pseudocount;
      if (denom === 0) continue; // M=0 and an unseen bucket: no evidence, no prior mass — leave p unchanged
      p = (cell.w + pseudocount * p) / denom;
    }
    return clamp01(p);
  };

  return {
    dims,
    pseudocount,
    globalRate: round(clamp01(globalRate)),
    sampleSize: n,
    bucketCount: k === 0 ? (n > 0 ? 1 : 0) : levelMaps[k - 1]!.size,
    predict,
  };
}

/**
 * Bin a numeric value into [0, edges.length] via ascending edges — the
 * caller's tool for turning e.g. a market-implied probability into a band
 * index before building a `TeacherSample.bucket`. `edges` must be strictly
 * ascending; `binIndex` = count of edges <= value (so `edges.length + 1`
 * total bins/bands, cardinality = edges.length + 1).
 */
export function binIndexFromEdges(value: number, edges: readonly number[]): number {
  let idx = 0;
  for (const e of edges) {
    if (value >= e) idx++;
    else break;
  }
  return idx;
}

export interface ForecasterSample {
  /** Same bucket space the teacher was fit on. */
  readonly bucket: readonly number[];
  /** This forecaster's probability for the sample, in [0,1]. */
  readonly p: number;
  readonly y: 0 | 1;
}

export interface TeacherGapBucketRow {
  readonly key: string;
  readonly n: number;
  readonly teacherP: number;
  readonly forecasterMeanP: number;
  /** forecasterMeanP - teacherP; positive = forecaster reads higher than the teacher in this bucket. */
  readonly gap: number;
}

export interface TeacherGapReport {
  readonly sampleSize: number;
  /** Mean |forecaster p - teacher p̂(x)| across samples — how far this forecaster sits from the state-conditioned rate. */
  readonly meanAbsGap: number;
  /** This forecaster's own Brier score against realized outcomes. */
  readonly forecasterBrier: number;
  /** The teacher's own Brier score against realized outcomes, on the SAME sample set (their Table 4 question: is the bucketed rate itself a better forecaster?). */
  readonly teacherBrier: number;
  readonly buckets: readonly TeacherGapBucketRow[];
}

/**
 * Score one forecaster (raw confidence, a calibration map's output, or the
 * market's own q) against a fitted teacher and against realized outcomes.
 * Does not fit anything — pass a teacher fit on a disjoint (e.g. train-slice)
 * sample set to avoid look-ahead leakage, exactly as with the isotonic
 * calibrators in `probability-calibration.ts`.
 */
export function teacherGapReport(
  forecasts: readonly ForecasterSample[],
  teacher: TeacherModel,
): TeacherGapReport {
  const n = forecasts.length;
  if (n === 0) {
    return { sampleSize: 0, meanAbsGap: 0, forecasterBrier: 0, teacherBrier: 0, buckets: [] };
  }

  let absGapSum = 0;
  let forecasterSq = 0;
  let teacherSq = 0;
  const byBucket = new Map<string, { n: number; teacherP: number; forecasterPSum: number }>();

  for (const f of forecasts) {
    const teacherP = teacher.predict(f.bucket);
    absGapSum += Math.abs(f.p - teacherP);
    forecasterSq += (f.p - f.y) ** 2;
    teacherSq += (teacherP - f.y) ** 2;

    const key = f.bucket.join(",");
    const cell = byBucket.get(key) ?? { n: 0, teacherP, forecasterPSum: 0 };
    cell.n += 1;
    cell.forecasterPSum += f.p;
    byBucket.set(key, cell);
  }

  const buckets: TeacherGapBucketRow[] = [...byBucket.entries()]
    .map(([key, cell]) => {
      const forecasterMeanP = cell.forecasterPSum / cell.n;
      return {
        key,
        n: cell.n,
        teacherP: round(cell.teacherP),
        forecasterMeanP: round(forecasterMeanP),
        gap: round(forecasterMeanP - cell.teacherP),
      };
    })
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return {
    sampleSize: n,
    meanAbsGap: round(absGapSum / n),
    forecasterBrier: round(forecasterSq / n),
    teacherBrier: round(teacherSq / n),
    buckets,
  };
}
