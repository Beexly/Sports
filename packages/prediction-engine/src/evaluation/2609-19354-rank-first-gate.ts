/**
 * Rank-first promotion gates for generative-signal pipelines
 * (arXiv 2609.19354, "Can Vision-Language Models Judge Olympic Diving?").
 *
 * THE PAPER'S HEADLINE, AND WHY IT MATTERS HERE.
 * Six frozen VLMs were asked to judge Olympic diving zero-shot. Standalone
 * they were weak: the best of 17 model x prompt configurations reached
 * Spearman rho = 0.3174, and one configuration was ANTI-correlated
 * (Qwen 3B P1, rho = -0.1305). Feeding the same outputs through a small
 * supervised head more than doubled the rank correlation (rho = 0.6664).
 *
 * The number that matters for our purposes is not 0.6664. It is that the
 * SAME best model scored R^2 = 0.2387 — a model that explains under a
 * quarter of the outcome variance while ordering two thirds of the sample
 * correctly. Any promotion gate that reads R^2 kills that model. A
 * betting engine lives or dies on ORDERING and on threshold crossings, not
 * on point accuracy, so rho is the metric that matches the decision and R^2
 * is the metric that matches neither.
 *
 * Three further transferable findings, each wired below:
 *  - Difficulty scalar. Diving's official score is sum(judge scores) x DoD
 *    (degree of difficulty). The difficulty coefficient is a known
 *    multiplier applied to a raw signal before comparison. GSE has the same
 *    shape everywhere (baselines, league-average adjustments, difficulty of
 *    the prop). `withinStratumRankStability` asks the question that matters
 *    before you promote anything: does the edge survive conditioning on
 *    difficulty, or is it a difficulty artifact in disguise?
 *  - Textual reasoning beats self-reported numbers. Across the best
 *    configurations, the VLM's qualitative explanations carried more rank
 *    signal than the numeric sub-scores it emitted alongside them. Direct
 *    consequence for our pundit/narrative lane: regress on the reasoning,
 *    not on the analyst's self-reported probability. `textVsNumberDominance`
 *    makes that falsifiable in our own data instead of an assumption.
 *  - Ensemble size helped monotonically and diversity mattered more than
 *    scale, but the curve SATURATES. `ensembleDiversityCurve` returns the
 *    saturation point so the pool stops growing at the knee instead of by
 *    habit.
 *
 * ACCEPTANCE GATE: ADOPT the rank-first verdict as the primary promotion
 * criterion for rank-producing models iff, on a real GSE backtest, (a) the
 * permuted-label null is rejected at the stated alpha for the candidate,
 * AND (b) at least one promoted model would have been REJECTED by an R^2
 * gate at the current floor but ACCEPTED here. If (b) never fires the gate
 * is redundant and should be reported, not enforced.
 *
 * Research-only module. Not wired into any live promotion or selection path.
 */

/* ------------------------------------------------------------------ *
 * Rank correlation
 * ------------------------------------------------------------------ */

/** Ascending ranks with average ranks for ties. */
function averageRanks(values: readonly number[]): number[] {
  const idx = values.map((v, i) => [v, i] as const);
  idx.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[0] === b[0] ? 0 : a[0] - b[0]));
  const ranks = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && (idx[j + 1] as readonly [number, number])[0] === (idx[i] as readonly [number, number])[0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[(idx[k] as readonly [number, number])[1]] = avg;
    i = j + 1;
  }
  return ranks;
}

/**
 * Spearman rho as Pearson correlation of average ranks. The rank-based
 * form is used rather than the shortcut sum(d^2) form precisely because it
 * handles ties correctly — and ties are the normal case for bounded
 * score/sub-score outputs, which is what this paper feeds it.
 */
export function spearman(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length) throw new Error("spearman: length mismatch");
  if (x.length < 3) throw new Error("spearman: need >= 3 pairs");
  const rx = averageRanks(x);
  const ry = averageRanks(y);
  const n = x.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const a = (rx[i] as number) - mx;
    const b = (ry[i] as number) - my;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  if (sxx === 0 || syy === 0) return Number.NaN; // degenerate: constant input
  return sxy / Math.sqrt(sxx * syy);
}

