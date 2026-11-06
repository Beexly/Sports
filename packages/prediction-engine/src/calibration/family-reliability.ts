/**
 * family-reliability.ts — per-signal-family RELIABILITY over settled picks.
 *
 * WHAT THIS IS, AND WHY IT IS NOT family-weight-evidence.ts
 * ---------------------------------------------------------
 * `family-weight-evidence.ts` answers a DISCRIMINATION question: "does this
 * family's presence move the win rate?" It answers it with a stratified
 * two-proportion z, and it is right to — that is the right instrument for the
 * bet-type-mix confound it was written to refuse.
 *
 * It does not answer the CALIBRATION question, and no amount of win-rate lift
 * can substitute for it. A family can raise win rate from 50% to 53% and still
 * publish a 0.90 that lands 30% of the time. "Did the edge move" and "is the
 * number honest" are independent claims, and the calibration program needs the
 * second one measured on its own terms:
 *
 *   - does the published probability match the observed frequency (level)?
 *   - is it the right SHAPE, or systematically too extreme (slope)?
 *   - does it beat the base-rate climatology it is implicitly claiming to beat?
 *   - does the answer hold in the era it is being used in?
 *
 * Without these numbers, a tuner has no way to tell "this family is worth
 * 0.14" from "this family is confidently wrong", which are different bugs with
 * opposite fixes. A well-calibrated family with no edge is a KILL, and an
 * edge-carrying family with a slope of 0.4 is a SCALING bug, and only the
 * second one is repaired by tuning weights.
 *
 * THE MEASURED CONSTRAINTS THIS BUILDS FOR (read 2026-09-30, gse-postgres)
 * -------------------------------------------------------------------------
 * These are not hypothetical. Every one of them is a property of the actual
 * settled record, and each one is a way a naive harness produces a confident
 * wrong number:
 *
 *  1. `trueProb` DOES NOT EXIST FOR TOTAL. 0 of 1,109 settled TOTAL picks carry
 *     `factorBreakdown.independentEdge.trueProb`. A harness that pools all
 *     settled picks and reports one reliability figure is silently reporting a
 *     MONEYLINE+SPREAD number while calling it "all picks". Coverage is
 *     reported per pickType, and a cell with no probability is `no-probability`,
 *     never `inert` — the two mean opposite things.
 *
 *  2. `hadOddsSignal` IS TRUE ON 4,142 OF 4,142 SNAPSHOTS. It has no contrast
 *     arm at all. A harness that reports "odds family is well calibrated" is
 *     scoring a constant. This is `no-contrast`, and it is a distinct verdict
 *     from `inert` (measured and flat) because only one of them implies a
 *     verdict at all.
 *
 *  3. `hadWeatherSignal`, `hadInjurySignal`, `hadPaceSignal`, `hadRatingsSignal`
 *     and `hadMilestoneSignal` are FALSE on every row. Their weights are not
 *     merely unmeasured — there is nothing to measure. Reported as
 *     `never-populated`, because "we scored it and it was fine" and "it has
 *     never once fired" must never print the same line.
 *
 *  4. THE SPREAD PROBABILITY IS A DIFFERENT QUANTITY FROM ITS OUTCOME. The
 *     enrichment rationale on every spread row reads "team-win trueProb (not
 *     ATS cover p)". Scoring a team-win probability against a cover outcome is
 *     not a mild approximation — it is comparing two different events, and the
 *     resulting slope is an artifact of the definition. So a row declares what
 *     its probability means, and a mismatch against the pickType's expected
 *     event REFUSES the verdict. This is the single most load-bearing guard in
 *     the file: measured this way, spread shows slope ≈ 0.5 and looks badly
 *     overconfident, and that reading would be an artifact.
 *
 *  5. FIXTURES, NOT ROWS, ARE THE UNIT. 3,499 settled rows sit on ~1,900
 *     fixtures. Treating rows as independent shrinks every interval by ~30%
 *     and manufactures significance out of fixture clustering — the V3-352
 *     finding. Every interval here is a CLUSTER bootstrap that resamples
 *     FIXTURES, and every cell reports its rows-per-fixture ratio.
 *
 *  6. ERAS FLIP. 396 rows settle in 2026-04 and 3,103 in 2026-07. A direction
 *     that holds pooled and reverses by era is the exact failure that stamped
 *     false CONFIRMS onto 788 rows. So a family verdict requires the era
 *     strata to AGREE, and disagreement is `unstable-across-eras` — a distinct
 *     verdict, not a footnote.
 *
 * HONESTY CONTRACT
 * ----------------
 *  - Pure and deterministic. No DB, no clock, no network, no randomness that
 *    is not seeded. The same rows always produce the same report, so two runs
 *    can be diffed.
 *  - No imputation. A missing probability is never replaced by 0.5, by the
 *    base rate, or by the pick's confidence score.
 *  - Below the evidence floor the verdict is `insufficient-evidence` and every
 *    inferential field is null. null means "we do not know" and must never be
 *    read as 0 — an unmeasured family is not an inert one.
 *  - The Brier skill score is computed against an IN-SAMPLE base-rate
 *    climatology, so it is an UPPER BOUND on skill, never a performance claim.
 *    It is named `brierSkillUpperBound` for that reason.
 *  - Saturated probabilities (p at the 1e-6 clip) are counted and reported as
 *    `saturated`, because a log loss silently rescued by clipping is a number
 *    that has been moved by a constant the reader cannot see.
 */

/** A settled pick's probability, and what that probability is a probability OF. */
export type ProbabilityEvent =
  /** P(published team wins outright) — the natural event for MONEYLINE. */
  | "team-win"
  /** P(published side covers the spread). */
  | "cover"
  /** P(published side goes over the total). */
  | "over-under"
  /** The writer did not say. Scored as uninterpretable, never as calibrated. */
  | "unspecified";

/** The event a pickType's settlement outcome actually resolves. */
export const SETTLEMENT_EVENT: Readonly<Record<string, ProbabilityEvent>> = {
  MONEYLINE: "team-win",
  SPREAD: "cover",
  TOTAL: "over-under",
};

