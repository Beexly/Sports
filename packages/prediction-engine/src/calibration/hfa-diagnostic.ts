/**
 * Nonparametric home-advantage diagnostic.
 *
 * Using 2010–2025 NFL games: Nadaraya–Watson estimates of P(home win |
 * spread-differential or Elo-differential) with conditional Wilson 95%
 * bands, overlaid against the engine's parametric (logistic) mapping — where
 * the nonparametric curve exits the parametric band, the link function is
 * misspecified and gets recalibrated locally. Plus a situational HFA
 * decomposition (rest differential, altitude/dome, division rivalry) via
 * additive NW smoothing as a data-driven alternative to fixed HFA constants.
 *
 * @see arXiv:1701.07555 — "Robust Analysis of Second-Leg Home Advantage in UEFA Football Through Better Nonparametric Confidence Intervals for Binary Regression Functions"
 *
 * ACCEPTANCE GATE: adopt the nonparametric HFA correction iff it improves
 * Brier score on 2023–2024 home-win probabilities by ≥ 0.002 AND the Wilson
 * bands reveal ≥ 1 spread region where the parametric mapping is
 * significantly miscalibrated (band excludes the parametric curve). The gate
 * is a backtest concern; this module is the pure diagnostic kernel, not
 * wired into any live path.
 */

export interface GameOutcome {
  /** Spread/Elo differential (home perspective; negative = home underdog). */
  x: number;
  /** 1 = home win. */
  homeWin: 0 | 1;
}

/** Gaussian kernel. */
function kernel(u: number): number {
  return Math.exp(-0.5 * u * u);
}

/**
 * Nadaraya–Watson estimate of P(home win | x) with a Gaussian kernel.
 */
export function nadarayaWatson(
  games: readonly GameOutcome[],
  x: number,
  bandwidth: number,
): { p: number; nEff: number } {
  if (!(bandwidth > 0)) throw new Error("nadarayaWatson: bandwidth > 0");
  let num = 0;
  let den = 0;
  for (const g of games) {
    const w = kernel((x - g.x) / bandwidth);
    num += w * g.homeWin;
    den += w;
  }
  if (den <= 0) return { p: 0.5, nEff: 0 };
  return { p: num / den, nEff: den };
}

/**
 * Wilson 95% score interval for a binomial proportion (conditional on the
 * NW effective sample size).
 */
export function wilsonInterval(
  p: number,
  nEff: number,
  z = 1.96,
): { lo: number; hi: number } {
  if (!(nEff > 0)) return { lo: 0, hi: 1 };
  const den = 1 + (z * z) / nEff;
  const center = (p + (z * z) / (2 * nEff)) / den;
  const half = (z * Math.sqrt(p * (1 - p) / nEff + (z * z) / (4 * nEff * nEff))) / den;
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

/**
 * Misspecification scan: over a grid of x, flag regions where the parametric
 * (logistic) mapping falls outside the NW Wilson band — those regions need
 * local recalibration.
 */
export function findMisspecifiedRegions(
  games: readonly GameOutcome[],
  parametric: (x: number) => number,
  grid: readonly number[],
  bandwidth: number,
): Array<{ x: number; nw: number; lo: number; hi: number; param: number }> {
  const out: Array<{ x: number; nw: number; lo: number; hi: number; param: number }> = [];
  for (const x of grid) {
    const { p, nEff } = nadarayaWatson(games, x, bandwidth);
    const { lo, hi } = wilsonInterval(p, nEff);
    const param = parametric(x);
    if (param < lo || param > hi) out.push({ x, nw: p, lo, hi, param });
  }
  return out;
}

/**
 * Additive situational HFA decomposition: mean home-win residual after the
 * parametric mapping, split by binary situational flags (rest edge,
 * altitude/dome, division rivalry). Positive = extra HFA beyond the spread.
 */
export function situationalHfa(
  games: readonly GameOutcome[],
  parametric: (x: number) => number,
  flags: Readonly<Record<string, (g: GameOutcome) => boolean>>,
): Record<string, { games: number; extraHfa: number }> {
  const out: Record<string, { games: number; extraHfa: number }> = {};
  for (const [name, test] of Object.entries(flags)) {
    let n = 0;
    let resid = 0;
    for (const g of games) {
      if (!test(g)) continue;
      n++;
      resid += g.homeWin - parametric(g.x);
    }
    out[name] = { games: n, extraHfa: n > 0 ? resid / n : 0 };
  }
  return out;
}
