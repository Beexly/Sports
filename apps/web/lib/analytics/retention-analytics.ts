/**
 * Retention analytics — pure TypeScript, zero npm dependencies (Node built-ins only).
 *
 * All functions are pure (no side effects, no I/O). Every metric is derived
 * strictly from caller-supplied data; no figures are fabricated.
 *
 * Conventions:
 *  - Rates/fractions are returned in [0, 1] unless a function documents a
 *    percentage-like (0–100) output (e.g. {@link healthScore}).
 *  - Division-by-zero is guarded explicitly; documented per function.
 *  - `noUncheckedIndexedAccess` is enabled in this project, so every array
 *    index read uses a `?? 0` fallback.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortInput {
  /** Stable cohort identifier, e.g. "2024-01". */
  cohort: string;
  /** Active user counts per period, index 0 = acquisition period. */
  periodActives: number[];
  /** Original cohort size (period-0 denominator). */
  size: number;
}

export interface WeightedRetentionInput {
  /** Retention fraction in [0, 1]. */
  retention: number;
  /** Cohort size used as the weight. */
  size: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safe division: returns `fallback` when the denominator is 0 (or non-finite). */
function safeRatio(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return fallback;
  return numerator / denominator;
}

/** Clamp a number into the inclusive [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ---------------------------------------------------------------------------
// 1. Retention rates
// ---------------------------------------------------------------------------

/** Basic retention rate: retained / cohortSize. Returns 0 when cohortSize is 0. */
export function retentionRate(retained: number, cohortSize: number): number {
  return safeRatio(retained, cohortSize, 0);
}

/** Churn rate: churned / cohortSize. Returns 0 when cohortSize is 0. */
export function churnRate(churned: number, cohortSize: number): number {
  return safeRatio(churned, cohortSize, 0);
}

/**
 * N-day retention (classic): fraction of the cohort active *on* day N.
 * Returns 0 when cohortSize is 0.
 */
export function nDayRetention(activeOnDayN: number, cohortSize: number): number {
  return safeRatio(activeOnDayN, cohortSize, 0);
}

/**
 * Rolling retention: fraction of the cohort still active *on or after* day N.
 * Returns 0 when cohortSize is 0.
 */
export function rollingRetention(stillActiveAfterN: number, cohortSize: number): number {
  return safeRatio(stillActiveAfterN, cohortSize, 0);
}

/**
 * Bracketed (range/window) retention: fraction of the cohort active at any
 * point within a defined window. Returns 0 when cohortSize is 0.
 */
export function bracketedRetention(activeInWindow: number, cohortSize: number): number {
  return safeRatio(activeInWindow, cohortSize, 0);
}

// ---------------------------------------------------------------------------
// 2. Cohort curves
// ---------------------------------------------------------------------------

/**
 * Retention curve: each period's retained fraction relative to the cohort size.
 * Returns one fraction per supplied period. Empty input → empty array.
 */
export function retentionCurve(periodActives: number[], cohortSize: number): number[] {
  return periodActives.map((active) => safeRatio(active ?? 0, cohortSize, 0));
}

/**
 * Survival curve: cumulative survival fraction after subtracting churn period
 * by period. `churnByPeriod[i]` is the number who churned during period i.
 * Survival never goes below 0. Empty input → empty array.
 */
export function survivalCurve(churnByPeriod: number[], cohortSize: number): number[] {
  const out: number[] = [];
  let remaining = cohortSize;
  for (let i = 0; i < churnByPeriod.length; i++) {
    remaining -= churnByPeriod[i] ?? 0;
    if (remaining < 0) remaining = 0;
    out.push(safeRatio(remaining, cohortSize, 0));
  }
  return out;
}

/** Mean of a retention curve. Returns 0 for an empty curve. */
export function averageRetention(curve: number[]): number {
  if (curve.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < curve.length; i++) sum += curve[i] ?? 0;
  return sum / curve.length;
}

/**
 * Retention half-life: the first period index where retention is ≤ 0.5.
 * Returns -1 if the curve never drops to (or below) 0.5.
 */
export function retentionHalfLife(curve: number[]): number {
  for (let i = 0; i < curve.length; i++) {
    if ((curve[i] ?? 0) <= 0.5) return i;
  }
  return -1;
}

/**
 * Decay rate: average period-over-period proportional decline of the curve.
 * For consecutive values prev→curr (prev > 0), decline = (prev - curr) / prev.
 * Returns 0 when fewer than 2 points are supplied.
 */
export function decayRate(curve: number[]): number {
  if (curve.length < 2) return 0;
  let sum = 0;
  let steps = 0;
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1] ?? 0;
    const curr = curve[i] ?? 0;
    if (prev > 0) {
      sum += (prev - curr) / prev;
      steps++;
    }
  }
  return steps === 0 ? 0 : sum / steps;
}

// ---------------------------------------------------------------------------
// 3. Lifetime & value
// ---------------------------------------------------------------------------