/** One settled pick, joined to the probability that was published for it. */
export interface SettledPickObservation {
  readonly pickId: string;
  /** Clustering unit. Bootstrap resamples these, not pickId. */
  readonly gameId: string;
  /** MONEYLINE | SPREAD | TOTAL. Strata key — never pooled. */
  readonly pickType: string;
  /**
   * The published probability of the pick's side winning, or null when the pick
   * carries no probability at all.
   *
   * Nullable on purpose. On the live record 0 of 1109 settled TOTAL picks carry
   * an `independentEdge.trueProb`, and a non-null type would force a caller to
   * invent 0 (a 0% pick) or 0.5 (a coin flip) to satisfy the signature —
   * fabricating the exact number this harness exists to audit. `null` lets the
   * missing measurement be represented, so the cell reports `no-probability`
   * instead of scoring an invention.
   */
  readonly probability: number | null;
  /** 1 for a settled WIN, 0 for a settled LOSS. VOID/PUSH are excluded upstream. */
  readonly outcome: 0 | 1;
  /** Signal families present at mint time. */
  readonly families: readonly string[];
  /** What `probability` is a probability of. */
  readonly probabilityEvent: ProbabilityEvent;
  /** Free-form era label (e.g. "2026-04"). Stability is checked within these. */
  readonly era: string;
}

/** Rows a metric is computed from, after guards have already run. */
interface ScoredRow {
  readonly p: number;
  readonly y: 0 | 1;
  readonly fixture: string;
}

/** Minimum settled rows before a calibration verdict is allowed. */
export const MIN_CELL_ROWS = 200;

/**
 * Minimum settled rows on EACH side of a family presence contrast before a
 * gap is called. Matches the census's floor deliberately: two instruments that
 * disagree about what counts as evidence are how a program ends up with two
 * different answers to the same question.
 */
export const MIN_CONTRAST_ARM_ROWS = 100;

/** Minimum distinct fixtures before an interval is reported at all. */
export const MIN_CELL_FIXTURES = 60;

/** Clip applied to log loss. Rows at the clip are counted, not hidden. */
export const LOG_LOSS_CLIP = 1e-6;

/**
 * Slope tolerance around the ideal of 1. A slope in [1±TOLERANCE] is treated as
 * calibrated-in-shape. 0.15 is a deliberately blunt instrument: it is wide
 * enough that a cell must be genuinely mis-shaped to leave it, and it is
 * NAMED rather than buried so a reader can argue with it.
 */
export const SLOPE_TOLERANCE = 0.15;

/** Level tolerance, in probability points, for "calibration-in-the-large". */
export const LEVEL_TOLERANCE = 0.02;

export type ReliabilityVerdict =
  /** Slope ≈ 1, level ≈ 0, and the era strata agree. Honest on both counts. */
  | "calibrated"
  /** Slope < 1 − tol: publishes probabilities more extreme than it can support. */
  | "overconfident"
  /** Slope <= 0: the published probability carries no usable ranking. */
  | "undiscriminating"
  /** Slope > 1 + tol: publishes probabilities closer to 0.5 than it should. */
  | "underconfident"
  /** Slope is fine but the level is off — systematically high or low. */
  | "miscalibrated-level"
  /** Tested with power; no departure from calibration. */
  | "inert"
  /** Present and powered, but its probability answers a different question. */
  | "semantics-mismatch"
  /** Pooled direction does not survive being split by era. */
  | "unstable-across-eras"
  /** Fewer than MIN_CELL_ROWS settled rows. We do not know. */
  | "insufficient-evidence"
  /** The flag has no contrast arm — constant true or constant false. */
  | "no-contrast"
  /** Never fired on a settled pick. There is nothing to score. */
  | "never-populated"
  /** Settled rows exist, but none carries a usable probability. */
  | "no-probability";

/** One bucket of a reliability diagram. */
export interface ReliabilityBucket {
  /** Equal-mass rank of the bucket, 0-based. */
  readonly rank: number;
  readonly n: number;
  readonly meanProbability: number;
  readonly observedRate: number;
  /** observedRate − meanProbability. Positive = under-predicting that bucket. */
  readonly gap: number;
}

/** A percentile bootstrap interval. */
export interface Interval {
  readonly low: number;
  readonly high: number;
}

/** Calibration measured on one (family, pickType) cell. */
export interface FamilyReliability {
  readonly family: string;
  readonly pickType: string;
  readonly verdict: ReliabilityVerdict;
  readonly rows: number;
  readonly fixtures: number;
  /** rows / fixtures. 1.0 = independent; >1 = clustered, intervals widened. */
  readonly rowsPerFixture: number;
  /** Settled rows in the cell that carried NO usable probability. */
  readonly rowsWithoutProbability: number;
  /** Probability-coverage rate for this cell, 0..1. */
  readonly probabilityCoverage: number;
  /** Rows clipped at LOG_LOSS_CLIP. */
  readonly saturated: number;

  /** mean(p) − observed rate. Positive = publishes high. */
  readonly calibrationInTheLarge: number | null;
  /**
   * Which way the LEVEL is wrong, when the level instrument can say.
   * `over` = publishes more confident than the outcomes support,
   * `under` = publishes less confident, `null` = level inside tolerance.
   *
   * This exists because a shape verdict and a level verdict can contradict each
   * other, and a reader shown only "overconfident" would draw the wrong
   * conclusion. The first real run produced line_movement/MONEYLINE with slope
   * 0.255 (shape: leans too hard) against level -0.186 (published 18.6 points
   * too PESSIMISTIC, CI [-0.238, -0.134]). "Overconfident" is the wrong summary
   * for a forecaster that is flat AND low; the two defects need different
   * remedies, so the report states both rather than letting one label win.
   */
  readonly levelDirection: "over" | "under" | "null";
  /** Logistic slope of outcome on logit(p). 1 = correctly shaped. */
  readonly calibrationSlope: number | null;
  /** Logistic intercept. 0 = no systematic level offset beyond the slope. */
  readonly calibrationIntercept: number | null;
  /** Fixture-clustered interval on the slope. */
  readonly slopeInterval: Interval | null;
  /** Fixture-clustered interval on calibration-in-the-large. */
  readonly levelInterval: Interval | null;

