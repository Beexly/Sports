/**
 * arXiv 2105.08877v2: Deep Reinforcement Learning for Optimal Stopping with Application in Financial Engineering
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Formulate bet-timing as optimal stopping: state = (current edge vs market, hours to kickoff, line-movement velocity, book spread, bankroll), actions = {bet now at current line, wait} with forced terminal action at kickoff, reward = CLV captured (or realized profit) relative to acting immediately; train a C51 stopping agent on 2021-2023 line-movement histories with the paper's three-stage protocol (Valid_HP on 2022, Valid_Model on 2023 H1, strictly-future Test on 2023 H2-2024); distributional variant minimizing CVaR of CLV regret (best achievable line minus taken line) instead of maximizing expected payout.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Formulate bet-timing as optimal stopping: state = (current edge vs market, hours to kickoff, line-movement velocity, book spread, bankroll), actions = {bet now at current line, wait} with forced terminal action at kickoff, reward = CLV captured (or realized profit) relative to acting immediately; train a C51 stopping agent on 2021-2023 line-movement histories with the paper's three-stage protocol (Valid_HP on 2022, Valid_Model on 2023 H1, strictly-future Test on 2023 H2-2024) — then train a distributional variant minimizing CVaR of CLV regret (best achievable line minus taken line) instead of maximizing expected payout, testing whether tail-aware timing beats expectation-maximizing timing.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on the strictly-future test window the C51 stopping policy beats the best timing benchmark by >=1.5pp of CLV per bet with realized ROI no worse than the 'bet at open' baseline; otherwise REJECT (timing alpha doesn't survive transaction reality).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: rl_sequential_decisions | verdict: ADOPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

export interface StoppingState {
  edge: number;
  hoursToKickoff: number;
  lineVelocity: number;
  bookSpread: number;
  bankroll: number;
}

/** Backward induction for the optimal-stopping value on a time grid. */
export function stoppingBackwardInduction(
  immediateReward: number[],
  waitValue: number[],
  discount: number,
): { value: number[]; stopAt: boolean[] } {
  const T = immediateReward.length;
  const value = new Array<number>(T).fill(0);
  const stopAt = new Array<boolean>(T).fill(false);
  value[T - 1] = immediateReward[T - 1]!;
  stopAt[T - 1] = true; // forced terminal action
  for (let t = T - 2; t >= 0; t--) {
    const wait = discount * waitValue[t]!;
    if (immediateReward[t]! >= wait) {
      value[t] = immediateReward[t]!;
      stopAt[t] = true;
    } else {
      value[t] = wait;
      stopAt[t] = false;
    }
  }
  return { value, stopAt };
}

/** C51-style categorical projection of the Bellman update onto a fixed support. */
export function c51Project(
  support: number[],
  probs: number[],
  r: number,
  gamma: number,
): number[] {
  const m = support.length;
  const vMin = support[0]!;
  const vMax = support[m - 1]!;
  const dz = (vMax - vMin) / (m - 1);
  const out = new Array<number>(m).fill(0);
  for (let j = 0; j < m; j++) {
    const tz = Math.min(vMax, Math.max(vMin, r + gamma * support[j]!));
    const b = (tz - vMin) / dz;
    const l = Math.floor(b);
    const u = Math.ceil(b);
    if (l === u) {
      out[l]! += probs[j]!; // projected value lands exactly on a support atom
    } else {
      out[l]! += probs[j]! * (u - b);
      out[u]! += probs[j]! * (b - l);
    }
  }
  const s = out.reduce((a, b) => a + b, 0);
  return out.map((x) => x / Math.max(1e-300, s));
}

/** CVaR of a discrete return distribution at level alpha. */
export function cvar(support: number[], probs: number[], alpha: number): number {
  const pairs = support.map((v, i) => [v, probs[i]!] as [number, number]).sort((a, b) => a[0] - b[0]);
  let cum = 0;
  let num = 0;
  for (const [v, p] of pairs) {
    const take = Math.min(p, alpha - cum);
    if (take <= 0) break;
    num += take * v;
    cum += take;
  }
  return num / Math.max(1e-300, cum);
}

/** CLV regret: best achievable line minus taken line (in probability units). */
export function clvRegret(bestLine: number, takenLine: number): number {
  return bestLine - takenLine;
}
