/**
 * arXiv:2604.13861v2 — Simulation-Based Optimisation of Batting Order and Bowling Plans in T20 Cricket
 *
 * Simulation-optimization for NFL 4th-down / 2-point / timeout decisions: James-Stein-shrunk situation
 * profiles over the (score, time, down, distance, field, timeouts) state, Brier-scored against raw MLE,
 * with a 200-play audit agreement check vs a benchmark.
 *
 * Improvement: Port the simulation-optimization framework to an NFL WP-optimal 4th-down / 2-point / timeout decision engine (state = score, time, down, distance, field position, timeouts; James-Stein-shrunk situation profiles from nflverse) plus a weekly coach-decision audit content product quantifying each week's most costly decisions in WP points.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the framework if the NFL port's James–Stein-shrunk situation profiles beat raw MLE on held-out 2026 drives with ≥5% lower Brier score AND a 200-play audit sample shows ≥80% agreement between the engine's 4th-down recommendations and a published benchmark.
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/**
 * James-Stein shrinkage of situation means toward the grand mean.
 * means: raw MLE per situation; ses: standard errors; returns shrunk means.
 */
export function jamesSteinShrink(means: readonly number[], ses: readonly number[]): number[] {
  if (means.length !== ses.length || means.length < 3) {
    throw new Error("jamesSteinShrink: need >= 3 situations");
  }
  const p = means.length;
  const grand = mean(means);
  const s2 = mean(ses.map((s) => s * s));
  const ss = means.reduce((t, m) => t + (m - grand) ** 2, 0);
  const shrink = ss === 0 ? 0 : Math.max(0, 1 - ((p - 2) * s2) / ss);
  return means.map((m) => grand + shrink * (m - grand));
}

/** Brier score for probabilistic forecasts. */
export function brierScore(probs: readonly number[], outcomes: readonly (0 | 1)[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("brierScore: length mismatch or empty");
  }
  return mean(probs.map((p, i) => (p - (outcomes[i] ?? 0)) ** 2));
}

/** Audit agreement: fraction of plays where engine and benchmark agree. */
export function auditAgreement(
  engine: readonly string[],
  benchmark: readonly string[],
): number {
  if (engine.length !== benchmark.length || engine.length === 0) {
    throw new Error("auditAgreement: length mismatch or empty");
  }
  const agree = engine.filter((e, i) => e === benchmark[i]).length;
  return agree / engine.length;
}

/** Decision EV under a shrunk situation profile: max over actions. */
export function decisionEV(actionEVs: ReadonlyMap<string, number>): { action: string; ev: number } {
  if (actionEVs.size === 0) throw new Error("decisionEV: no actions");
  let best = "";
  let bestV = -Infinity;
  for (const [a, v] of actionEVs) {
    if (v > bestV) { bestV = v; best = a; }
  }
  return { action: best, ev: bestV };
}