  readonly brier: number | null;
  readonly logLoss: number | null;
  /** Base-rate climatology Brier — the bar an in-sample score is measured against. */
  readonly baseRateBrier: number | null;
  /**
   * 1 − brier / baseRateBrier. UPPER BOUND: the reference is fitted on the
   * same outcomes being scored. Necessary, never sufficient.
   */
  readonly brierSkillUpperBound: number | null;
  /** Mean |p − observedRate|. A cell with skill but no sharpness is not useful. */
  readonly sharpness: number | null;
  /** Equal-mass expected calibration error. */
  readonly expectedCalibrationError: number | null;
  /** Worst single-bucket gap. */
  readonly maxCalibrationError: number | null;
  readonly reliabilityCurve: readonly ReliabilityBucket[];

  /** Brier(present) − Brier(absent) within this pickType. Negative is better. */
  readonly brierGapVsAbsent: number | null;
  readonly brierGapInterval: Interval | null;
  readonly rowsPresent: number;
  readonly rowsAbsent: number;
  /** Per-era verdicts, when the cell spans more than one era. */
  readonly eraVerdicts: Readonly<Record<string, ReliabilityVerdict>>;
  /** Human-readable. Never empty — an unexplained verdict is a bug. */
  readonly reason: string;
}

// ───────────────────────── math (self-contained) ─────────────────────────

/** Abramowitz & Stegun 7.1.26, |error| < 1.5e-7. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Two-sided p-value for a z under the standard normal. */
export function twoTailedP(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(0, Math.min(1, 1 - Math.abs(erf(z / Math.SQRT2))));
}

/** logit with a symmetric clip; an unclipped logit is ±Infinity. */
export function logit(p: number, clip = 1e-9): number {
  const c = Math.min(1 - clip, Math.max(clip, p));
  return Math.log(c / (1 - c));
}

/** Deterministic 32-bit PRNG. Reproducibility beats entropy for a report. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Point-in-time Brier score. */
function brierOf(rows: readonly ScoredRow[]): number {
  if (rows.length === 0) return Number.NaN;
  let s = 0;
  for (const r of rows) s += (r.p - r.y) ** 2;
  return s / rows.length;
}

/** Mean log loss, counting rows that needed the clip. */
function logLossOf(rows: readonly ScoredRow[]): { mean: number; saturated: number } {
  if (rows.length === 0) return { mean: Number.NaN, saturated: 0 };
  let s = 0;
  let sat = 0;
  for (const r of rows) {
    if (r.p <= LOG_LOSS_CLIP || r.p >= 1 - LOG_LOSS_CLIP) sat++;
    const c = Math.min(1 - LOG_LOSS_CLIP, Math.max(LOG_LOSS_CLIP, r.p));
    s += r.y === 1 ? -Math.log(c) : -Math.log(1 - c);
  }
  return { mean: s / rows.length, saturated: sat };
}

/** Mean predicted probability. */
function meanProbability(rows: readonly ScoredRow[]): number {
  if (rows.length === 0) return Number.NaN;
  let s = 0;
  for (const r of rows) s += r.p;
  return s / rows.length;
}

/** Observed win frequency. */
function observedRate(rows: readonly ScoredRow[]): number {
  if (rows.length === 0) return Number.NaN;
  let s = 0;
  for (const r of rows) s += r.y;
  return s / rows.length;
}

/** Mean |p − observedRate|. Sharpness: how far from the cell's own base rate. */
function sharpnessOf(rows: readonly ScoredRow[]): number {
  const base = observedRate(rows);
  if (!Number.isFinite(base)) return Number.NaN;
  let s = 0;
  for (const r of rows) s += Math.abs(r.p - base);
  return s / rows.length;
}

/**
 * Equal-mass reliability curve.
 *
 * Equal-MASS, not equal-width: with a cell of a few hundred rows, equal-width
 * leaves the tails empty and reports an ECE that is really a statement about
 * the 0.4–0.6 band. Quantile bucketing spends the rows where the claims are.
 */
export function reliabilityCurve(
  rows: readonly ScoredRow[],
  buckets = 10,
): ReliabilityBucket[] {
  if (rows.length === 0 || buckets <= 0) return [];
  const sorted = rows.slice().sort((a, b) => a.p - b.p);
  const out: ReliabilityBucket[] = [];
  const per = sorted.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * per);
    const end = i === buckets - 1 ? sorted.length : Math.floor((i + 1) * per);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    const mp = meanProbability(slice);
    const obs = observedRate(slice);
    if (!Number.isFinite(mp) || !Number.isFinite(obs)) continue;
    out.push({
      rank: i,
      n: slice.length,
      meanProbability: mp,
      observedRate: obs,
      gap: obs - mp,
    });
  }
  return out;
}

/** Equal-mass ECE: Σ (nᵢ/N)·|gapᵢ|. */
export function expectedCalibrationError(
  rows: readonly ScoredRow[],
  buckets = 10,
): { ece: number; maxGap: number } {
  const curve = reliabilityCurve(rows, buckets);
  if (curve.length === 0 || rows.length === 0) {
    return { ece: Number.NaN, maxGap: Number.NaN };
  }
  let ece = 0;
  let maxGap = 0;
  for (const b of curve) {
    const w = b.n / rows.length;
    ece += w * Math.abs(b.gap);
    maxGap = Math.max(maxGap, Math.abs(b.gap));
  }
  return { ece, maxGap };
}

/**
 * Logistic recalibration of outcome on logit(p): y ~ a + b·logit(p).
 * Newton–Raphson / IRLS, no dependency.
 *
 * b = 1 and a = 0 is a calibrated forecaster. b < 1 means the probabilities
 * are too spread out for their accuracy; b > 1 means too compressed. Returns
 * nulls on separation or a singular fit rather than a large finite number that
 * reads like a measurement — a slope of 40 is not "very overconfident", it is
 * "the fit did not converge".
 */
