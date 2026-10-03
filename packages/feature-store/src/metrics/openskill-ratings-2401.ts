/**
 * OpenSkill (Plackett-Luce) NFL team-rating backend
 *
 * Research port: arXiv:2401.05451
 * Normalized lane: props_dfs | Doctrine: PROPRIETARY_EDGE
 *
 * Prototype OpenSkill backend for NFL team ratings: weekly mu/sigma updates on the Plackett-Luce model, benchmarked against the house Elo on backtest log-loss. Pure rating math; the score-weighted extension point is stubbed as a configured hook.
 *
 * ACCEPTANCE GATE: ADOPT as the production rating engine only if it matches house Elo within 0.002 log-loss on the 2020-2024 walk-forward AND the full 2000-2025 weekly run completes. Live-data gate -> GSE_OPENSKILL_ENABLED flag (default false).
 */

export interface OpenSkillRating {
  mu: number;
  sigma: number;
}

export const OPENSKILL_DEFAULT_MU = 25;
export const OPENSKILL_DEFAULT_SIGMA = 25 / 3;
export const OPENSKILL_BETA = 25 / 6;

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/** 1v1 Plackett-Luce update. ranks: 1 = winner. Returns updated [a, b]. */
export function updateDuel(
  a: OpenSkillRating,
  b: OpenSkillRating,
  rankA: 1 | 2,
  beta: number = OPENSKILL_BETA,
): [OpenSkillRating, OpenSkillRating] {
  const c = Math.sqrt(2 * beta * beta + a.sigma * a.sigma + b.sigma * b.sigma);
  const t = (a.mu - b.mu) / c;
  const eps = rankA === 1 ? normPdf(t) / Math.max(1e-12, normCdf(t)) : -normPdf(t) / Math.max(1e-12, normCdf(-t));
  const aSigmaSq = a.sigma * a.sigma;
  const bSigmaSq = b.sigma * b.sigma;
  const v = (aSigmaSq + bSigmaSq) / (c * c);
  const w = v * (1 - v);
  const aMu = a.mu + (aSigmaSq / c) * eps;
  const bMu = b.mu - (bSigmaSq / c) * eps;
  const aSigma = a.sigma * Math.sqrt(Math.max(0.01, 1 - (aSigmaSq / (c * c)) * w));
  const bSigma = b.sigma * Math.sqrt(Math.max(0.01, 1 - (bSigmaSq / (c * c)) * w));
  return [
    { mu: aMu, sigma: aSigma },
    { mu: bMu, sigma: bSigma },
  ];
}

/** Score-weighted extension hook: maps a margin to a fractional rank (paper's beyond-paper step). */
export function marginToRankWeight(margin: number, cap = 28): number {
  const m = Math.min(cap, Math.abs(margin));
  return 0.5 + 0.5 * (m / cap);
}

/** Implied win probability for log-loss benchmarking vs house Elo. */
export function winProb(a: OpenSkillRating, b: OpenSkillRating, beta: number = OPENSKILL_BETA): number {
  return normCdf((a.mu - b.mu) / Math.sqrt(2 * beta * beta + a.sigma * a.sigma + b.sigma * b.sigma));
}

/** Live-data gate: within 0.002 log-loss of house Elo on 2020-2024 walk-forward. */
export const GSE_OPENSKILL_ENABLED = false;

