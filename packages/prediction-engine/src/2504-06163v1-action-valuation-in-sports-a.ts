/**
 * arXiv:2504.06163v1 — Action Valuation in Sports: A Survey
 *
 * Expected route value (ERV) for off-ball receiver valuation: a completion-probability surface over the
 * field, the route valued as the integral of (ERV at actual position − ERV at league-average route), summed
 * to a per-player off-ball contribution.
 *
 * Improvement: Build an expected route value (ERV) model from NGS tracking for off-ball receiver valuation: predict the completion-probability surface over the field given play state, value the actual route as ∫(ERV at actual position − ERV at league-average route) over the play, and sum to a per-player off-ball contribution — the football instantiation of the survey's multi-agent credit-assignment problem that no surveyed paper does for American football.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the survey's recommendations into GSE's methods docs only if test (a) shows any alternative horizon beats the drive-level baseline by ≥0.005 AUC on the 2024–2025 out-of-sample window; otherwise record the taxonomy as a reference and REJECT immediate pipeline changes.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Completion-probability surface: logistic over field position + separation. */
export function completionSurface(
  x: number, // yards from own goal
  y: number, // yards from sideline (0..53.3)
  separation: number, // yards of separation at the catch point
  beta: readonly [number, number, number, number], // [b0, bx, by, bsep]
): number {
  return logistic(beta[0]! + beta[1]! * x + beta[2]! * (y - 26.65) + beta[3]! * separation);
}

/** Expected route value at one field point (completion prob * play value). */
export function ervAt(
  x: number,
  y: number,
  separation: number,
  beta: readonly [number, number, number, number],
  playValue: number, // EPA-ish value of the play design
): number {
  return completionSurface(x, y, separation, beta) * playValue;
}

/**
 * Route value: mean over sampled route points of
 * (ERV(actual) − ERV(league-average route)).
 */
export function routeValue(
  actual: readonly { x: number; y: number; sep: number }[],
  leagueAvg: readonly { x: number; y: number; sep: number }[],
  beta: readonly [number, number, number, number],
  playValue: number,
): number {
  if (actual.length === 0 || leagueAvg.length === 0) throw new Error("routeValue: empty route");
  const avg = (pts: readonly { x: number; y: number; sep: number }[]): number =>
    pts.reduce((s, p) => s + ervAt(p.x, p.y, p.sep, beta, playValue), 0) / pts.length;
  return avg(actual) - avg(leagueAvg);
}

/** Per-player off-ball contribution: sum of route values over plays. */
export function offBallContribution(
  routes: readonly { actual: { x: number; y: number; sep: number }[]; leagueAvg: { x: number; y: number; sep: number }[] }[],
  beta: readonly [number, number, number, number],
  playValue: number,
): number {
  return routes.reduce((s, r) => s + routeValue(r.actual, r.leagueAvg, beta, playValue), 0);
}