export function calibrationFit(rows: readonly ScoredRow[]): {
  slope: number | null;
  intercept: number | null;
  separated: boolean;
} {
  if (rows.length < 10) return { slope: null, intercept: null, separated: false };
  // If every outcome is identical there is no logistic surface to fit.
  const ones = observedRate(rows);
  if (ones <= 0 || ones >= 1) return { slope: null, intercept: null, separated: true };

  const x = rows.map((r) => logit(r.p));
  const xs = x.map((v) => v - ones); // centre: keeps the Hessian well-conditioned
  const y = rows.map((r) => r.y);
  let a = 0;
  let b = 1;

  for (let iter = 0; iter < 50; iter++) {
    let g0 = 0;
    let g1 = 0;
    let h00 = 0;
    let h01 = 0;
    let h11 = 0;
    for (let i = 0; i < x.length; i++) {
      const xi = xs[i];
      const yi = y[i];
      if (xi === undefined || yi === undefined) continue;
      const eta = a + b * xi;
      const mu = 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, eta))));
      const w = Math.max(1e-9, mu * (1 - mu));
      const r = yi - mu;
      g0 += r;
      g1 += xi * r;
      h00 += w;
      h01 += xi * w;
      h11 += xi * xi * w;
    }
    const det = h00 * h11 - h01 * h01;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {
      return { slope: null, intercept: null, separated: true };
    }
    const da = (h11 * g0 - h01 * g1) / det;
    const db = (h00 * g1 - h01 * g0) / det;
    a += da;
    b += db;
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { slope: null, intercept: null, separated: true };
    }
    if (Math.abs(da) < 1e-10 && Math.abs(db) < 1e-10) {
      return { slope: b, intercept: a, separated: false };
    }
  }
  // Did not converge in 50 IRLS steps. Report null, not the last iterate.
  return { slope: null, intercept: null, separated: true };
}

// ───────────────────────── cluster bootstrap ─────────────────────────

/** Group scored rows by fixture so a resample can move whole fixtures. */
function groupByFixture(rows: readonly ScoredRow[]): Map<string, ScoredRow[]> {
  const m = new Map<string, ScoredRow[]>();
  for (const r of rows) {
    const list = m.get(r.fixture) ?? [];
    list.push(r);
    m.set(r.fixture, list);
  }
  return m;
}

/**
 * Percentile bootstrap over FIXTURES.
 *
 * `statistic` is evaluated on a resample in which every row of a drawn fixture
 * travels together. Resampling rows instead would treat three picks on one
 * game as three independent observations, which is the V3-352 clustering bug
 * and the reason this takes a fixture map rather than a row array.
 */
export function clusterBootstrap<T>(
  rows: readonly ScoredRow[],
  statistic: (sample: readonly ScoredRow[]) => T,
  options?: { readonly replicates?: number; readonly seed?: number },
): { readonly estimate: T; readonly interval: Interval | null } {
  const replicates = options?.replicates ?? 1000;
  const seed = options?.seed ?? 20260930;
  const estimate = statistic(rows);
  const groups = Array.from(groupByFixture(rows).values());
  if (groups.length < 2 || rows.length < MIN_CELL_ROWS) {
    return { estimate, interval: null };
  }
  const rng = mulberry32(seed);
  const draws: number[] = [];
  for (let r = 0; r < replicates; r++) {
    const sample: ScoredRow[] = [];
    for (let g = 0; g < groups.length; g++) {
      const pick = groups[Math.floor(rng() * groups.length)];
      if (pick === undefined) continue;
      for (const row of pick) sample.push(row);
    }
    const v = statistic(sample);
    if (typeof v === "number" && Number.isFinite(v)) draws.push(v);
  }
  if (draws.length < Math.max(50, replicates * 0.5)) {
    return { estimate, interval: null };
  }
  const sorted = draws.slice().sort((x, y) => x - y);
  const quantile = (q: number): number => {
    const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
    return sorted[i] as number;
  };
  return { estimate, interval: { low: quantile(0.025), high: quantile(0.975) } };
}

/**
 * Brier gap between the family's rows and the same-pickType rows without it,
 * with a PAIRED cluster bootstrap.
 *
 * The two arms share fixtures, so they are resampled TOGETHER: one draw of
 * fixtures feeds both arms. Resampling the arms independently would let the
 * present arm land on a favourable set of games and the absent arm on an
 * unfavourable one, manufacturing a gap out of fixture luck — and the gap
 * would be the most quotable number in the report.
 *
 * Naive tagging (`fixture#P${i}`) was the first cut and is wrong for a
 * specific reason: `${i}` makes every row its own cluster, which silently
 * discards the clustering the bootstrap exists to respect. Keys stay bare.
 */
function contrastGap(
  present: readonly ScoredRow[],
  absent: readonly ScoredRow[],
  options?: { readonly replicates?: number; readonly seed?: number },
): { gap: number | null; interval: Interval | null } {
  if (present.length === 0 || absent.length === 0) return { gap: null, interval: null };
  const estimate = brierOf(present) - brierOf(absent);
  if (present.length < MIN_CONTRAST_ARM_ROWS || absent.length < MIN_CONTRAST_ARM_ROWS) {
    return { gap: estimate, interval: null };
  }
  const replicates = options?.replicates ?? 1000;
  const rng = mulberry32(options?.seed ?? 20260930);

  // Union of fixture keys, so a fixture appearing in both arms is drawn once
  // and contributes to both — the pairing.
  const pByFixture = groupByFixture(present);
  const aByFixture = groupByFixture(absent);
  // Array.from, not a spread: spreading a MapIterator needs downlevelIteration
  // and a consumer compiling this at an older target gets a type error.
  const keys = Array.from(
    new Set([...Array.from(pByFixture.keys()), ...Array.from(aByFixture.keys())]),
  ).sort();
  if (keys.length < 2) return { gap: estimate, interval: null };

  const draws: number[] = [];
  for (let r = 0; r < replicates; r++) {
    const ps: ScoredRow[] = [];
    const as: ScoredRow[] = [];
    for (let g = 0; g < keys.length; g++) {
      const key = keys[Math.floor(rng() * keys.length)];
      if (key === undefined) continue;
      const pRows = pByFixture.get(key);
      if (pRows) for (const row of pRows) ps.push(row);
      const aRows = aByFixture.get(key);
      if (aRows) for (const row of aRows) as.push(row);
    }
    if (ps.length === 0 || as.length === 0) continue;
    const v = brierOf(ps) - brierOf(as);
    if (Number.isFinite(v)) draws.push(v);
  }
  if (draws.length < Math.max(50, replicates * 0.5)) {
    return { gap: estimate, interval: null };
  }
  const sorted = draws.slice().sort((x, y) => x - y);
  const quantile = (q: number): number => {
    const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
    return sorted[i] as number;
  };
  return { gap: estimate, interval: { low: quantile(0.025), high: quantile(0.975) } };
}

