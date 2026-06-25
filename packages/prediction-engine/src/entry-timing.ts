/**
 * CLV-optimal entry timing — the decision core that turns a closing-line forecast
 * into an action: lock the bet now, or wait for a better number?
 *
 * The closing line is the market's most efficient estimate, so CLV (closing-line
 * value) is the sharpest leading indicator of edge. A forecaster predicts where the
 * line will close; this rule decides WHEN to enter so that expected CLV is maximized
 * without speculating into the noise.
 *
 * Convention: `lockNowClv` is the CLV we would bank by locking at the current price,
 * measured against the predicted close, already adjusted for our side so that
 * POSITIVE = the current number is better than where the line is expected to close
 * (good — lock it in), NEGATIVE = the line is expected to move in our favor (we'd get
 * a better number by waiting). Units are whatever the market uses (points for
 * spread/total, implied-probability for moneyline) — the rule is unit-agnostic.
 *
 * The rule is deliberately biased toward LOCK_NOW: a thin or uncertain forecast must
 * never justify speculative waiting, and a hard latency floor forbids waiting into the
 * final minutes where a forecast cannot be acted on before the line corrects. Pure,
 * deterministic, no I/O — every entry decision is replayable.
 */

export type EntryDecision = "LOCK_NOW" | "WAIT";

export type EntryReason =
  /** Too little time remains to act on a forecast before the line corrects. */
  | "latency-floor"
  /** The current number already beats the expected close beyond the forecast noise. */
  | "now-beats-close"
  /** The line is expected to move toward us by more than noise + transaction costs. */
  | "wait-for-favorable-move"
  /** Forecast is too thin/uncertain to justify waiting — default to locking. */
  | "default-lock";

export interface EntryTimingInput {
  /**
   * Side-adjusted CLV banked by locking at the current price vs the predicted close.
   * Positive = current number better than the close (lock it); negative = the line is
   * expected to move our way (waiting would improve the entry).
   */
  readonly lockNowClv: number;
  /** Forecast standard error (σ ≥ 0) — the noise band around the predicted close. */
  readonly forecastStdErr: number;
  /** Hours until kickoff (≥ 0). */
  readonly timeToKickoffHours: number;
  /** Minimum hours of runway needed to act on a forecast. Default 0.25 (15 min). */
  readonly minActWindowHours?: number;
  /**
   * Extra cushion (≥ 0) the expected gain from waiting must clear, covering line-shopping
   * friction and the risk the move reverses. Default 0.
   */
  readonly transactionMargin?: number;
}

export interface EntryTimingDecision {
  readonly decision: EntryDecision;
  readonly reason: EntryReason;
  /** Expected CLV improvement from waiting (= −lockNowClv); positive = waiting looks favorable. */
  readonly expectedClvGainFromWaiting: number;
  /** The bar the expected gain must clear to justify waiting: forecastStdErr + transactionMargin. */
  readonly waitBar: number;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite number ≥ 0, got ${String(value)}`);
  }
}

/**
 * Decide whether to lock a bet now or wait for a better number, given a closing-line
 * forecast. See the module header for the `lockNowClv` sign convention.
 *
 * Decision order:
 *  1. If runway < minActWindow → LOCK_NOW (a forecast we can't act on is worthless).
 *  2. If lockNowClv ≥ forecastStdErr → LOCK_NOW (now beats the close beyond the noise).
 *  3. If the expected gain from waiting (−lockNowClv) > forecastStdErr + transactionMargin
 *     → WAIT (the line is expected to move our way beyond noise and costs).
 *  4. Otherwise → LOCK_NOW (thin/uncertain forecast — never speculate).
 */
export function decideEntryTiming(input: EntryTimingInput): EntryTimingDecision {
  const { lockNowClv } = input;
  if (!Number.isFinite(lockNowClv)) {
    throw new RangeError(`lockNowClv must be a finite number, got ${String(lockNowClv)}`);
  }
  assertNonNegative(input.forecastStdErr, "forecastStdErr");
  assertNonNegative(input.timeToKickoffHours, "timeToKickoffHours");
  const minActWindowHours = input.minActWindowHours ?? 0.25;
  const transactionMargin = input.transactionMargin ?? 0;
  assertNonNegative(minActWindowHours, "minActWindowHours");
  assertNonNegative(transactionMargin, "transactionMargin");

  const expectedClvGainFromWaiting = -lockNowClv;
  const waitBar = input.forecastStdErr + transactionMargin;

  if (input.timeToKickoffHours < minActWindowHours) {
    return { decision: "LOCK_NOW", reason: "latency-floor", expectedClvGainFromWaiting, waitBar };
  }
  if (lockNowClv >= input.forecastStdErr) {
    return { decision: "LOCK_NOW", reason: "now-beats-close", expectedClvGainFromWaiting, waitBar };
  }
  if (expectedClvGainFromWaiting > waitBar) {
    return {
      decision: "WAIT",
      reason: "wait-for-favorable-move",
      expectedClvGainFromWaiting,
      waitBar,
    };
  }
  return { decision: "LOCK_NOW", reason: "default-lock", expectedClvGainFromWaiting, waitBar };
}