/** Coefficient of determination. Reported, deliberately never gated on. */
export function rSquared(pred: readonly number[], actual: readonly number[]): number {
  if (pred.length !== actual.length) throw new Error("rSquared: length mismatch");
  if (pred.length < 2) throw new Error("rSquared: need >= 2 points");
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    const resid = (actual[i] as number) - (pred[i] as number);
    ssRes += resid * resid;
    const d = (actual[i] as number) - mean;
    ssTot += d * d;
  }
  if (ssTot === 0) return Number.NaN;
  return 1 - ssRes / ssTot;
}

/**
 * OLS slope of `actual` on `pred`. Rank-first promotion must NOT be
 * scale-blind: a perfectly monotone but almost flat predictor has rho = 1
 * and garbage magnitudes, and feeding that to an EV or Kelly calculation is
 * worse than having no model at all. The slope is the cheap guard — it is
 * invariant to the intercept, so it asks only "is the output range big
 * enough to be usable downstream".
 */
export function olsSlope(actual: readonly number[], pred: readonly number[]): number {
  if (actual.length !== pred.length) throw new Error("olsSlope: length mismatch");
  if (actual.length < 2) throw new Error("olsSlope: need >= 2 points");
  const mp = pred.reduce((a, b) => a + b, 0) / pred.length;
  const ma = actual.reduce((a, b) => a + b, 0) / actual.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < pred.length; i++) {
    const dp = (pred[i] as number) - mp;
    num += dp * ((actual[i] as number) - ma);
    den += dp * dp;
  }
  if (den === 0) return Number.NaN;
  return num / den;
}

/* ------------------------------------------------------------------ *
 * Deterministic RNG (permutation tests must be reproducible in CI)
 * ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values: readonly number[], rand: () => number): number[] {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i] as number;
    out[i] = out[j] as number;
    out[j] = tmp;
  }
  return out;
}

/**
 * One-sided permutation p-value for H0: rho <= 0 under label exchangeability.
 * Reports the standard +1 correction so p is never exactly 0.
 */
export function permutationPValue(
  x: readonly number[],
  y: readonly number[],
  permutations = 2000,
  seed = 20260926,
): number {
  if (x.length !== y.length) throw new Error("permutationPValue: length mismatch");
  const observed = spearman(x, y);
  if (Number.isNaN(observed)) return 1;
  const rand = mulberry32(seed);
  let atLeast = 0;
  for (let p = 0; p < permutations; p++) {
    const r = spearman(x, shuffled(y, rand));
    if (!Number.isNaN(r) && r >= observed) atLeast++;
  }
  return (atLeast + 1) / (permutations + 1);
}

/* ------------------------------------------------------------------ *
 * The rank-first promotion verdict
 * ------------------------------------------------------------------ */

export interface RankFirstInput {
  /** Model predictions (higher = more likely to be selected/ bet). */
  pred: readonly number[];
  /** Realized outcomes / targets. */
  actual: readonly number[];
  /** Minimum rho to promote on ranking grounds. */
  rhoFloor: number;
  /** Significance level for the permuted-label null. */
  alpha?: number;
  /** Floor an R^2 gate would have applied, for the divergence report. */
  r2GateFloor?: number;
  /**
   * Minimum |OLS slope| of actual-on-pred for the output range to be usable
   * downstream. Rank evidence alone is not enough to ship a model whose
   * numbers will be fed to EV / sizing math. Default 0.1.
   */
  minAbsSlope?: number;
  /** Permutation count / seed — pinned in CI. */
  permutations?: number;
  seed?: number;
}

export type RankFirstVerdict =
  | "promote"
  | "reject-degenerate"
  | "reject-sign-inverted"
  | "reject-null-not-rejected"
  | "reject-below-rho-floor"
  | "reject-scale-unusable";

export interface RankFirstReport {
  verdict: RankFirstVerdict;
  rho: number;
  pValue: number;
  r2: number;
  /** OLS slope of actual on pred. Invariant to intercept. */
  slope: number;
  /** True when R^2 fails the accuracy gate but rho clears the rank gate. */
  rankBeatsAccuracyGate: boolean;
  /** Ranking evidence that a naive point-accuracy gate would discard. */
  reasons: string[];
}

/**
 * Promotion on rank evidence, with the R^2/accuracy view reported beside it
 * and never used to reject.
 *
 * Rejection paths are the ones the paper forces us to handle explicitly:
 * degenerate (constant predictions, rho = NaN) and sign-inverted
 * (rho < 0 — the paper found a real configuration at -0.1305, so "is it
 * correlated" is not a sufficient screen).
 */