// ───────────────────────── cell construction ─────────────────────────

/** Neutral cell used when a guard fires before any metric can be computed. */
function emptyCell(
  family: string,
  pickType: string,
  rows: number,
  fixtures: number,
  verdict: ReliabilityVerdict,
  reason: string,
  extra?: Partial<FamilyReliability>,
): FamilyReliability {
  return {
    family,
    pickType,
    verdict,
    // A refusal path carries no measurement, so the direction is "null" unless
    // the caller passed a level through `extra`.
    levelDirection: "null",
    rows,
    fixtures,
    rowsPerFixture: fixtures > 0 ? rows / fixtures : 0,
    rowsWithoutProbability: 0,
    probabilityCoverage: 0,
    saturated: 0,
    calibrationInTheLarge: null,
    calibrationSlope: null,
    calibrationIntercept: null,
    slopeInterval: null,
    levelInterval: null,
    brier: null,
    logLoss: null,
    baseRateBrier: null,
    brierSkillUpperBound: null,
    sharpness: null,
    expectedCalibrationError: null,
    maxCalibrationError: null,
    reliabilityCurve: [],
    brierGapVsAbsent: null,
    brierGapInterval: null,
    rowsPresent: 0,
    rowsAbsent: 0,
    eraVerdicts: {},
    reason,
    ...extra,
  };
}

/** Narrow a raw observation to a scored row, or null when unusable. */
function toScored(o: SettledPickObservation): ScoredRow | null {
  // null is "this pick published no probability", which is the dominant real
  // state for TOTAL. It is not 0 and not 0.5.
  if (o.probability === null || !Number.isFinite(o.probability)) return null;
  if (o.probability < 0 || o.probability > 1) return null;
  if (o.outcome !== 0 && o.outcome !== 1) return null;
  return { p: o.probability, y: o.outcome, fixture: o.gameId };
}

/**
 * Decide whether a cell's probability is asking a question its outcome can
 * answer. Returns null when the two line up.
 */
export function semanticsConflict(
  pickType: string,
  event: ProbabilityEvent,
): string | null {
  if (event === "unspecified") {
    return (
      "the writer did not declare what this probability is a probability of, " +
      "so it cannot be scored against a settlement outcome"
    );
  }
  const expected = SETTLEMENT_EVENT[pickType];
  if (expected === undefined) {
    return `pickType ${pickType} has no declared settlement event, so no probability can be matched to its outcome`;
  }
  if (event !== expected) {
    return (
      `the published probability is a "${event}" probability but a ${pickType} ` +
      `settlement resolves "${expected}"; those are different events, so the ` +
      `slope would measure the definition rather than the forecaster`
    );
  }
  return null;
}

/** Core metrics for one set of scored rows. Nulls wherever the fit is absent. */
function coreMetrics(rows: readonly ScoredRow[]): {
  level: number | null;
  slope: number | null;
  intercept: number | null;
  brier: number | null;
  logLoss: number | null;
  baseRateBrier: number | null;
  skill: number | null;
  sharpness: number | null;
  ece: number | null;
  maxGap: number | null;
  curve: readonly ReliabilityBucket[];
  saturated: number;
} {
  if (rows.length === 0) {
    return {
      level: null, slope: null, intercept: null, brier: null, logLoss: null,
      baseRateBrier: null, skill: null, sharpness: null, ece: null,
      maxGap: null, curve: [], saturated: 0,
    };
  }
  const base = observedRate(rows);
  const meanP = meanProbability(rows);
  const brier = brierOf(rows);
  const ll = logLossOf(rows);
  // Base-rate climatology: the score a forecaster that always says "this cell's
  // own win rate" would earn. In-sample, so skill against it is an upper bound.
  const baseRateBrier = base * (1 - base);
  const skill = baseRateBrier > 0 ? 1 - brier / baseRateBrier : null;
  const fit = calibrationFit(rows);
  const { ece, maxGap } = expectedCalibrationError(rows);
  return {
    level: meanP - base,
    slope: fit.slope,
    intercept: fit.intercept,
    brier,
    logLoss: ll.mean,
    baseRateBrier,
    skill,
    sharpness: sharpnessOf(rows),
    ece: Number.isFinite(ece) ? ece : null,
    maxGap: Number.isFinite(maxGap) ? maxGap : null,
    curve: reliabilityCurve(rows),
    saturated: ll.saturated,
  };
}

/**
 * Classify one cell's shape and level into a verdict, with no era logic.
 *
 * SHAPE and LEVEL are separately identifiable, and conflating them hid a real
 * finding. A cell that publishes 0.80 on every pick and lands 50% has an
 * unidentifiable slope — every logit is identical, so there is no spread to fit
 * a line through. Reporting that cell `insufficient-evidence` discarded a
 * calibration error of +0.300 that the data states plainly, which is the whole
 * finding. So:
 *
 *   level off, slope identifiable + < 1  -> overconfident  (shape claim)
 *   level off, slope UNIDENTIFIABLE       -> miscalibrated-level (only claim made)
 *   shape off, level within tolerance    -> over/underconfident (shape claim)
 *
 * `insufficient-evidence` now means genuinely uninformative, not "one of my two
 * instruments was silent".
 */
/**
 * Which way the level is wrong, or "null" when it is inside tolerance. Shared by
 * the measured path so every reported cell says the same thing.
 */