/**
 * Average lifetime in days: area under a daily retention curve, computed via
 * the trapezoidal rule (each daily fraction contributes expected days alive).
 * For a curve of consecutive daily fractions, this is the sum of segment areas.
 * Returns 0 for an empty curve.
 */
export function averageLifetimeDays(retentionCurveDaily: number[]): number {
  if (retentionCurveDaily.length === 0) return 0;
  if (retentionCurveDaily.length === 1) return retentionCurveDaily[0] ?? 0;
  let area = 0;
  for (let i = 1; i < retentionCurveDaily.length; i++) {
    const a = retentionCurveDaily[i - 1] ?? 0;
    const b = retentionCurveDaily[i] ?? 0;
    area += (a + b) / 2;
  }
  return area;
}

/**
 * Expected customer lifetime (in periods) from a periodic churn rate: 1 / churn.
 * Returns Infinity when churnRate is 0 (no churn → infinite lifetime).
 */
export function customerLifetime(churnRate: number): number {
  if (churnRate === 0) return Infinity;
  return 1 / churnRate;
}

/**
 * LTV from a retention curve: sum over periods of retention × revenuePerPeriod.
 * Returns 0 for an empty curve.
 */
export function ltvFromRetention(curve: number[], revenuePerPeriod: number): number {
  let sum = 0;
  for (let i = 0; i < curve.length; i++) sum += (curve[i] ?? 0) * revenuePerPeriod;
  return sum;
}

/**
 * Expected remaining lifetime (in periods) given the current period index and a
 * memoryless churn rate. Under a geometric/exponential model the remaining
 * lifetime is constant (1 / churn) regardless of current period; we surface the
 * current period to allow callers to reason about elapsed vs remaining.
 * Returns Infinity when churnRate is 0.
 */
export function expectedRemainingLifetime(currentPeriod: number, churnRate: number): number {
  if (churnRate === 0) return Infinity;
  // Memoryless: remaining expectation is independent of elapsed periods.
  void currentPeriod;
  return 1 / churnRate;
}

// ---------------------------------------------------------------------------
// 4. Engagement-based
// ---------------------------------------------------------------------------

/** Stickiness: DAU / MAU. Returns 0 when MAU is 0. */
export function stickiness(dau: number, mau: number): number {
  return safeRatio(dau, mau, 0);
}

/** Engagement rate: activeUsers / totalUsers. Returns 0 when totalUsers is 0. */
export function engagementRate(activeUsers: number, totalUsers: number): number {
  return safeRatio(activeUsers, totalUsers, 0);
}

/** Power-user ratio: powerUsers / totalUsers. Returns 0 when totalUsers is 0. */
export function powerUserRatio(powerUsers: number, totalUsers: number): number {
  return safeRatio(powerUsers, totalUsers, 0);
}

/** Resurrection rate: resurrected / churned. Returns 0 when churned is 0. */
export function resurrectionRate(resurrected: number, churned: number): number {
  return safeRatio(resurrected, churned, 0);
}

/** Activation rate: activated / signups. Returns 0 when signups is 0. */
export function activationRate(activated: number, signups: number): number {
  return safeRatio(activated, signups, 0);
}

// ---------------------------------------------------------------------------
// 5. Cohort comparison
// ---------------------------------------------------------------------------

/**
 * Build a cohort → retention-curve map from raw cohort definitions.
 * Each curve is computed via {@link retentionCurve}. Cohort order is preserved.
 */
export function cohortRetentionMatrix(
  cohorts: { cohort: string; periodActives: number[]; size: number }[],
): Map<string, number[]> {
  const matrix = new Map<string, number[]>();
  for (let i = 0; i < cohorts.length; i++) {
    const c = cohorts[i];
    if (!c) continue;
    matrix.set(c.cohort, retentionCurve(c.periodActives, c.size));
  }
  return matrix;
}

/**
 * Identify the cohort with the highest retention at a given period index.
 * Returns null when the matrix is empty or no cohort has data at `atPeriod`.
 */
export function bestRetainingCohort(
  matrix: Map<string, number[]>,
  atPeriod: number,
): string | null {
  let best: string | null = null;
  let bestValue = -Infinity;
  for (const [cohort, curve] of matrix) {
    if (atPeriod < 0 || atPeriod >= curve.length) continue;
    const value = curve[atPeriod] ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = cohort;
    }
  }
  return best;
}

/**
 * Average period-over-period improvement (new − old) across overlapping
 * periods. Positive means the new cohort retains better. Returns 0 when there
 * is no overlap.
 */
