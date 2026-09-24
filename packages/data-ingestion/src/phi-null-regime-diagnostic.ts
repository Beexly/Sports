/**
 * 0003 Luck is Hard to Beat: The Difficulty of Sports Prediction (arXiv:1706.02447v1)
 *
 * arXiv:1706.02447v1 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port the phi null to the NFL as an engine regime diagnostic, not the NBA model: for each NFL
 * season 2002-2025 (nflverse schedules + scores), compute s^2 (variance of win totals / point
 * differentials), Monte Carlo the season 10,000x using the actual schedule with outcomes drawn
 * from observed home/away/tie rates; report phi per season with the 95% null interval -- use phi
 * as an engine diagnostic: in low-phi seasons the engine's error floor (irreducible luck) is
 * higher and Kelly stakes should shrink; in high-phi seasons the signal-to-noise justifies more
 * aggression. This quantifies how hard sports prediction is for each season.
 *
 * ACCEPTANCE GATE: ADAPT the phi null as a GSE regime diagnostic if: (a) the nflverse pipeline reproduces the
 * paper's qualitative behavior -- median NFL phi in (0.3, 0.95) with < 10% of seasons falling
 * outside (-0.5, 1.0) -- and (b) season-ahead engine log-loss correlates positively with (1 - phi)
 * across 2010-2025 seasons (Spearman rho > 0.3, p < 0.10).
 *
 * Ingest role: feature builder (season luck-quotient diagnostic -> Kelly stake sizing regime).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1706.02447v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the phi null as a GSE regime diagnostic if: (a) the nflverse pipeline reproduces the
 * paper's qualitative behavior -- median NFL phi in (0.3, 0.95) with < 10% of seasons falling
 * outside (-0.5, 1.0) -- and (b) season-ahead engine log-loss correlates positively with (1 - phi)
 * across 2010-2025 seasons (Spearman rho > 0.3, p < 0.10).`;

export const CONFIG = {
  enabled: false,
  mcDraws: 10000,
  seasons: [2002, 2025],
  spearmanThreshold: 0.3,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Phi null (paper's luck quotient): compares observed variance of win totals
 * to the null (coin-flip-ish, from observed home/away/tie rates) and perfect
 * (deterministic) benchmarks. phi in (0,1): 0 = pure luck, 1 = pure skill.
 */
export function seasonPhi(
  winTotals: readonly number[],
  nullVar: number,
  perfectVar: number,
): number | null {
  if (winTotals.length < 2) return null;
  if (![nullVar, perfectVar].every(isFiniteNumber) || perfectVar <= nullVar) return null;
  if (!winTotals.every(isFiniteNumber)) return null;
  const m = winTotals.reduce((a, b) => a + b, 0) / winTotals.length;
  const s2 = winTotals.reduce((a, w) => a + (w - m) * (w - m), 0) / winTotals.length;
  return (s2 - nullVar) / (perfectVar - nullVar);
}

/** Null variance of win totals under independent Bernoulli(home/away rates). */
export function nullWinVariance(nGames: number, pHome: number, pAway: number): number | null {
  if (![nGames, pHome, pAway].every(isFiniteNumber)) return null;
  if (nGames <= 0 || pHome < 0 || pHome > 1 || pAway < 0 || pAway > 1) return null;
  const p = (pHome + pAway) / 2;
  return nGames * p * (1 - p);
}

/** Perfect-predictability variance: every game deterministic at p in {0,1}. */
export function perfectWinVariance(nGames: number): number | null {
  if (!isFiniteNumber(nGames) || nGames <= 0) return null;
  return (nGames * nGames) / 4;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monte Carlo the season's null: 95% interval for phi under the null. */
export function nullPhiInterval(
  nTeams: number,
  nGames: number,
  pHome: number,
  pAway: number,
  draws = 1000,
  seed = 7,
): [number, number] | null {
  if (![nTeams, nGames, pHome, pAway].every(isFiniteNumber)) return null;
  if (nTeams < 2 || nGames <= 0 || draws < 100) return null;
  const rng = mulberry32(seed);
  const nullVar = nullWinVariance(nGames, pHome, pAway);
  const perfectVar = perfectWinVariance(nGames);
  if (nullVar === null || perfectVar === null) return null;
  const phis: number[] = [];
  for (let d = 0; d < draws; d++) {
    const wins: number[] = [];
    for (let t = 0; t < nTeams; t++) {
      let w = 0;
      for (let g = 0; g < nGames; g++) if (rng() < (pHome + pAway) / 2) w++;
      wins.push(w);
    }
    const phi = seasonPhi(wins, nullVar, perfectVar);
    if (phi !== null) phis.push(phi);
  }
  phis.sort((a, b) => a - b);
  const lo = phis[Math.floor(0.025 * phis.length)] ?? 0;
  const hi = phis[Math.floor(0.975 * phis.length)] ?? 0;
  return [lo, hi];
}

/** Regime diagnostic: Kelly stake multiplier from phi (low phi -> shrink stakes). */
export function kellyStakeMultiplier(phi: number): number | null {
  if (!isFiniteNumber(phi)) return null;
  return Math.max(0, Math.min(1, phi));
}