function levelDirectionOf(level: number | null): "over" | "under" | "null" {
  if (level === null || !Number.isFinite(level)) return "null";
  if (level > LEVEL_TOLERANCE) return "over";
  if (level < -LEVEL_TOLERANCE) return "under";
  return "null";
}

function classify(
  level: number | null,
  slope: number | null,
  levelCI?: Interval | null,
  slopeCI?: Interval | null,
): ReliabilityVerdict {
  if (level === null) return "insufficient-evidence";
  const offLevel = Math.abs(level) > LEVEL_TOLERANCE;
  if (slope === null) {
    return offLevel ? "miscalibrated-level" : "insufficient-evidence";
  }
  // A SHAPE verdict requires the interval to EXCLUDE 1.0, not just the point
  // estimate to sit outside the tolerance band.
  //
  // The first real run of this harness on 3,499 settled picks called four cells
  // "overconfident" on slopes of 0.013–0.255 whose 95% intervals were
  // [-0.202, 0.278], [-0.243, 0.806], [-0.190, 0.275] and [-0.145, 0.320]. Every
  // one of those intervals contains 1.0 — the perfectly-calibrated slope. The
  // point estimate is far from 1 because the fit is being asked to draw a line
  // through a nearly flat scatter, but the data does not distinguish that line
  // from the calibrated one. Reporting `overconfident` there would have put four
  // false calibration defects into the record, on the exact families the
  // program is about to act on.
  //
  // The LEVEL claim is the one that survives, and the same run's level intervals
  // ([0.028, 0.121], [0.032, 0.127], [0.021, 0.118], [-0.238, -0.134]) all
  // exclude zero. So these cells are miscalibrated in LEVEL and silent on SHAPE,
  // which is exactly the distinction the two verdicts encode.
  // Two separate questions, and the tolerance must not answer both.
  //
  //   offSlope          — is the POINT estimate outside the acceptable band?
  //   slopeExcludesOne  — does the INTERVAL rule the perfectly-calibrated value
  //                       1.0 out? The band [1-t, 1+t] is about the point
  //                       estimate's position; the interval test is about
  //                       whether the data can distinguish this cell from a
  //                       calibrated one. Requiring the interval to clear the
  //                       whole BAND rather than just 1.0 double-counts the
  //                       tolerance: a slope of 0.776 with CI [0.622, 0.928]
  //                       rules out 1.0 cleanly, yet fails a test demanding
  //                       high < 0.85, and a real shape finding gets filed as
  //                       "insufficient-evidence" instead.
  const slopeExcludesOne = slopeCI != null && (slopeCI.high < 1 || slopeCI.low > 1);
  const offSlope = slope < 1 - SLOPE_TOLERANCE || slope > 1 + SLOPE_TOLERANCE;
  if (offSlope && slopeExcludesOne) {
    // A slope of 0 is not "overconfident" — it is no discrimination at all,
    // which is a worse and differently-shaped defect. The negative-slope half
    // of the reversal test depends on this: a forecaster whose ranking inverts
    // cannot be described by the same word as one that merely leans too hard.
    // Tolerated band, not an exact sign test: a steep but correctly ordered
    // forecaster whose fit is pulled by a handful of extremes can land a hair
    // negative (-0.12 is a real "leans too hard", not a ranking inversion). Only
    // a slope that is decisively on the wrong side of zero is undiscriminating.
    if (slope <= -SLOPE_TOLERANCE) return "undiscriminating";
    // Below 1 means the published probabilities move MORE than the outcomes
    // do. That is overconfidence in the usual sense when the sign is right
    // (steep and correctly ordered). When the intercept absorbs the difference
    // — a compressed but correctly ordered mapping — the forecaster is really
    // UNDERconfident: it knows more than it publishes. Both are real defects and
    // they need different fixes, so they get different verdicts.
    return slope < 1 ? "overconfident" : "underconfident";
  }
  if (offLevel) return "miscalibrated-level";
  // Shape looks off but the interval straddles 1.0: the honest answer is that
  // this cell does not establish a shape finding, and saying so beats letting a
  // loose point estimate pick a verdict.
  if (offSlope && !slopeExcludesOne) return "insufficient-evidence";
  return "calibrated";
}

/**
 * Measure one (family, pickType) cell.
 *
 * `allRows` is every settled observation for this pickType — both the family's
 * rows and the rows where it was absent. The absent arm is what the presence
 * arm's Brier is compared against, and it has to come from the same pickType:
 * comparing a MONEYLINE-present arm to a SPREAD-absent arm is the bet-type
 * proxy that produced the false "all five families anti-predictive" reading.
 */
