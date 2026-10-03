/**
 * Bradley-Terry strengths via the Hunter MM algorithm, with home field.
 *
 * Model: P(i beats j at home for i) = (psi_i * h) / (psi_i * h + psi_j),
 * where h > 0 is the home multiplier. Strengths are fit by the MM iteration
 * (Hunter 2004): psi_i <- W_i / sum_j n_ij / (psi_i + psi_j), which is
 * monotone in likelihood and needs no derivatives. The exported covariate is
 * omega = (psi_home - psi_away) / MAD (median absolute deviation), the
 * MAD-normalized strength differential for downstream regressions.
 *
 * Pure TypeScript, no I/O. (A Stan/PyMC hierarchical fit is the production
 * upgrade; this is the portable small core.)
 *
 * Reference: arXiv:2405.10247 — Bayesian Bradley-Terry-Davidson strength
 * covariate (paired-comparison ratings).
 *
 * ACCEPTANCE GATE: adding omega_n reduces moneyline Brier by >= 0.002
 * (paired, by week) without worsening spread-cover Brier.
 */

export interface BtGame {
  readonly home: string;
  readonly away: string;
  /** 1 if home won, 0 if away won (no draws in NFL). */
  readonly homeWin: number;
}

export interface BtFit {
  /** Strength per team (positive, mean-normalized to 1). */
  readonly strengths: Record<string, number>;
  /** Home multiplier h. */
  readonly homeEdge: number;
}

/**
 * Fit Bradley-Terry strengths with a fixed home multiplier via MM.
 * @param games game outcomes; @param homeEdge home multiplier (default 1.15).
 */
export function fitBradleyTerry(games: readonly BtGame[], homeEdge = 1.15, iters = 500): BtFit {
  if (games.length === 0) throw new Error("bradley-terry: need >= 1 game");
  if (!(homeEdge > 0)) throw new Error("bradley-terry: homeEdge must be > 0");
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))];
  const psi = new Map<string, number>(teams.map((t) => [t, 1]));
  for (let it = 0; it < iters; it++) {
    // Pseudocount smoothing (0.5/0.5 vs a league-average team): keeps winless
    // or undefeated teams at small positive strength instead of 0/Infinity.
    const wins = new Map<string, number>(teams.map((t) => [t, 0.5]));
    const denom = new Map<string, number>(teams.map((t) => [t, 0.5]));
    for (const g of games) {
      if (g.homeWin !== 0 && g.homeWin !== 1) throw new Error("bradley-terry: homeWin must be 0/1");
      const ph = (psi.get(g.home) ?? 1) * homeEdge;
      const pa = psi.get(g.away) ?? 1;
      wins.set(g.home, (wins.get(g.home) ?? 0) + g.homeWin);
      wins.set(g.away, (wins.get(g.away) ?? 0) + (1 - g.homeWin));
      denom.set(g.home, (denom.get(g.home) ?? 0) + 1 / (ph + pa));
      denom.set(g.away, (denom.get(g.away) ?? 0) + 1 / (ph + pa));
    }
    for (const t of teams) {
      const d = denom.get(t) ?? 0;
      if (d > 1e-12) psi.set(t, (wins.get(t) ?? 0) / d);
    }
    // Normalize mean to 1 to fix the scale.
    const mean = teams.reduce((s, t) => s + (psi.get(t) ?? 0), 0) / teams.length;
    for (const t of teams) psi.set(t, (psi.get(t) ?? 0) / Math.max(mean, 1e-12));
  }
  return { strengths: Object.fromEntries(psi), homeEdge };
}

/** Win probability for home vs away under a fitted model. */
export function btWinProb(fit: BtFit, home: string, away: string): number {
  const ph = (fit.strengths[home] ?? 0) * fit.homeEdge;
  const pa = fit.strengths[away] ?? 0;
  if (!(ph > 0 && pa > 0)) throw new Error("bradley-terry: unknown team");
  return ph / (ph + pa);
}

/** MAD of a sample (for the omega normalization). */
export function mad(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("bradley-terry: need >= 1 value");
  const s = [...xs].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)] ?? 0;
  const devs = s.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  return devs[Math.floor(devs.length / 2)] ?? 0;
}

/**
 * omega_n: MAD-normalized strength differential for a slate of matchups.
 * Returns one omega per matchup, normalized by the slate MAD.
 */
export function strengthCovariate(
  fit: BtFit,
  matchups: ReadonlyArray<readonly [string, string]>,
): number[] {
  const diffs = matchups.map(([h, a]) => {
    const ph = fit.strengths[h] ?? 0;
    const pa = fit.strengths[a] ?? 0;
    if (!(ph > 0 && pa > 0)) throw new Error("bradley-terry: unknown team");
    return Math.log(ph) - Math.log(pa);
  });
  const m = Math.max(mad(diffs), 1e-9);
  return diffs.map((d) => d / m);
}
