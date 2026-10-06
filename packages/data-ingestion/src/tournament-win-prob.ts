/**
 * Stop Simulating! Efficient Computation of Tournament Winning Probabilities
 *
 * arXiv:2307.10411v1 · lane:experimental · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Replace Monte Carlo with exact fixed-bracket DP for the 14-team NFL playoff bracket: P(team
 * advances past round r+1) = sum over possible opponents o of P(o reaches round r) * P(team beats
 * o), byes carried forward with probability 1 - pragmatic v1: exact bracket DP applied to the
 * current projected seeding each week, published alongside the existing Monte Carlo as a cross-
 * check; recompute weekly and live (clamping completed games to probability 1); output per-team
 * P(win division), P(make playoffs), P(first-round bye), P(reach divisional/SB), P(win Super Bowl)
 * with zero simulation noise - plus exact enumeration of division-race outcomes (<=4 relevant
 * games per division race: 2^4=16 to 3^4=81 combinations) for exact P(win division), and exact
 * joint probabilities (P(Team A AND Team B both reach the Super Bowl)) for pricing correlated
 * playoff futures.
 *
 * ACCEPTANCE GATE: ADOPT if: the exact bracket DP reproduces brute-force enumeration on toy brackets exactly, runs
 * in <1s on the full 14-team bracket, and on the 2023-2025 backtest the 100k-run Monte Carlo shows
 * max team-level Super Bowl probability error >0.25% points in at least 2 of 3 seasons (proving
 * simulation noise is worth eliminating); REJECT (keep Monte Carlo) if GSE's playoff probabilities
 * are consumed only as coarse tiers AND the Monte Carlo serves double duty producing joint
 * distributions the marginal DP cannot supply.
 *
 * Ingest role: feature builder (tournament win probabilities: exact DP instead of simulation).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2307.10411v1" as const;
export const LANE = "experimental" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if: the exact bracket DP reproduces brute-force enumeration on toy brackets exactly, runs
 * in <1s on the full 14-team bracket, and on the 2023-2025 backtest the 100k-run Monte Carlo shows
 * max team-level Super Bowl probability error >0.25% points in at least 2 of 3 seasons (proving
 * simulation noise is worth eliminating); REJECT (keep Monte Carlo) if GSE's playoff probabilities
 * are consumed only as coarse tiers AND the Monte Carlo serves double duty producing joint
 * distributions the marginal DP cannot supply.`;

export const CONFIG = {
  enabled: false,
  method: "exact dynamic programming",
  bracketSize: 32,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type WinMatrix = (i: number, j: number) => number | null;

/** Exact single-elimination win probabilities via DP over rounds. */
export function tournamentWinProb(
  nTeams: number,
  winProb: WinMatrix,
): number[] | null {
  if (!Number.isInteger(nTeams) || nTeams < 2 || (nTeams & (nTeams - 1)) !== 0) return null;
  const rounds = Math.log2(nTeams);
  let prob = new Array<number>(nTeams).fill(1);
  for (let r = 0; r < rounds; r++) {
    const next = new Array<number>(nTeams).fill(0);
    const group = 2 ** (r + 1);
    for (let i = 0; i < nTeams; i++) {
      const gStart = Math.floor(i / group) * group;
      const half = group / 2;
      const inFirst = i < gStart + half;
      const oppStart = inFirst ? gStart + half : gStart;
      const oppEnd = inFirst ? gStart + group : gStart + half;
      let s = 0;
      for (let j = oppStart; j < oppEnd; j++) {
        const p = winProb(i, j);
        if (p === null || !isFiniteNumber(p) || p < 0 || p > 1) return null;
        s += (prob[j] ?? 0) * p;
      }
      next[i] = (prob[i] ?? 0) * s;
    }
    prob = next;
  }
  return prob;
}

/** BT win-prob matrix from strengths. */
export function btMatrix(strengths: readonly number[]): WinMatrix {
  return (i: number, j: number) => {
    const si = strengths[i];
    const sj = strengths[j];
    if (si === undefined || sj === undefined || !isFiniteNumber(si) || !isFiniteNumber(sj)) return null;
    return 1 / (1 + Math.exp(-(si - sj)));
  };
}

/** Sanity: probabilities sum to 1. */
export function sumsToOne(ps: readonly number[]): boolean {
  return Math.abs(ps.reduce((a, b) => a + b, 0) - 1) < 1e-9;
}

/** Favorite's title probability (max entry). */
export function favoriteTitleProb(ps: readonly number[]): number | null {
  if (ps.length === 0 || !ps.every(isFiniteNumber)) return null;
  return Math.max(...ps);
}