export function measureFamilyReliability(
  family: string,
  pickType: string,
  allRows: readonly SettledPickObservation[],
): FamilyReliability {
  const scoped = allRows.filter((r) => r.pickType === pickType);
  const present = scoped.filter((r) => r.families.includes(family));
  const absent = scoped.filter((r) => !r.families.includes(family));

  const fixtures = new Set(present.map((r) => r.gameId)).size;

  // ── contrast guards, checked before any metric ──
  if (present.length === 0 && absent.length === 0) {
    return emptyCell(family, pickType, 0, 0, "never-populated",
      `no settled ${pickType} pick carries this family flag, present or absent`);
  }
  if (present.length === 0) {
    // `rows` counts rows CARRYING this family, so it is 0 here. An earlier
    // version passed `scoped.length` (the whole pickType) and printed
    // "600 rows" beside a never-populated verdict, which reads as "measured on
    // 600 rows" — the exact confusion this field must not create. The scope
    // stays visible through `rowsAbsent` and the reason string.
    return emptyCell(family, pickType, 0, 0, "never-populated",
      `the flag is false on all ${scoped.length} settled ${pickType} picks; there is nothing to score`,
      { rowsPresent: 0, rowsAbsent: absent.length });
  }
  if (absent.length === 0) {
    return emptyCell(family, pickType, present.length, fixtures, "no-contrast",
      `the flag is true on all ${present.length} settled ${pickType} picks, so the family has no ` +
      `contrast arm and cannot be measured; a constant is not a well-calibrated family`,
      { rowsPresent: present.length, rowsAbsent: 0 });
  }

  // ── probability availability, before anything is scored ──
  // The declared event is checked across the WHOLE cell, not just row 0. If a
  // cell mixes "team-win" and "cover" rows, scoring them against one settlement
  // event is a category error that no per-row check would catch, because each
  // row is individually plausible.
  const declared = Array.from(new Set(present.map((r) => r.probabilityEvent))).sort();
  const scoredPresent = present.map(toScored).filter((r): r is ScoredRow => r !== null);
  const coverage = present.length === 0 ? 0 : scoredPresent.length / present.length;

  // Precedence: does a probability exist at all, BEFORE asking what it is a
  // probability of. A TOTAL cell with no trueProb (0 of 1109 rows on the live
  // record) was reporting `semantics-mismatch` — a complaint about the meaning
  // of a number that does not exist. The missing number is the honest finding,
  // and it is the one an engineer can act on.
  if (scoredPresent.length === 0) {
    return emptyCell(family, pickType, present.length, fixtures, "no-probability",
      `none of the ${present.length} settled ${pickType} picks carrying this family carry a ` +
      `usable probability, so nothing can be scored; this is missing data, not a well-calibrated family`,
      { rowsPresent: present.length, rowsAbsent: absent.length, rowsWithoutProbability: present.length });
  }

  const conflict =
    declared.length > 1
      ? `rows in this cell declare ${declared.length} different probability events ` +
        `(${declared.join(", ")}); they cannot be scored against a single settlement event`
      : semanticsConflict(pickType, declared[0] as ProbabilityEvent);

  const absentScored = absent.map(toScored).filter((r): r is ScoredRow => r !== null);

  if (conflict !== null) {
    return emptyCell(family, pickType, present.length, fixtures, "semantics-mismatch", conflict, {
      rowsWithoutProbability: present.length - scoredPresent.length,
      probabilityCoverage: coverage,
      rowsPresent: present.length,
      rowsAbsent: absent.length,
    });
  }
  if (scoredPresent.length === 0) {
    return emptyCell(family, pickType, present.length, fixtures, "no-probability",
      `${present.length} settled ${pickType} picks carry this family, but none carries a usable ` +
      `probability, so there is nothing to score — this is missing data, not a flat result`,
      { rowsWithoutProbability: present.length, rowsPresent: present.length, rowsAbsent: absent.length });
  }

  const common = {
    rowsWithoutProbability: present.length - scoredPresent.length,
    probabilityCoverage: coverage,
    rowsPresent: present.length,
    rowsAbsent: absent.length,
  };

  if (scoredPresent.length < MIN_CELL_ROWS || fixtures < MIN_CELL_FIXTURES) {
    return emptyCell(family, pickType, present.length, fixtures, "insufficient-evidence",
      `${scoredPresent.length} scored rows on ${fixtures} fixtures is below the floor ` +
      `(${MIN_CELL_ROWS} rows / ${MIN_CELL_FIXTURES} fixtures). We do not know.`,
      common);
  }

  // ── the measurement ──
  const m = coreMetrics(scoredPresent);
  const slopeBoot = clusterBootstrap(scoredPresent, (s) => {
    const f = calibrationFit(s);
    return f.slope ?? Number.NaN;
  });
  const levelBoot = clusterBootstrap(scoredPresent, (s) => {
    const b = observedRate(s);
    if (!Number.isFinite(b)) return Number.NaN;
    return meanProbability(s) - b;
  });

  // Contrast: same pickType, same measure, the family's rows against the rest.
  const gap = contrastGap(scoredPresent, absentScored);
  const brierGap = gap.gap;
  const brierGapInterval = gap.interval;

  // ── era stability ──
  const eraVerdicts: Record<string, ReliabilityVerdict> = {};
  for (const era of Array.from(new Set(present.map((r) => r.era))).sort()) {
    const eraRows = present.filter((r) => r.era === era).map(toScored).filter((r): r is ScoredRow => r !== null);
    if (eraRows.length < MIN_CELL_ROWS) {
      eraVerdicts[era] = "insufficient-evidence";
      continue;
    }
    const em = coreMetrics(eraRows);
    // Each era gets its OWN interval. Passing a point estimate to `classify`
    // without one made every era fall through to `insufficient-evidence` under
    // the interval guard, so a real era reversal could never be detected — the
    // guard was right and the caller was incomplete.
    const eraSlopeCI = clusterBootstrap(eraRows, (s) => calibrationFit(s).slope ?? Number.NaN).interval;
    const eraLevelCI = clusterBootstrap(eraRows, (s) => {
      const b = observedRate(s);
      return Number.isFinite(b) ? meanProbability(s) - b : Number.NaN;
    }).interval;
    eraVerdicts[era] = classify(em.level, em.slope, eraLevelCI, eraSlopeCI);
  }
  const pool = classify(m.level, m.slope, levelBoot.interval, slopeBoot.interval);
  const eraPools = Object.entries(eraVerdicts).filter(([, v]) => v !== "insufficient-evidence");
  // Agreement means the same SHAPE verdict, not the same string: a cell that
  // is overconfident in both eras is stable even if its level also drifted.
  // `undiscriminating` is a shape claim: it says the published probability does
  // not order outcomes, which is exactly what a slope reversal would look like
  // on one side. It must participate in the stability check, or an era that
  // lost all discrimination would read as "in shape".
  const shapeOf = (v: ReliabilityVerdict) =>
    v === "overconfident" || v === "underconfident" || v === "undiscriminating" ? v : "in-shape";
  const shapes = new Set(eraPools.map(([, v]) => shapeOf(v)));
  // A level that reverses sign between eras is just as unstable as a shape
  // that does, and on a constant-probability cell the level is the only
  // instrument there is — comparing shapes alone would silently call that
  // stable.
  const levelSigns = new Set(
    eraPools.map(([era]) => {
      const eraRows = present
        .filter((r) => r.era === era)
        .map(toScored)
        .filter((r): r is ScoredRow => r !== null);
      const b = observedRate(eraRows);
      return Number.isFinite(b) && Math.abs(meanProbability(eraRows) - b) > LEVEL_TOLERANCE
        ? Math.sign(meanProbability(eraRows) - b)
        : 0;
    }),
  );
  const unstable = shapes.size > 1 || (levelSigns.has(1) && levelSigns.has(-1));
  const verdict: ReliabilityVerdict = unstable ? "unstable-across-eras" : pool;

  // A shape verdict and a level verdict pointing opposite ways is the most
  // misreadable thing this harness can emit. Say so in the reason string, not
  // only in a field a reader has to know to look for.
  const contradiction =
    (verdict === "overconfident" && m.level !== null && m.level < -LEVEL_TOLERANCE) ||
    (verdict === "undiscriminating" && m.level !== null && m.level < -LEVEL_TOLERANCE)
      ? `; NOTE the shape verdict and the level verdict disagree — the published ` +
        `probabilities are ${fmt(m.level)} BELOW the observed rate, so this cell is ` +
        `flat and pessimistic, not simply overconfident. Do not fix it with a ` +
        `sharpening map alone.`
      : "";

  const eraNote = eraPools.length
    ? `; era strata: ${Object.entries(eraVerdicts).map(([k, v]) => `${k}=${v}`).join(", ")}`
    : "";

  return {
    family,
    pickType,
    verdict,
    rows: present.length,
    fixtures,
    rowsPerFixture: present.length / fixtures,
    rowsWithoutProbability: present.length - scoredPresent.length,
    probabilityCoverage: coverage,
    saturated: m.saturated,
    calibrationInTheLarge: m.level,
    calibrationSlope: m.slope,
    calibrationIntercept: m.intercept,
    slopeInterval: slopeBoot.interval,
    levelInterval: levelBoot.interval,
    brier: m.brier,
    logLoss: m.logLoss,
    baseRateBrier: m.baseRateBrier,
    brierSkillUpperBound: m.skill,
    sharpness: m.sharpness,
    expectedCalibrationError: m.ece,
    maxCalibrationError: m.maxGap,
    reliabilityCurve: m.curve,
    brierGapVsAbsent: brierGap,
    brierGapInterval,
    rowsPresent: present.length,
    rowsAbsent: absent.length,
    eraVerdicts,
    levelDirection: levelDirectionOf(m.level),
    reason:
      `${scoredPresent.length} scored rows on ${fixtures} fixtures (${(coverage * 100).toFixed(1)}% ` +
      `probability coverage, ${m.saturated} saturated); level ${fmt(m.level)}, slope ${fmt(m.slope)} ` +
      `CI ${fmtInterval(slopeBoot.interval)}; Brier ${fmt(m.brier)} vs base-rate ${fmt(m.baseRateBrier)} ` +
      `= skill ${fmt(m.skill)}; vs absent arm ${fmt(brierGap)} ${fmtInterval(brierGapInterval)}` +
      `${contradiction}${eraNote}`,
  };
}

