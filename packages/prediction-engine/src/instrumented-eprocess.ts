/**
 * Instrumented (randomized-publication) e-processes — Part II of the CEPT
 * paper (docs/research/cept/HONEST_CEPT.md, §7–§8), executable form.
 *
 * WHY THIS MODULE EXISTS. forecast-skill-eprocess.ts scores our probabilities
 * against the market's on the transcript of published picks. Theorem 7 of the
 * paper proves a hard limit on ALL such transcript statistics: a forecaster
 * with genuine knowledge and zero influence, and a forecaster with zero
 * knowledge whose predictions come true BECAUSE they are published (echo),
 * generate identical data. No statistic computed from (covariates, published
 * forecast, outcome) can tell them apart. The escape is a design change, not a
 * cleverer statistic: randomize WHICH forecast gets published with a known
 * coin. This module owns the two e-processes that coin makes possible:
 *
 *   1. VALUE (Theorem 9): does publishing the candidate slate CAUSE better
 *      reward than publishing the baseline slate — knowledge and influence
 *      combined, valid under every possible reaction of the world?
 *   2. SHIFT (Remark 13): does the OUTCOME LAW itself depend on which slate
 *      was published, WITHIN each forecast context? Growth here is
 *      anytime-valid evidence of performativity (echo/influence). Value with
 *      NO shift is evidence the value came from prediction, not influence.
 *      This is the separation Theorem 7 proves impossible without the coin.
 *      Stratification is load-bearing: an echo world can leave the two arms'
 *      MARGINAL win rates identical (echoing a rule whose average is the
 *      baseline's rate) while the conditional-on-forecast laws differ
 *      maximally, so the caller supplies a stratum per round (bucketed
 *      candidate forecast) and all counts are kept per arm x stratum.
 *
 * These answer DIFFERENT questions and are reported separately, never merged —
 * same discipline as the skill/profit/self-honesty triple.
 *
 * ── THE MATH (first principles) ──────────────────────────────────────────────
 *
 * VALUE. Round t: draw Z_t ~ Bernoulli(pi_t) with pi_t known and decided
 * before the outcome; publish candidate if Z_t = 1 else baseline; observe
 * reward R_t in [0, B]. The IPW score
 *
 *     S_t = Z_t R_t / pi_t - (1 - Z_t) R_t / (1 - pi_t)
 *
 * satisfies E[S_t | F_{t-1}] = Delta_t = E[R_t(1) - R_t(0) | F_{t-1}] exactly
 * (Lemma 8 — design independence of Z_t is the whole proof). Given F_{t-1},
 * S_t lives in [-B/(1-pi_t), B/pi_t], an interval of width
 * w_t = B / (pi_t (1 - pi_t)). Hoeffding's lemma then licenses the e-factor
 *
 *     E_t = exp( lambda_t S_t - lambda_t^2 w_t^2 / 8 ),   lambda_t >= 0,
 *
 * with lambda_t chosen from data STRICTLY BEFORE round t: under
 * H0: Delta_t <= 0 for all t, E[E_t | F_{t-1}] <= exp(lambda_t Delta_t) <= 1,
 * so M_t = prod E_s is a nonnegative supermartingale and Ville's inequality
 * gives P(sup_t M_t >= 1/alpha) <= alpha — anytime-valid, uniformly over ALL
 * reaction functions, with nothing about the world assumed.
 *
 * THE CONSTANT IS LOAD-BEARING. w_t^2/8 is the RANGE constant, not the
 * variance. Substituting Var(S_t)/2 breaks validity for exactly the shape IPW
 * scores take (a rare large positive term against a common small negative
 * one): a mean-zero score of +9 w.p. 0.1 / -1 w.p. 0.9 has variance 9 yet
 * E[exp(0.3 S - 0.09*9/2)] ~= 1.4371 > 1. The test suite pins both this
 * failure and the range-constant's validity analytically.
 *
 * SHIFT. On the same rounds, test H0: Y_t independent of Z_t given F_{t-1}
 * and the round's stratum (no performativity, conditional on the forecast
 * context). Within each stratum, each arm keeps a predictable Laplace-smoothed
 * estimate ph_z(y) of the outcome law, and the marginal is the KNOWN
 * pi-mixture m(y) = pi_t ph_1(y) + (1 - pi_t) ph_0(y). The factor
 *
 *     G_t = ph_{Z_t}(Y_t) / m(Y_t)
 *
 * has, under the conditional independence null (P(y | z, stratum) =
 * P(y | stratum)):
 *     E[G_t | F_{t-1}] = sum_z pi_z sum_y P(y) ph_z(y)/m(y)
 *                      = sum_y P(y) [ sum_z pi_z ph_z(y) ] / m(y)
 *                      = sum_y P(y) = 1,
 * an EXACT e-value regardless of how bad the estimates are — the mixture
 * construction, not estimation quality, carries validity. Under echo the
 * arm-conditional estimates separate within strata and the product grows.
 *
 * Predictability rules both processes: every quantity used at round t
 * (lambda_t, the arm estimates, pi_t) is fixed before Y_t resolves.
 */

