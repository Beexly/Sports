/**
 * G-score: variance-aware fantasy valuation (arXiv 2307.02188v5).
 *
 * For every fantasy-relevant player: weekly fantasy-point mean mu(q)
 * and week-to-week SD tau(q) from 3-season rolling game logs,
 * cross-player sigma by position; G-value =
 * (mu(q) - replacement_level) / sqrt(sigma^2 + kappa*tau^2), kappa
 * re-estimated per position/scoring format — never the paper's
 * kappa=1.04 constant ported blindly.
 *
 * Use cases: DFS value tiers (G per $1k salary), season-long draft
 * rankings, GPP lineup construction — with contest-dependent kappa:
 * fit kappa separately for cash games (expect kappa > 0, variance
 * penalized) vs GPPs (expect kappa < 0, variance rewarded).
 *
 * ACCEPTANCE GATE: ADAPT iff the backtest passes (G >= 12% win rate,
 * beats Z by >= 5 pp) on actual historical weekly scores; REJECT the
 * kappa=1.04 constant; if estimated kappa ~= 0 the method reduces to
 * Z-score and adds nothing.
 *
 * Research-only module. Not wired into any live valuation path.
 */

export interface PlayerLog {
  player: string;
  position: string;
  /** Weekly fantasy points (3-season rolling). */
  weekly: number[];
  /** DFS salary. */
  salary: number;
}

/** Weekly mean and week-to-week SD from a game log. */
export function playerMoments(weekly: readonly number[]): { mu: number; tau: number } {
  if (weekly.length < 2) throw new Error("playerMoments: need >= 2 weeks");
  const mu = weekly.reduce((s, x) => s + x, 0) / weekly.length;
  const tau = Math.sqrt(
    weekly.reduce((s, x) => s + (x - mu) ** 2, 0) / (weekly.length - 1),
  );
  return { mu, tau };
}

/** Cross-player SD of weekly means within a position group. */
export function positionSigma(mus: readonly number[]): number {
  if (mus.length < 2) throw new Error("positionSigma: need >= 2 players");
  const mean = mus.reduce((s, x) => s + x, 0) / mus.length;
  return Math.sqrt(mus.reduce((s, x) => s + (x - mean) ** 2, 0) / (mus.length - 1));
}

export interface GScoreInputs {
  mu: number;
  tau: number;
  sigma: number; // position cross-player sigma
  replacement: number; // replacement level for the position
  kappa: number;
}

/**
 * G-value = (mu - replacement) / sqrt(sigma^2 + kappa*tau^2).
 * kappa > 0 penalizes variance (cash); kappa < 0 rewards it (GPP).
 */
export function gValue(g: GScoreInputs): number {
  const denom = Math.sqrt(
    Math.max(1e-12, g.sigma ** 2 + g.kappa * g.tau ** 2),
  );
  return (g.mu - g.replacement) / denom;
}

/** Z-score: the kappa = 0 reduction of G. */
export function zValue(mu: number, replacement: number, sigma: number): number {
  if (sigma <= 0) throw new Error("zValue: sigma > 0");
  return (mu - replacement) / sigma;
}

/**
 * Fit kappa per position/contest on historical weeks: grid-search the
 * kappa maximizing a list-level backtest objective over the G-values
 * (e.g. the realized points of the top-G player). Returns 0 when
 * variance adds nothing.
 */
export function fitKappa(
  players: ReadonlyArray<{ mu: number; tau: number; sigma: number; replacement: number; realized: number }>,
  objective: (g: readonly number[], realized: readonly number[]) => number,
  kappas: readonly number[] = [-1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2],
): { kappa: number; objective: number } {
  if (players.length === 0) throw new Error("fitKappa: no players");
  let best = { kappa: 0, objective: -Infinity };
  for (const kappa of kappas) {
    const gs = players.map((p) => gValue({ ...p, kappa }));
    const rs = players.map((p) => p.realized);
    const obj = objective(gs, rs);
    if (obj > best.objective) best = { kappa, objective: obj };
  }
  return best;
}

/** Backtest objective: realized points of the top-G player. */
export function topGRealized(g: readonly number[], realized: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < g.length; i++) {
    if ((g[i] as number) > (g[best] as number)) best = i;
  }
  return realized[best] as number;
}

/** DFS value tiers: G per $1k salary. */
export function gPerDollar(
  players: ReadonlyArray<PlayerLog & { kappa: number; sigma: number; replacement: number }>,
): Array<{ player: string; gPer1k: number }> {
  return players
    .map((p) => {
      const { mu, tau } = playerMoments(p.weekly);
      const g = gValue({ mu, tau, sigma: p.sigma, replacement: p.replacement, kappa: p.kappa });
      return { player: p.player, gPer1k: (g / Math.max(1, p.salary)) * 1000 };
    })
    .sort((a, b) => b.gPer1k - a.gPer1k);
}