function fmt(v: number | null, dp = 3): string {
  return v === null || !Number.isFinite(v) ? "n/a" : v.toFixed(dp);
}
function fmtInterval(i: Interval | null): string {
  return i === null ? "(no interval)" : `(${i.low.toFixed(3)}, ${i.high.toFixed(3)})`;
}

/** Every (family, pickType) pair, sorted, so two runs can be diffed. */
export function measureAllFamilies(
  families: readonly string[],
  rows: readonly SettledPickObservation[],
): readonly FamilyReliability[] {
  const pickTypes = Array.from(new Set(rows.map((r) => r.pickType))).sort();
  const out: FamilyReliability[] = [];
  for (const f of families) for (const t of pickTypes) out.push(measureFamilyReliability(f, t, rows));
  return out;
}

/** Verdicts that mean "we did not measure this", kept separate from results. */
export const UNMEASURED_VERDICTS: readonly ReliabilityVerdict[] = [
  "insufficient-evidence",
  "no-contrast",
  "never-populated",
  "no-probability",
  "semantics-mismatch",
];

/** True when the verdict is a measured result rather than a refusal. */
export function isMeasured(v: ReliabilityVerdict): boolean {
  return !UNMEASURED_VERDICTS.includes(v);
}

/** Plain-language report. Every number traces to a field above. */
export function formatReliabilityReport(
  cells: readonly FamilyReliability[],
): string {
  const lines: string[] = [];
  lines.push("FAMILY RELIABILITY OVER SETTLED PICKS");
  lines.push("=====================================");
  if (cells.length === 0) {
    lines.push("no observations supplied — nothing was measured.");
    return lines.join("\n");
  }
  for (const c of cells) {
    lines.push("");
    lines.push(`${c.family} / ${c.pickType}  verdict=${c.verdict}`);
    lines.push(
      `  ${c.rows} settled rows on ${c.fixtures} fixtures (${c.rowsPerFixture.toFixed(2)} rows/fixture), ` +
      `probability coverage ${(c.probabilityCoverage * 100).toFixed(1)}%`,
    );
    lines.push(
      `  level ${fmt(c.calibrationInTheLarge)}  slope ${fmt(c.calibrationSlope)} ${fmtInterval(c.slopeInterval)}` +
      `  ECE ${fmt(c.expectedCalibrationError)}`,
    );
    lines.push(
      `  Brier ${fmt(c.brier)}  logloss ${fmt(c.logLoss, 4)}  skillUpperBound ${fmt(c.brierSkillUpperBound)}` +
      `  sharpness ${fmt(c.sharpness)}`,
    );
    lines.push(`  ${c.reason}`);
  }
  const measured = cells.filter((c) => isMeasured(c.verdict));
  const refusals = cells.filter((c) => !isMeasured(c.verdict));
  lines.push("");
  lines.push(
    `${measured.length} of ${cells.length} cells produced a measured verdict; ` +
    `${refusals.length} refused for want of evidence.`,
  );
  const byVerdict = new Map<ReliabilityVerdict, number>();
  for (const c of refusals) byVerdict.set(c.verdict, (byVerdict.get(c.verdict) ?? 0) + 1);
  for (const [v, n] of Array.from(byVerdict).sort()) lines.push(`  ${v}: ${n}`);
  return lines.join("\n");
}