const LN_TWO_SIDED_EPS = 1e-12;

export interface ValueEProcessConfig {
  /** B > 0: every reward must land in [0, rewardBound]. */
  readonly rewardBound: number;
  /** Ville crossing level: evidence threshold is 1/alpha. */
  readonly alpha: number;
  /**
   * Cap on the predictable plug-in lambda. Defaults to the oracle-optimal
   * lambda for a contrast of B/2 at pi = 1/2 — generous, never unsafe
   * (any predictable lambda >= 0 preserves validity; caps only affect power).
   */
  readonly maxLambda?: number;
}

export interface ValueRound {
  /** Z_t: true iff the candidate slate was the one published. */
  readonly publishedCandidate: boolean;
  /** pi_t in (0,1): the KNOWN randomization probability used for this round. */
  readonly pi: number;
  /** Realized reward of the published slate, in [0, rewardBound]. */
  readonly reward: number;
}

export interface ValueEProcessState {
  readonly rounds: number;
  /** log of the running product M_t. */
  readonly logM: number;
  /** Largest log M_s seen so far (Ville is about the running supremum). */
  readonly logMPeak: number;
  /** Sticky: did sup_s M_s reach 1/alpha at any point? */
  readonly crossed: boolean;
  /** Running mean of past scores — the predictable estimate of Delta. */
  readonly meanScore: number;
}

export function hoeffdingWidth(rewardBound: number, pi: number): number {
  assertPi(pi);
  if (!(rewardBound > 0) || !Number.isFinite(rewardBound)) {
    throw new RangeError(`rewardBound must be a positive finite number, got ${rewardBound}`);
  }
  return rewardBound / (pi * (1 - pi));
}

export function ipwScore(round: ValueRound, rewardBound: number): number {
  assertPi(round.pi);
  if (
    !Number.isFinite(round.reward) ||
    round.reward < 0 ||
    round.reward > rewardBound
  ) {
    throw new RangeError(
      `reward must lie in [0, ${rewardBound}], got ${round.reward}`
    );
  }
  return round.publishedCandidate
    ? round.reward / round.pi
    : -round.reward / (1 - round.pi);
}

export function initValueEProcess(config: ValueEProcessConfig): ValueEProcessState {
  if (!(config.alpha > 0) || config.alpha >= 1) {
    throw new RangeError(`alpha must lie in (0,1), got ${config.alpha}`);
  }
  hoeffdingWidth(config.rewardBound, 0.5); // validates rewardBound
  return { rounds: 0, logM: 0, logMPeak: 0, crossed: false, meanScore: 0 };
}

/**
 * One round of the VALUE e-process. lambda_t is the plug-in
 * clamp(4 * max(meanScore, 0) / w_t^2, [0, maxLambda]) — the oracle-optimal
 * lambda for the running Delta estimate, computed from PAST rounds only, so it
 * is predictable and validity holds whatever it happens to be.
 */
