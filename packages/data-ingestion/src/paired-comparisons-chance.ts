/**
 * Paired comparisons for games of chance
 *
 * arXiv:2303.14857v1 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adapt only the luck function: replace GSE's BT/Elo win-probability link p=1/(1+10^(-Delta/400))
 * with the beta-capped link p=(1-beta)/2+beta/(1+10^(-Delta/400)), beta tuned on 2015-2025
 * nflverse moneylines (grid {0.8,0.85,0.9,0.95,1.0}) - applied at the calibration layer (predicted
 * prob -> market prob), not inside the rating update, keeping the existing Elo/Glicko machinery
 * untouched - then test team-specific beta via hierarchical beta_team with shrinkage to the global
 * mean, kept only if beta_team is stable year-over-year (rank correlation >0.3).
 *
 * ACCEPTANCE GATE: ADOPT the beta-capped link if it reduces tail-decile log-loss by >=0.002 vs beta=1 on 2015-2025
 * pooled AND improves overall log-loss (no overall degradation); ADAPT if it wins only in the tail
 * - apply the cap only for |p-0.5|>0.3 (piecewise link); REJECT if beta<1 does not beat beta=1 on
 * NFL data.
 *
 * Ingest role: feature builder (paired-comparison model for games of chance: luck-adjusted BT).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2303.14857v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the beta-capped link if it reduces tail-decile log-loss by >=0.002 vs beta=1 on 2015-2025
 * pooled AND improves overall log-loss (no overall degradation); ADAPT if it wins only in the tail
 * - apply the cap only for |p-0.5|>0.3 (piecewise link); REJECT if beta<1 does not beat beta=1 on
 * NFL data.`;

export const CONFIG = {
  enabled: false,
  model: "BT with chance component",
  luckPrior: 0.1,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ChanceGame {
  readonly a: string;
  readonly b: string;
  readonly aWin: boolean;
}

/** Win probability with a chance (luck) floor: (1-c)*BT + c*0.5. */
export function chanceWinProb(thetaA: number, thetaB: number, chance = 0.1): number | null {
  if (![thetaA, thetaB, chance].every(isFiniteNumber) || chance < 0 || chance >= 1) return null;
  const bt = 1 / (1 + Math.exp(-(thetaA - thetaB)));
  return (1 - chance) * bt + chance * 0.5;
}

/** MLE of (theta, chance) by grid search on chance + Newton-ish theta steps. */
export function fitChanceModel(
  games: readonly ChanceGame[],
  teams: readonly string[],
  chanceGrid = [0, 0.05, 0.1, 0.2, 0.3],
): { theta: number[]; chance: number; logLik: number } | null {
  if (games.length === 0 || teams.length === 0) return null;
  const idx = new Map(teams.map((t, i) => [t, i]));
  for (const g of games) {
    if (idx.get(g.a) === undefined || idx.get(g.b) === undefined || typeof g.aWin !== "boolean") return null;
  }
  const logLik = (theta: number[], chance: number): number => {
    let ll = 0;
    for (const g of games) {
      const p = chanceWinProb(theta[idx.get(g.a) ?? 0] ?? 0, theta[idx.get(g.b) ?? 0] ?? 0, chance) ?? 0.5;
      ll += g.aWin ? Math.log(Math.max(1e-12, p)) : Math.log(Math.max(1e-12, 1 - p));
    }
    return ll;
  };
  let best: { theta: number[]; chance: number; logLik: number } | null = null;
  for (const c of chanceGrid) {
    const theta = new Array<number>(teams.length).fill(0);
    for (let it = 0; it < 200; it++) {
      const grad = new Array<number>(teams.length).fill(0);
      for (const g of games) {
        const i = idx.get(g.a) ?? 0;
        const j = idx.get(g.b) ?? 0;
        const p = chanceWinProb(theta[i] ?? 0, theta[j] ?? 0, c) ?? 0.5;
        const d = (g.aWin ? 1 : 0) - p;
        const dpdtheta = (1 - c) * p * (1 - p) * 2;
        grad[i] = (grad[i] ?? 0) + d * dpdtheta;
        grad[j] = (grad[j] ?? 0) - d * dpdtheta;
      }
      for (let i = 0; i < theta.length; i++) theta[i] = (theta[i] ?? 0) + 0.05 * (grad[i] ?? 0);
      const m = theta.reduce((a, b) => a + b, 0) / theta.length;
      for (let i = 0; i < theta.length; i++) theta[i] = (theta[i] ?? 0) - m;
    }
    const ll = logLik(theta, c);
    if (!best || ll > best.logLik) best = { theta, chance: c, logLik: ll };
  }
  return best;
}

/** Luck share: how much of the outcome variance the chance component explains. */
export function luckShare(chance: number): number | null {
  if (!isFiniteNumber(chance) || chance < 0 || chance >= 1) return null;
  return chance;
}
