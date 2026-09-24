/**
 * GSE In-Play WP Baseline v1 — discrete-time Markov chain over lead states.
 *
 * State space: lead L ∈ {−40, …, +40}. Transition matrix from empirical
 * per-second scoring tempo λ and lead-size-conditioned balance
 * Pr(leader scores | lead L). Precomputed Pⁿ for ~15 max remaining events
 * gives O(1) live queries. Team-conditioned variant replaces pooled c(L)
 * with c_team(L) logistic-fitted from pregame Elo/spread priors.
 *
 * @see arXiv:1310.4461v2 — "Scoring dynamics across professional team sports"
 *
 * ACCEPTANCE GATE: ADOPT the team-conditioned chain into the live product iff,
 * on 2019–2024 NFL data, it beats the carried-forward pregame market
 * probability by ≥ 0.005 Brier averaged over scoring events 1–5 AND matches
 * or beats the exact paper replication by ≥ 0.003 Brier. The gate is a
 * backtest concern; this module is the pure chain kernel, not wired live.
 */

export const MAX_LEAD = 40;
export const N_STATES = 2 * MAX_LEAD + 1;

const idx = (lead: number): number => lead + MAX_LEAD;
const leadOf = (i: number): number => i - MAX_LEAD;

export interface InPlayChainParams {
  /** Per-event scoring tempo λ (events per remaining-event unit). */
  tempo: number;
  /** P(leader scores | lead L), pooled or team-conditioned c_team(L). */
  balanceAt: (lead: number) => number;
  /** Expected points per scoring event for the leader/follower. */
  pointsPerEvent?: number;
}

/**
 * Build the one-step transition matrix over lead states for a single
 * scoring event. From lead L: with prob balance(L) the leader scores
 * (+points), else the follower scores (−points); absorbing clamp at ±40.
 */
export function buildTransitionMatrix(params: InPlayChainParams): number[][] {
  const k = params.pointsPerEvent ?? 7;
  const P: number[][] = Array.from({ length: N_STATES }, () =>
    new Array<number>(N_STATES).fill(0),
  );
  for (let s = 0; s < N_STATES; s++) {
    const L = leadOf(s);
    const b = params.balanceAt(L);
    if (!(b >= 0 && b <= 1)) throw new Error("buildTransitionMatrix: balance out of [0,1]");
    const up = Math.min(MAX_LEAD, L + k);
    const down = Math.max(-MAX_LEAD, L - k);
    const row = P[s];
    if (!row) continue;
    row[idx(up)] = (row[idx(up)] ?? 0) + b;
    row[idx(down)] = (row[idx(down)] ?? 0) + (1 - b);
  }
  return P;
}

/** Matrix multiplication (square, dense, small). */
function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const C: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k2 = 0; k2 < n; k2++) {
      const aik = A[i]?.[k2] ?? 0;
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) {
        const crow = C[i];
        if (crow) crow[j] = (crow[j] ?? 0) + aik * (B[k2]?.[j] ?? 0);
      }
    }
  }
  return C;
}

/**
 * Precompute P¹…P^maxEvents for O(1) live win-probability queries.
 */
export function precomputePowers(P: number[][], maxEvents = 15): number[][][] {
  if (maxEvents < 1) throw new Error("precomputePowers: maxEvents must be ≥ 1");
  const powers: number[][][] = [P];
  for (let e = 2; e <= maxEvents; e++) {
    const prev = powers[powers.length - 1];
    if (!prev) throw new Error("precomputePowers: internal error");
    powers.push(matMul(prev, P));
  }
  return powers;
}

/**
 * Live win probability: P(home wins | current lead L, n scoring events left).
 * Ties (lead 0 at the end) count as half a win.
 */
export function inPlayWinProb(
  powers: ReadonlyArray<readonly (readonly number[])[]>,
  currentLead: number,
  eventsLeft: number,
): number {
  if (powers.length === 0) throw new Error("inPlayWinProb: no precomputed powers");
  if (eventsLeft < 1) {
    return currentLead > 0 ? 1 : currentLead < 0 ? 0 : 0.5;
  }
  const P = powers[Math.min(eventsLeft, powers.length) - 1];
  if (!P) throw new Error("inPlayWinProb: missing power matrix");
  const row = P[idx(Math.max(-MAX_LEAD, Math.min(MAX_LEAD, currentLead)))];
  if (!row) throw new Error("inPlayWinProb: missing row");
  let wp = 0;
  for (let s = 0; s < N_STATES; s++) {
    const L = leadOf(s);
    const mass = row[s] ?? 0;
    wp += mass * (L > 0 ? 1 : L < 0 ? 0 : 0.5);
  }
  return wp;
}

/**
 * Team-conditioned balance c_team(L): logistic in pregame strength
 * differential — stronger pregame teams restore leads more often.
 */
export function teamConditionedBalance(
  pregameSpread: number,
  baseBalance = 0.55,
  sensitivity = 0.02,
): (lead: number) => number {
  return (lead: number) => {
    const x = baseBalance + sensitivity * pregameSpread * Math.sign(lead === 0 ? 1 : lead);
    return Math.min(0.95, Math.max(0.05, x));
  };
}