export function updateValueEProcess(
  state: ValueEProcessState,
  round: ValueRound,
  config: ValueEProcessConfig
): ValueEProcessState {
  const w = hoeffdingWidth(config.rewardBound, round.pi);
  // Oracle lambda* = 4*Delta/w^2; with Delta <= B and the smallest width
  // w = 4B (at pi = 1/2) that is at most 4B/(4B)^2 = 1/(4B) — the default cap.
  const maxLambda = config.maxLambda ?? 1 / (4 * config.rewardBound);
  const lambda = Math.min(
    Math.max((4 * Math.max(state.meanScore, 0)) / (w * w), 0),
    maxLambda
  );
  const s = ipwScore(round, config.rewardBound);
  const logFactor = lambda * s - (lambda * lambda * w * w) / 8;
  const logM = state.logM + logFactor;
  const logMPeak = Math.max(state.logMPeak, logM);
  const rounds = state.rounds + 1;
  return {
    rounds,
    logM,
    logMPeak,
    crossed: state.crossed || logMPeak >= Math.log(1 / config.alpha) - LN_TWO_SIDED_EPS,
    meanScore: state.meanScore + (s - state.meanScore) / rounds,
  };
}

interface StratumCounts {
  readonly candidateWins: number;
  readonly candidateRounds: number;
  readonly baselineWins: number;
  readonly baselineRounds: number;
}

export interface ShiftEProcessState {
  readonly rounds: number;
  readonly logM: number;
  readonly logMPeak: number;
  readonly crossed: boolean;
  /** Laplace(1,1) success/trial counts per arm, keyed by stratum id. */
  readonly strata: Readonly<Record<string, StratumCounts>>;
}

export interface ShiftRound {
  readonly publishedCandidate: boolean;
  readonly pi: number;
  readonly outcome: 0 | 1;
  /**
   * Stratum id: a bucket of the CANDIDATE forecast (which is computed every
   * round, whichever arm publishes). Stratifying is load-bearing — see the
   * module header — and the bucketing rule must be fixed before outcomes.
   */
  readonly stratum: string;
}

const EMPTY_STRATUM: StratumCounts = {
  candidateWins: 0,
  candidateRounds: 0,
  baselineWins: 0,
  baselineRounds: 0,
};

export function initShiftEProcess(): ShiftEProcessState {
  return { rounds: 0, logM: 0, logMPeak: 0, crossed: false, strata: {} };
}

/**
 * One round of the SHIFT (performativity-presence) e-process at level alpha.
 * Validity needs no assumption on the estimates: within the round's stratum
 * the marginal is the known pi-mixture of the two arm predictors, which makes
 * each factor an exact e-value under Y independent-of-Z given the stratum
 * (see header derivation).
 */
export function updateShiftEProcess(
  state: ShiftEProcessState,
  round: ShiftRound,
  alpha: number
): ShiftEProcessState {
  if (!(alpha > 0) || alpha >= 1) {
    throw new RangeError(`alpha must lie in (0,1), got ${alpha}`);
  }
  assertPi(round.pi);
  const counts = state.strata[round.stratum] ?? EMPTY_STRATUM;
  // Predictable Beta(1,1)-posterior-mean estimates, from PAST rounds only.
  const p1 = (counts.candidateWins + 1) / (counts.candidateRounds + 2);
  const p0 = (counts.baselineWins + 1) / (counts.baselineRounds + 2);
  const y = round.outcome;
  const armProb = round.publishedCandidate
    ? y === 1 ? p1 : 1 - p1
    : y === 1 ? p0 : 1 - p0;
  const mixtureProb =
    round.pi * (y === 1 ? p1 : 1 - p1) + (1 - round.pi) * (y === 1 ? p0 : 1 - p0);
  const logM = state.logM + Math.log(armProb / mixtureProb);
  const logMPeak = Math.max(state.logMPeak, logM);
  const updated: StratumCounts = {
    candidateWins: counts.candidateWins + (round.publishedCandidate ? y : 0),
    candidateRounds: counts.candidateRounds + (round.publishedCandidate ? 1 : 0),
    baselineWins: counts.baselineWins + (round.publishedCandidate ? 0 : y),
    baselineRounds: counts.baselineRounds + (round.publishedCandidate ? 0 : 1),
  };
  return {
    rounds: state.rounds + 1,
    logM,
    logMPeak,
    crossed: state.crossed || logMPeak >= Math.log(1 / alpha) - LN_TWO_SIDED_EPS,
    strata: { ...state.strata, [round.stratum]: updated },
  };
}

function assertPi(pi: number): void {
  if (!Number.isFinite(pi) || pi <= 0 || pi >= 1) {
    throw new RangeError(`pi must lie strictly inside (0,1), got ${pi}`);
  }
}