export function rankFirstVerdict(input: RankFirstInput): RankFirstReport {
  const { pred, actual, rhoFloor } = input;
  const alpha = input.alpha ?? 0.05;
  const r2GateFloor = input.r2GateFloor ?? 0.1;
  if (pred.length !== actual.length) throw new Error("rankFirstVerdict: length mismatch");
  if (pred.length < 3) throw new Error("rankFirstVerdict: need >= 3 rows");

  const rho = spearman(pred, actual);
  const r2 = rSquared(pred, actual);
  const slope = olsSlope(actual, pred);
  const minAbsSlope = input.minAbsSlope ?? 0.1;
  const reasons: string[] = [];

  if (Number.isNaN(rho)) {
    return {
      verdict: "reject-degenerate",
      rho,
      pValue: 1,
      r2,
      slope,
      rankBeatsAccuracyGate: false,
      reasons: ["predictions are constant; no rank ordering exists"],
    };
  }

  const pValue = permutationPValue(pred, actual, input.permutations ?? 2000, input.seed);

  let verdict: RankFirstVerdict;
  if (rho < 0) {
    verdict = "reject-sign-inverted";
    reasons.push(
      `rho ${rho.toFixed(4)} < 0: the model orders events backwards. A sign flip ` +
        "recovers ordering, but an inverted model is a defect to fix upstream, not to deploy.",
    );
  } else if (pValue > alpha) {
    verdict = "reject-null-not-rejected";
    reasons.push(
      `permuted-label p ${pValue.toFixed(4)} > alpha ${alpha}: rho is not distinguishable from noise.`,
    );
  } else if (rho < rhoFloor) {
    verdict = "reject-below-rho-floor";
    reasons.push(`rho ${rho.toFixed(4)} < floor ${rhoFloor}.`);
  } else if (Number.isNaN(slope) || Math.abs(slope) < minAbsSlope) {
    verdict = "reject-scale-unusable";
    reasons.push(
      `slope ${Number.isNaN(slope) ? "NaN" : slope.toFixed(4)} is below |${minAbsSlope}|: the ` +
        "model may order events correctly but its output range is too flat to feed EV or sizing " +
        "math. Rank evidence does not excuse unusable magnitudes.",
    );
  } else {
    verdict = "promote";
  }

  const rankBeatsAccuracyGate = verdict === "promote" && (!Number.isNaN(r2) ? r2 < r2GateFloor : false);
  if (rankBeatsAccuracyGate) {
    reasons.push(
      `R^2 ${r2.toFixed(4)} fails the ${r2GateFloor} accuracy gate while rho ${rho.toFixed(4)} ` +
        "clears the rank floor: ordering evidence that a point-accuracy gate discards.",
    );
  }

  return { verdict, rho, pValue, r2, slope, rankBeatsAccuracyGate, reasons };
}

/* ------------------------------------------------------------------ *
 * Difficulty scalar (the paper's DoD) and the artifact test
 * ------------------------------------------------------------------ */

export interface DifficultyRow {
  /** Raw signal before difficulty weighting. */
  raw: number;
  /** Known difficulty coefficient, strictly positive. */
  difficulty: number;
  /** Realized target. */
  actual: number;
}

/**
 * The paper's scoring rule, generalized. Competitive diving computes
 * final = sum(judges) x DoD; DoD is a known difficulty multiplier applied
 * to the raw signal before any comparison is meaningful. `applyDifficulty`
 * is that one step. Aggregating the raw signals first and multiplying once
 * is equivalent for a single event and cheaper for a slate.
 */
export function applyDifficulty(
  signals: readonly number[],
  difficulties: readonly number[],
): number[] {
  if (signals.length !== difficulties.length) {
    throw new Error("applyDifficulty: length mismatch");
  }
  return signals.map((s, i) => {
    const d = difficulties[i] as number;
    if (!(d > 0) || !Number.isFinite(d)) throw new Error("applyDifficulty: difficulty must be > 0 and finite");
    return s * d;
  });
}

export interface DifficultyStratum {
  difficulty: number;
  n: number;
  rhoWithin: number; // NaN when the stratum cannot support a rank estimate
}

