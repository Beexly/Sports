/**
 * arXiv 2604.20172v2: Cover Meets Robbins While Betting on Bounded Data: ln n Regret and Almost Sure ln ln n Regret.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: 50-50 Cover-Robbins mixture as the global weekly stake multiplier on top of per-pick Kelly fractions, with anytime-valid edge-monitor gates: scale stakes 1.5x when test wealth W_n >= 20 (rejecting no-edge at alpha=0.05) and halve stakes plus trigger model review when W_n <= 0.5 after at least 50 picks. Ville validity keeps the shuffle test quiet.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Layer a 50-50 Cover-Robbins mixture as the global weekly stake multiplier on top of per-pick Kelly fractions, with anytime-valid edge-monitor gates: scale stakes 1.5x when test wealth W_n >= 20 (rejecting no-edge at alpha=0.05) and halve stakes plus trigger model review when W_n <= 0.5 after >=50 picks.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if chronological backtest: realized regret R_n ≤ 2x the paper's theoretical bound constant at n = full sample AND final log-wealth ≥ 0.9 x oracle constant-fraction AND the shuffle test keeps W_n < 20 in ≥95% of shuffles (Ville validity holds on sports data).
 *
 * ENABLED=false: global stake multiplier; needs a human call.
 */


export const ENABLED = false;

export const SCALE_UP_WEALTH = 20; // reject no-edge at alpha = 0.05
export const SCALE_DOWN_WEALTH = 0.5;
export const MIN_PICKS_FOR_HALT = 50;

/**
 * Betting-martingale wealth for bounded outcomes in [0,1] against null mean m0:
 * W_n = prod_t (1 + lambda_t * (x_t - m0)). lambda_t is the Cover fraction
 * schedule; the Robbins mixture averages over a grid of constant lambdas.
 */
export function coverWealth(
  outcomes: readonly number[],
  m0: number,
  lambdaSchedule: (t: number) => number,
): number {
  let w = 1;
  for (let t = 0; t < outcomes.length; t++) {
    const lambda = Math.min(Math.max(lambdaSchedule(t), -0.99), 0.99);
    w *= 1 + lambda * (outcomes[t] - m0);
    if (w <= 0) return 0;
  }
  return w;
}

/** Robbins mixture: average wealth over a grid of constant betting fractions. */
export function robbinsMixtureWealth(
  outcomes: readonly number[],
  m0: number,
  lambdas: readonly number[],
): number {
  if (lambdas.length === 0) return 1;
  const ws = lambdas.map((l) => coverWealth(outcomes, m0, () => l));
  return ws.reduce((a, b) => a + b, 0) / ws.length;
}

/** 50-50 Cover-Robbins mixture wealth W_n. */
export function coverRobbinsWealth(
  outcomes: readonly number[],
  m0: number,
  coverLambda: (t: number) => number,
  robbinsLambdas: readonly number[],
): number {
  return (
    0.5 * coverWealth(outcomes, m0, coverLambda) +
    0.5 * robbinsMixtureWealth(outcomes, m0, robbinsLambdas)
  );
}

export type StakeGate = "scale-up" | "scale-down" | "hold";

/**
 * Anytime-valid edge-monitor gates on the mixture wealth.
 * Scale 1.5x when W_n >= 20; halve + model review when W_n <= 0.5 after >=50 picks.
 */
export function stakeGate(
  wealth: number,
  nPicks: number,
): { gate: StakeGate; multiplier: number; review: boolean } {
  if (wealth >= SCALE_UP_WEALTH) {
    return { gate: "scale-up", multiplier: 1.5, review: false };
  }
  if (wealth <= SCALE_DOWN_WEALTH && nPicks >= MIN_PICKS_FOR_HALT) {
    return { gate: "scale-down", multiplier: 0.5, review: true };
  }
  return { gate: "hold", multiplier: 1, review: false };
}

/**
 * Shuffle test (Ville validity): under the null (no edge), W_n should stay
 * below 20 in >= 95% of shuffles of the outcome sequence.
 */
export function shuffleTestPassRate(
  outcomes: readonly number[],
  m0: number,
  nShuffles: number,
  seed: number,
): number {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const lambdas = [-0.5, -0.25, 0.25, 0.5];
  let pass = 0;
  for (let s = 0; s < nShuffles; s++) {
    const shuffled = [...outcomes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const w = coverRobbinsWealth(shuffled, m0, (t) => 0.25 / Math.sqrt(t + 1), lambdas);
    if (w < SCALE_UP_WEALTH) pass++;
  }
  return pass / nShuffles;
}
