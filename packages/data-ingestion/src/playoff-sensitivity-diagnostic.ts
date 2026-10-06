/**
 * Robust Draws in Balanced Knockout Tournaments
 *
 * arXiv:1604.05090v1 · lane:experimental · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adapt the paper's robust-draws sensitivity machinery to NFL futures/bracket risk: although draw-
 * fixing does not exist in the NFL's fixed bracket, the transferable piece is the multilinear
 * sensitivity diagnostic for balanced knockout tournaments -- write each team's championship
 * probability as an explicit multilinear function of the pairwise game-win probabilities P_ij in
 * GSE's playoff simulator (accumulate the alpha_ij coefficients per Lemma 7/8), report the top-k
 * (i,j) pairs by |alpha_ij| for any Super Bowl futures position ('this ticket's value hinges most
 * on the estimated probability that team i beats team j'), and quote the worst-case drop
 * sum|alpha_ij|*epsilon as a risk-averse overlay for sizing futures bets.
 *
 * ACCEPTANCE GATE: ADAPT gate (narrow): (a) Test 2 must confirm the alpha_ij coefficients predict simulated
 * perturbation effects (linearity holds at epsilon ~ 0.03); (b) Test 3 or analyst judgment must
 * show the sensitivity ranking changes at least some futures sizing decisions vs the status quo.
 *
 * Ingest role: feature builder (multilinear sensitivity diagnostic for futures risk).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1604.05090v1" as const;
export const LANE = "experimental" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT gate (narrow): (a) Test 2 must confirm the alpha_ij coefficients predict simulated
 * perturbation effects (linearity holds at epsilon ~ 0.03); (b) Test 3 or analyst judgment must
 * show the sensitivity ranking changes at least some futures sizing decisions vs the status quo.`;

export const CONFIG = { enabled: false, epsilon: 0.03, topK: 10 } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PathPair {
  readonly i: string;
  readonly j: string;
}

export interface AlphaCoeff extends PathPair {
  readonly alpha: number;
}

/**
 * Multilinear sensitivity (Lemma 7/8 transfer): for a FIXED bracket path, a
 * team's championship probability is a product of pairwise win probabilities
 * along the path, so dP/dP_ij = P / P_ij exactly for pairs on the path and 0
 * for pairs that cannot meet. This is the paper's alpha_ij diagnostic.
 */
export function alphaCoefficients(
  champProb: number,
  pathPairs: readonly PathPair[],
  pWin: ReadonlyMap<string, ReadonlyMap<string, number>>,
): AlphaCoeff[] | null {
  if (!isFiniteNumber(champProb) || champProb < 0 || champProb > 1) return null;
  const out: AlphaCoeff[] = [];
  const seen = new Set<string>();
  for (const { i, j } of pathPairs) {
    const key = `${i}>${j}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pij = pWin.get(i)?.get(j);
    if (!isFiniteNumber(pij) || (pij as number) <= 0) return null;
    out.push({ i, j, alpha: champProb / (pij as number) });
  }
  return out;
}

/** Worst-case championship-prob drop: sum |alpha_ij| * epsilon (risk-averse overlay). */
export function worstCaseDrop(alphas: readonly AlphaCoeff[], epsilon: number): number | null {
  if (!isFiniteNumber(epsilon) || epsilon < 0) return null;
  if (!alphas.every((a) => isFiniteNumber(a.alpha))) return null;
  return alphas.reduce((s, a) => s + Math.abs(a.alpha) * epsilon, 0);
}

/** Top-k (i,j) pairs by |alpha_ij|: 'this ticket hinges most on P(i beats j)'. */
export function topKPairs(alphas: readonly AlphaCoeff[], k: number): AlphaCoeff[] {
  if (!isFiniteNumber(k) || k <= 0) return [];
  return [...alphas].sort((a, b) => Math.abs(b.alpha) - Math.abs(a.alpha)).slice(0, k);
}