export interface DifficultyStability {
  rhoOverall: number;
  strata: DifficultyStratum[];
  /** Mean within-stratum rho, reweighted by stratum mass. */
  rhoWithinWeighted: number;
  /**
   * rhoWithinWeighted - rhoOverall. A large negative drop means the model's
   * apparent edge is mostly difficulty ordering, not signal: it ranks hard
   * events well and easy events badly, which is not an edge, it is a
   * difficulty proxy. Gate wants this >= -tolerance.
   */
  attenuation: number;
  stable: boolean;
}

/**
 * Does the edge survive conditioning on difficulty?
 *
 * Group rows by exact difficulty coefficient, compute rho inside each
 * stratum, and compare the mass-weighted within-stratum rho against the
 * pooled rho. Strata too small to support a rank estimate are reported with
 * rhoWithin = NaN and excluded from the weighted mean rather than being
 * silently counted as zero.
 */
export function withinStratumRankStability(
  rows: readonly DifficultyRow[],
  { minStratum = 5, tolerance = 0.1 }: { minStratum?: number; tolerance?: number } = {},
): DifficultyStability {
  if (rows.length === 0) throw new Error("withinStratumRankStability: no rows");
  const byDiff = new Map<number, DifficultyRow[]>();
  for (const r of rows) {
    if (!(r.difficulty > 0)) throw new Error("withinStratumRankStability: difficulty must be > 0");
    const bucket = byDiff.get(r.difficulty);
    if (bucket) bucket.push(r);
    else byDiff.set(r.difficulty, [r]);
  }

  const strata: DifficultyStratum[] = [];
  let weighted = 0;
  let weight = 0;
  for (const [difficulty, group] of [...byDiff.entries()].sort((a, b) => a[0] - b[0])) {
    const rhoWithin =
      group.length >= minStratum
        ? spearman(
            group.map((r) => r.raw),
            group.map((r) => r.actual),
          )
        : Number.NaN;
    strata.push({ difficulty, n: group.length, rhoWithin });
    if (!Number.isNaN(rhoWithin)) {
      weighted += rhoWithin * group.length;
      weight += group.length;
    }
  }

  const rhoOverall = spearman(
    rows.map((r) => r.raw),
    rows.map((r) => r.actual),
  );
  const rhoWithinWeighted = weight === 0 ? Number.NaN : weighted / weight;
  const attenuation = Number.isNaN(rhoWithinWeighted) ? Number.NaN : rhoWithinWeighted - rhoOverall;
  const stable = !Number.isNaN(attenuation) && attenuation >= -tolerance;

  return { rhoOverall, strata, rhoWithinWeighted, attenuation, stable };
}

/* ------------------------------------------------------------------ *
 * Textual reasoning vs self-reported numbers
 * ------------------------------------------------------------------ */

export interface FeaturePairInput {
  /** Predictions from the model's own numeric output (sub-scores / probs). */
  numeric: readonly number[];
  /** Predictions regressed from the model's qualitative reasoning text. */
  textual: readonly number[];
  actual: readonly number[];
  permutations?: number;
  seed?: number;
}

export interface DominanceReport {
  rhoNumeric: number;
  rhoTextual: number;
  /** rhoTextual - rhoNumeric. The paper's effect, signed. */
  margin: number;
  /** true when the reasoning-derived signal carries strictly more rank. */
  textDominates: boolean;
  /**
   * Two-sided permutation p for H0: the two predictors are exchangeable in
   * rank signal. Under the paper's finding this rejects and textDominates
   * is true. Under a null where they are equal, p is large — which is the
   * control that proves the test can fail.
   */
  pValue: number;
  significant: boolean;
}

/**
 * The paper's most counter-intuitive result, made falsifiable on our data.
 * It found the VLM's qualitative explanations carried more rank signal than
 * the numeric sub-scores emitted beside them — the reasoning, not the
 * number. For our pundit/narrative lane the operational reading is
 * "regress on the digest, do not trust the analyst's self-reported
 * probability". That claim is only worth wiring if it can come out false,
 * hence the exchangeability test on the margin.
 */
