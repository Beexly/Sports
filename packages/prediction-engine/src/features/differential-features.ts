/**
 * Differential features + LOO leakage audit (arXiv 2303.16776v1).
 *
 * Port the pattern, not the sport — NFL analogs of the engineered
 * features: pass-vs-run EPA differential (offense balance),
 * short-vs-long down EPA differential, home/road split differentials,
 * early-vs-late-down efficiency gaps, and a BALANCE metric (mean of
 * absolute differentials) as a team "well-roundedness" feature — plus
 * the RANKDIFF non-linearity (saturation applied to rating-difference
 * features) and the anti-overfit protocol: for every matchup-level
 * feature, compute it from rolling aggregates EXCLUDING the target
 * game (leave-one-game-out) and verify accuracy parity — a cheap
 * leakage audit for the props/engine pipeline.
 *
 * ACCEPTANCE GATE: adopt iff (a) BALANCE-style features rank in the
 * top half of RF Gini importance on NFL data, and (b) LOO-aggregated
 * features lose <= 5 pp of accuracy vs leaky features.
 *
 * Research-only module. Not wired into any live feature path.
 */

/** A paired aggregate (e.g. pass EPA vs run EPA) for one team-game. */
export interface PairedAggregate {
  a: number;
  b: number;
}

/** Differential features from paired aggregates: a - b per pair. */
export function differentials(
  pairs: Readonly<Record<string, PairedAggregate>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, { a, b }] of Object.entries(pairs)) {
    out[`${name}_diff`] = a - b;
  }
  return out;
}

/**
 * BALANCE metric: mean of absolute differentials — a team
 * "well-roundedness" feature (low = balanced across dimensions).
 */
export function balanceMetric(diffs: Readonly<Record<string, number>>): number {
  const vals = Object.values(diffs);
  if (vals.length === 0) throw new Error("balanceMetric: no differentials");
  return vals.reduce((s, x) => s + Math.abs(x), 0) / vals.length;
}

/**
 * RANKDIFF non-linearity: saturating transform of a rating difference
 * (diminishing returns to large gaps), tanh-scaled.
 */
export function rankdiffSaturation(ratingDiff: number, scale = 10): number {
  if (scale <= 0) throw new Error("rankdiffSaturation: scale > 0");
  return Math.tanh(ratingDiff / scale);
}

/**
 * Leave-one-game-out rolling aggregate: mean of values excluding the
 * target game index. The anti-overfit protocol: every matchup-level
 * feature must be computable this way.
 */
export function looAggregate(values: readonly number[], excludeIdx: number): number {
  if (values.length < 2) throw new Error("looAggregate: need >= 2 games");
  if (excludeIdx < 0 || excludeIdx >= values.length) {
    throw new Error("looAggregate: excludeIdx out of range");
  }
  const sum = values.reduce((s, x) => s + x, 0);
  return (sum - (values[excludeIdx] as number)) / (values.length - 1);
}

/**
 * Leakage audit: compare a classifier's accuracy with leaky features
 * (target game included) vs LOO features. Returns the accuracy drop;
 * gate (b) requires drop <= 0.05 — a larger drop means the pipeline
 * was leaking target-game data.
 */
export function leakageAudit(
  leakyCorrect: number,
  leakyTotal: number,
  looCorrect: number,
  looTotal: number,
): { leakyAcc: number; looAcc: number; dropPp: number; pass: boolean } {
  if (leakyTotal <= 0 || looTotal <= 0) throw new Error("leakageAudit: totals > 0");
  const leakyAcc = leakyCorrect / leakyTotal;
  const looAcc = looCorrect / looTotal;
  const dropPp = (leakyAcc - looAcc) * 100;
  return { leakyAcc, looAcc, dropPp, pass: dropPp <= 5 };
}
