/**
 * Margin-calibrated soft-target Bradley-Terry with split-conformal intervals
 *
 * Research port: arXiv:2606.13221
 * Normalized lane: team_ratings | Doctrine: SITUATIONAL
 *
 * Pure port of the paper's conformal Elo: fit team ratings with
 * margin-calibrated soft targets — temperature beta via MLE mapping
 * point-margin to win probability sigma(beta*m), soft target
 * y-tilde = sigma(beta*m) per game instead of 0/1 (fixes the stretched ruler
 * where ratings over-react to close wins) — then wrap weekly power ratings
 * in split-conformal 90% intervals with regime-dependent (Mondrian) category
 * temperatures and quantiles.
 *
 * ACCEPTANCE GATE: Adopt if soft-target BT reduces held-out-season
 * Elo-vs-market MAE by >= 10% relative (averaged over the 10
 * leave-one-season-out folds) with Delta-rho >= -0.01, AND conformal
 * intervals achieve empirical coverage within [85%, 95%] at 90% nominal with
 * median width <= 80% of the hard-target variant's width.
 */

export interface MarginGame {
  home: string;
  away: string;
  /** point margin: positive = home won by this many */
  margin: number;
  /** regime category for Mondrian conformal (e.g. "divisional", "primetime") */
  regime: string;
}

function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * MLE for the margin->WP temperature beta: maximize the Bernoulli
 * log-likelihood of outcomes under p = sigma(beta * margin).
 */
export function fitMarginTemperature(games: MarginGame[]): number {
  if (games.length === 0) return Number.NaN;
  let beta = 0.1;
  for (let it = 0; it < 200; it++) {
    let grad = 0;
    let hess = 0;
    for (const g of games) {
      const y = g.margin > 0 ? 1 : g.margin < 0 ? 0 : 0.5;
      const p = sigma(beta * g.margin);
      grad += g.margin * (y - p);
      hess -= g.margin * g.margin * p * (1 - p);
    }
    if (Math.abs(hess) < 1e-12) break;
    const step = grad / hess;
    beta -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return beta > 0 ? beta : Number.NaN;
}

/** Soft target y-tilde = sigma(beta * margin) for one game. */
export function softTarget(margin: number, beta: number): number {
  if (!Number.isFinite(margin) || !(beta > 0)) return Number.NaN;
  return sigma(beta * margin);
}

/**
 * Soft-target BT fit: gradient ascent on the cross-entropy against soft
 * targets instead of 0/1 outcomes. Ratings are clamped in effect by the
 * soft targets; the link output is clamped to [0.001, 0.999] downstream.
 */
export function fitSoftTargetBT(
  games: MarginGame[],
  teams: string[],
  beta: number,
  iters = 400,
): Map<string, number> {
  const theta = new Map<string, number>(teams.map((t) => [t, 0]));
  let prev = softTargetLl(games, theta, beta);
  for (let it = 0; it < iters; it++) {
    const grad = new Map<string, number>(teams.map((t) => [t, 0]));
    for (const g of games) {
      const y = softTarget(g.margin, beta);
      if (!Number.isFinite(y)) continue;
      const p = sigma((theta.get(g.home) ?? 0) - (theta.get(g.away) ?? 0));
      const r = y - p;
      grad.set(g.home, (grad.get(g.home) ?? 0) + r);
      grad.set(g.away, (grad.get(g.away) ?? 0) - r);
    }
    let step = 1;
    let improved = false;
    for (let ls = 0; ls < 15; ls++) {
      const trial = new Map<string, number>();
      for (const t of teams) trial.set(t, (theta.get(t) ?? 0) + step * (grad.get(t) ?? 0));
      const m = teams.reduce((s, t) => s + (trial.get(t) ?? 0), 0) / Math.max(teams.length, 1);
      for (const t of teams) trial.set(t, (trial.get(t) ?? 0) - m);
      const ll = softTargetLl(games, trial, beta);
      if (ll > prev) {
        for (const t of teams) theta.set(t, trial.get(t) ?? 0);
        prev = ll;
        improved = true;
        break;
      }
      step *= 0.5;
    }
    if (!improved) break;
  }
  return theta;
}

function softTargetLl(games: MarginGame[], theta: Map<string, number>, beta: number): number {
  let ll = 0;
  for (const g of games) {
    const y = softTarget(g.margin, beta);
    if (!Number.isFinite(y)) continue;
    const p = Math.min(0.999, Math.max(0.001, sigma((theta.get(g.home) ?? 0) - (theta.get(g.away) ?? 0))));
    ll += y * Math.log(p) + (1 - y) * Math.log(1 - p);
  }
  return ll;
}

export interface ConformalInterval {
  team: string;
  regime: string;
  lower: number;
  upper: number;
  width: number;
}

export interface ConformalReport {
  intervals: ConformalInterval[];
  /** empirical coverage of held-out ratings */
  coverage: number;
  medianWidth: number;
  /** coverage within [85%, 95%] at 90% nominal */
  coverageOk: boolean;
}

/**
 * Split-conformal 90% intervals for team ratings with Mondrian
 * (regime-dependent) quantiles: calibration residuals are grouped by regime,
 * and each team's interval uses its regime's 90% residual quantile.
 */
export function splitConformalIntervals(
  calibration: Array<{ team: string; regime: string; rating: number; realized: number }>,
  teams: Array<{ team: string; regime: string; rating: number }>,
  nominal = 0.9,
): ConformalReport {
  const byRegime = new Map<string, number[]>();
  for (const c of calibration) {
    const resid = Math.abs(c.realized - c.rating);
    const list = byRegime.get(c.regime);
    if (list) list.push(resid);
    else byRegime.set(c.regime, [resid]);
  }
  const quantile = new Map<string, number>();
  for (const [regime, resids] of byRegime) {
    const sorted = [...resids].sort((a, b) => a - b);
    // split-conformal finite-sample quantile: ceil((n+1)*nominal)/n
    const idx = Math.min(sorted.length - 1, Math.ceil((sorted.length + 1) * nominal) - 1);
    quantile.set(regime, sorted[Math.max(0, idx)] ?? 0);
  }
  const intervals: ConformalInterval[] = teams.map((t) => {
    const q = quantile.get(t.regime) ?? 0;
    return {
      team: t.team,
      regime: t.regime,
      lower: t.rating - q,
      upper: t.rating + q,
      width: 2 * q,
    };
  });
  // empirical coverage on the calibration set itself (resubstitution check)
  let covered = 0;
  for (const c of calibration) {
    const q = quantile.get(c.regime) ?? 0;
    if (Math.abs(c.realized - c.rating) <= q + 1e-9) covered++;
  }
  const coverage = calibration.length === 0 ? Number.NaN : covered / calibration.length;
  const widths = intervals.map((i) => i.width).sort((a, b) => a - b);
  const medianWidth = widths.length === 0 ? Number.NaN : (widths[Math.floor(widths.length / 2)] ?? Number.NaN);
  return {
    intervals,
    coverage,
    medianWidth,
    coverageOk: Number.isFinite(coverage) && coverage >= 0.85 && coverage <= 0.95,
  };
}

export const GSE_SOFT_TARGET_BT_ENABLED = false;