export function textVsNumberDominance(input: FeaturePairInput): DominanceReport {
  const { numeric, textual, actual } = input;
  if (numeric.length !== textual.length || numeric.length !== actual.length) {
    throw new Error("textVsNumberDominance: length mismatch");
  }
  if (numeric.length < 3) throw new Error("textVsNumberDominance: need >= 3 rows");

  const rhoNumeric = spearman(numeric, actual);
  const rhoTextual = spearman(textual, actual);
  const margin = rhoTextual - rhoNumeric;

  // Exchangeability null: swap the two predictors across rows, recompute the
  // margin, and count how often |margin| is at least as large as observed.
  const rand = mulberry32(input.seed ?? 20260926);
  const permutations = input.permutations ?? 2000;
  let extreme = 0;
  for (let p = 0; p < permutations; p++) {
    const a = shuffled(numeric, rand);
    const b = shuffled(textual, rand);
    const m = spearman(b, actual) - spearman(a, actual);
    if (!Number.isNaN(m) && Math.abs(m) >= Math.abs(margin)) extreme++;
  }
  const pValue = (extreme + 1) / (permutations + 1);

  return {
    rhoNumeric,
    rhoTextual,
    margin,
    textDominates: margin > 0,
    pValue,
    significant: pValue <= 0.05,
  };
}

/* ------------------------------------------------------------------ *
 * Ensemble diversity curve — where to stop growing the pool
 * ------------------------------------------------------------------ */

export interface EnsembleMember {
  name: string;
  pred: readonly number[];
}

export interface DiversityCurvePoint {
  size: number;
  /** Mean rho of the members selected so far. */
  meanRho: number;
  /** rho of the mean prediction (the pooled ensemble). */
  pooledRho: number;
  /** Improvement in pooled rho over the previous point. */
  marginalGain: number;
  added: string;
}

export interface DiversityCurve {
  points: DiversityCurvePoint[];
  /** Pooled rho at full pool size. */
  bestPooledRho: number;
  /** First size where marginal gain falls under the saturation epsilon. */
  saturationSize: number | null;
  selected: string[];
}

/**
 * Greedy forward selection on pooled rho, reporting the whole curve.
 *
 * The paper's Table 2 shows monotonic improvement with ensemble size, but
 * the increments shrink; the operational question is where the knee is, and
 * the answer should be measured rather than assumed. Greedy selection is
 * used rather than exhaustive permutation because the paper's own exhaustive
 * enumeration is O(n!); the curve, not the exact optimum, is the deliverable.
 */
export function ensembleDiversityCurve(
  members: readonly EnsembleMember[],
  actual: readonly number[],
  { saturationEpsilon = 0.01, maxSize = 4 }: { saturationEpsilon?: number; maxSize?: number } = {},
): DiversityCurve {
  if (members.length === 0) throw new Error("ensembleDiversityCurve: no members");
  for (const m of members) {
    if (m.pred.length !== actual.length) {
      throw new Error(`ensembleDiversityCurve: ${m.name} length mismatch`);
    }
  }
  const limit = Math.min(maxSize, members.length);

  const selected: string[] = [];
  const points: DiversityCurvePoint[] = [];
  let saturationSize: number | null = null;
  let prevPooled = Number.NaN;

  for (let step = 0; step < limit; step++) {
    const remaining = members.filter((m) => !selected.includes(m.name));
    if (remaining.length === 0) break;

    let best: EnsembleMember | null = null;
    let bestPooled = -Infinity;
    let bestMean = -Infinity;
    for (const cand of remaining) {
      const pool = [...selected, cand.name];
      const chosen = members.filter((m) => pool.includes(m.name));
      const mean = pool.map((name) => (members.find((m) => m.name === name) as EnsembleMember).pred);
      const pooled = mean.reduce<number[]>(
        (acc, p) => acc.map((v, j) => v + (p[j] as number)),
        new Array<number>(actual.length).fill(0),
      );
      const pooledRho = spearman(pooled.map((v) => v / pool.length), actual);
      const meanRho =
        chosen.reduce((a, m) => a + spearman(m.pred, actual), 0) / chosen.length;
      if (pooledRho > bestPooled || (pooledRho === bestPooled && meanRho > bestMean)) {
        best = cand;
        bestPooled = pooledRho;
        bestMean = meanRho;
      }
    }
    if (best === null) break;
    selected.push(best.name);
    const gain = Number.isNaN(prevPooled) ? Number.NaN : bestPooled - prevPooled;
    points.push({
      size: selected.length,
      meanRho: bestMean,
      pooledRho: bestPooled,
      marginalGain: gain,
      added: best.name,
    });
    if (!Number.isNaN(gain) && gain < saturationEpsilon && saturationSize === null) {
      saturationSize = selected.length;
    }
    prevPooled = bestPooled;
  }

  return {
    points,
    bestPooledRho: prevPooled,
    saturationSize,
    selected,
  };
}