export function retentionImprovement(oldCurve: number[], newCurve: number[]): number {
  const n = Math.min(oldCurve.length, newCurve.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (newCurve[i] ?? 0) - (oldCurve[i] ?? 0);
  return sum / n;
}

/**
 * Size-weighted average retention across cohorts.
 * Returns 0 when total weight (size) is 0.
 */
export function cohortSizeWeightedRetention(
  cohorts: { retention: number; size: number }[],
): number {
  let weighted = 0;
  let totalSize = 0;
  for (let i = 0; i < cohorts.length; i++) {
    const c = cohorts[i];
    if (!c) continue;
    weighted += c.retention * c.size;
    totalSize += c.size;
  }
  return safeRatio(weighted, totalSize, 0);
}

// ---------------------------------------------------------------------------
// 6. Predictive signals
// ---------------------------------------------------------------------------

/**
 * Churn-risk score in [0, 1] (higher = more risk).
 *
 * Combines three normalized signals:
 *  - recency stress: daysSinceActive relative to the user's avgSessionGapDays
 *    (≥ 2× the typical gap saturates to maximum stress);
 *  - inverse engagement: (1 − engagementScore), where engagementScore ∈ [0, 1].
 *
 * Weighting: 60% recency stress, 40% disengagement.
 */
export function churnRiskScore(
  daysSinceActive: number,
  avgSessionGapDays: number,
  engagementScore: number,
): number {
  const gap = avgSessionGapDays > 0 ? avgSessionGapDays : 1;
  // Ratio of 1 means "exactly on schedule"; 2+ means twice overdue → max stress.
  const overdueRatio = Math.max(0, daysSinceActive) / gap;
  const recencyStress = clamp((overdueRatio - 1) / 1, 0, 1);
  const disengagement = clamp(1 - engagementScore, 0, 1);
  const score = 0.6 * recencyStress + 0.4 * disengagement;
  return clamp(score, 0, 1);
}

/**
 * Predicted churn probability in [0, 1] from RFM-style recency/frequency.
 *
 * Recency decays exponentially with a configurable half-life (default 14 days):
 * a fresh user (recency 0) has full "freshness"; freshness halves every
 * `halfLifeDays`. Higher frequency dampens churn. The result is the probability
 * that the user has effectively lapsed.
 */
export function predictedChurnProbability(
  recencyDays: number,
  frequency: number,
  halfLifeDays = 14,
): number {
  const hl = halfLifeDays > 0 ? halfLifeDays : 14;
  const recency = Math.max(0, recencyDays);
  // Exponential decay: 1 at recency 0, → 0 as recency grows.
  const freshness = Math.pow(0.5, recency / hl);
  // Frequency saturates its protective effect (diminishing returns).
  const freq = Math.max(0, frequency);
  const frequencyFactor = freq / (freq + 1);
  // Alive-ness blends freshness with frequency protection.
  const aliveness = clamp(freshness + (1 - freshness) * frequencyFactor, 0, 1);
  return clamp(1 - aliveness, 0, 1);
}

/**
 * Composite health score in [0, 100] from three normalized [0, 1] inputs.
 * Weighting: retention 50%, engagement 30%, growth 20%.
 */
export function healthScore(retention: number, engagement: number, growth: number): number {
  const r = clamp(retention, 0, 1);
  const e = clamp(engagement, 0, 1);
  const g = clamp(growth, 0, 1);
  const composite = 0.5 * r + 0.3 * e + 0.2 * g;
  return clamp(composite * 100, 0, 100);
}

/** At-risk flag: true when churnRisk meets/exceeds the threshold (default 0.7). */
export function atRiskFlag(churnRisk: number, threshold = 0.7): boolean {
  return churnRisk >= threshold;
}

// ---------------------------------------------------------------------------
// 7. Aggregate metrics & DK-style ranking
// ---------------------------------------------------------------------------

/**
 * Quick Ratio: (new + resurrected) / churned. A growth-efficiency signal.
 * Returns Infinity when churned is 0 (growth with no churn).
 */
export function quickRatio(newUsers: number, resurrected: number, churned: number): number {
  if (churned === 0) return Infinity;
  return (newUsers + resurrected) / churned;
}

/**
 * Net Revenue Retention: (start + expansion − contraction − churn) / start.
 * Returns 0 when startRevenue is 0.
 */
export function netRetentionRate(
  startRevenue: number,
  expansion: number,
  contraction: number,
  churn: number,
): number {
  return safeRatio(startRevenue + expansion - contraction - churn, startRevenue, 0);
}

/**
 * Gross Revenue Retention: (start − contraction − churn) / start.
 * Capped at 1 (gross retention cannot exceed the starting base).
 * Returns 0 when startRevenue is 0.
 */
export function grossRetentionRate(
  startRevenue: number,
  contraction: number,
  churn: number,
): number {
  const ratio = safeRatio(startRevenue - contraction - churn, startRevenue, 0);
  return Math.min(ratio, 1);
}

/**
 * Magic Number (sales efficiency): netNewARR / priorQuarterSAndM.
 * Returns 0 when the prior-quarter S&M denominator is 0.
 */
export function magicNumber(netNewARR: number, priorQuarterSAndM: number): number {
  return safeRatio(netNewARR, priorQuarterSAndM, 0);
}
