/**
 * arXiv:2607.08199 — Volatility in Prediction Markets: A Structural Approach
 *
 * DR-AS structural volatility forecaster over de-vigged consensus p_t, hours-to-kickoff tau_t, cross-book
 * spread s_t (adverse-selection proxy), and book-move-count volume proxy V_t; predicted remaining-move
 * scale drives CLV confidence, bet-size scaling, and abstention.
 *
 * Improvement: Add a DR-AS structural volatility forecaster over GSE's odds data (de-vigged consensus p_t, hours-to-kickoff tau_t, cross-book spread s_t as the adverse-selection proxy, book-move-count volume proxy V_t) whose predicted remaining-move scale drives CLV confidence, bet-size scaling, and abstention.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the structural forecaster if, on the 2025 NFL holdout, DR-AS improves on the GARCH(1,1) baseline by >=15% in volume-weighted interval score with the paired-bootstrap difference significant at 5%. REJECT (keep GARCH or constant vol) if the gain is <10% or insignificant — then cross-book spread is not a sufficient adverse-selection proxy in bookmaker (non-CLOB) markets.
 */

/** Structural state for one game at one time. */
export interface DrasState {
  /** De-vigged consensus win prob. */
  p: number;
  /** Hours to kickoff. */
  tau: number;
  /** Cross-book spread (adverse-selection proxy). */
  s: number;
  /** Book-move-count volume proxy. */
  V: number;
}

/** DR-AS parameters. */
export interface DrasParams {
  base: number;
  wTau: number;
  wSpread: number;
  wVol: number;
}

/** Predicted remaining-move scale (volatility) sigma_hat. */
export function drasVolatility(st: DrasState, pr: DrasParams): number {
  if (st.tau < 0 || st.s < 0 || st.V < 0) throw new Error("drasVolatility: state >= 0");
  const v = pr.base + pr.wTau * Math.sqrt(st.tau) + pr.wSpread * st.s + pr.wVol * Math.log1p(st.V);
  return Math.max(1e-6, v);
}

/** GARCH(1,1)-style baseline volatility (the comparator to beat). */
export function garchBaseline(
  prevVar: number,
  lastMoveSq: number,
  omega: number,
  alpha: number,
  beta: number,
): number {
  if (omega < 0 || alpha < 0 || beta < 0 || alpha + beta >= 1) {
    throw new Error("garchBaseline: stationary params");
  }
  return omega + alpha * lastMoveSq + beta * prevVar;
}

/** Interval score comparison: positive means DR-AS wins on this observation. */
export function intervalScoreWin(
  y: number,
  drasLo: number,
  drasHi: number,
  garchLo: number,
  garchHi: number,
  alpha: number,
): number {
  const is = (lo: number, hi: number): number => {
    const w = hi - lo;
    return w + (lo > y ? (2 / alpha) * (lo - y) : 0) + (y > hi ? (2 / alpha) * (y - hi) : 0);
  };
  return is(garchLo, garchHi) - is(drasLo, drasHi);
}
