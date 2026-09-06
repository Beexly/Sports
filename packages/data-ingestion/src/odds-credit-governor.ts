/**
 * The Odds API credit governor (C-109, WP-30). PURE: no I/O, no env, no clock.
 *
 * Why: the 20K-credits-a-month plan was burning about 320 credits an hour on
 * 2026-09-06 (645 a day is the whole budget), because refresh-odds fetched
 * every supported sport four times an hour and settle-picks fetched paid
 * scores for every sport five times an hour although the free path covered
 * them. This module decides, from durable observations the caller supplies,
 * whether one paid call may go out right now. The callers (settle-sport,
 * refresh-odds) persist the observations; the truth surface reads them.
 *
 * Reserve rule: hold paid calls when remaining / hoursToMonthEnd(now) drops
 * below DAILY_BUDGET / 24, except that a sport with an event within the next
 * 48 hours may still make ONE odds call an hour, so the board never goes fully
 * dark while credits remain. Paid scores are always capped at one call per
 * sport per hour; the caller only asks when the free path left NO_FINAL picks.
 *
 * Nothing here touches MIN_BOOKMAKERS, a gate, or a cron schedule.
 */

/** Plan size the founder holds (no tier change). */
export const MONTHLY_CREDITS = 20000;
/** Target steady-state spend per UTC day (20000 over a month with margin). */
export const DAILY_BUDGET = 600;
/** Reserve pace floor: below this many credits per remaining hour we hold. */
export const HOURLY_BUDGET = DAILY_BUDGET / 24;
/** A sport counts as live for odds when it has an event this far ahead. */
export const EVENT_HORIZON_HOURS = 48;
/** One paid call per sport per hour under the per-sport cap. */
export const PAID_CALL_MIN_INTERVAL_MS = 60 * 60 * 1000;

export type PaidCallPurpose = "odds" | "scores";

export interface PaidCallDecisionInput {
  /** Latest observed x-requests-remaining; null when never observed. */
  readonly remaining: number | null;
  readonly now: Date;
  readonly purpose: PaidCallPurpose;
  /**
   * Free scoreboard says the sport has an event within EVENT_HORIZON_HOURS.
   * null means the scoreboard could not be read: never a reason to skip.
   */
  readonly hasEventWithin48h: boolean | null;
  /** A cleared free source covers this purpose for this sport right now. */
  readonly freeCoversPurpose: boolean;
  /** Latest paid call for this sport and purpose (durable); null when none. */
  readonly lastPaidCallAt?: Date | null;
  /**
   * Latest paid call for this sport across EVERY purpose (odds and scores).
   * Consulted only by the stale-zero probe rule, so at most ONE probe per
   * sport per hour fires across purposes (an odds probe and a scores probe
   * used to be able to fire in the same hour). Omitted: falls back to
   * `lastPaidCallAt`.
   */
  readonly lastPaidCallAnyPurposeAt?: Date | null;
  /**
   * ISO timestamp of the observation that produced `remaining`; null or
   * missing when unknown. Only consulted when `remaining` reads zero: a zero
   * older than PAID_CALL_MIN_INTERVAL_MS, or dated before the current UTC
   * month, is stale (the vendor may have reset the quota, or one header-less
   * response parsed as 0), so one probe call per sport per hour is allowed
   * to re-observe the real count instead of holding forever.
   */
  readonly observedAt?: string | null;
}

export interface PaidCallDecision {
  readonly allow: boolean;
  readonly reason: string;
}

/** Whole hours (fractional) from `now` to the first instant of next UTC month. */
export function hoursToMonthEnd(now: Date): number {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const hours = (end - now.getTime()) / 3_600_000;
  // Never divide by zero at the boundary: the last minute still counts as one.
  return Math.max(hours, 1 / 60);
}

/** True when the remaining credits can fund HOURLY_BUDGET until month end. */
export function reservePaceOk(remaining: number, now: Date): boolean {
  return remaining / hoursToMonthEnd(now) >= HOURLY_BUDGET;
}

function calledWithinInterval(lastPaidCallAt: Date | null | undefined, now: Date): boolean {
  if (!lastPaidCallAt) return false;
  const age = now.getTime() - lastPaidCallAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < PAID_CALL_MIN_INTERVAL_MS;
}

/**
 * A zero-credit reading is stale when it is at least PAID_CALL_MIN_INTERVAL_MS
 * old, was taken in an earlier UTC month than `now`, or carries no usable
 * timestamp (an unverifiable zero must not hold the board forever).
 */
export function zeroObservationIsStale(observedAt: string | null | undefined, now: Date): boolean {
  if (!observedAt) return true;
  const t = Date.parse(observedAt);
  if (!Number.isFinite(t)) return true;
  if (t < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) return true;
  return now.getTime() - t >= PAID_CALL_MIN_INTERVAL_MS;
}

/** Every purpose the ledger tracks (the cross-purpose probe cap reads them all). */
export const PAID_CALL_PURPOSES: readonly PaidCallPurpose[] = ["odds", "scores"];

/**
 * Which hourly slot an ALLOWED call must reserve (atomically, in the ledger)
 * before it spends:
 *   - "none":        no hourly rule binds (odds while the pace funds the budget);
 *                    the marker is still recorded, for the audit trail and for
 *                    reserve mode later, but never gates the call;
 *   - "purpose":     one call per sport per hour within this purpose (scores
 *                    always; odds in reserve mode);
 *   - "any-purpose": one probe per sport per hour across every purpose (the
 *                    stale-zero probe).
 */
export type HourlySlot = "none" | "purpose" | "any-purpose";

export interface PaidCallEvaluation {
  readonly decision: PaidCallDecision;
  /** Meaningful only when `decision.allow` is true. */
  readonly slot: HourlySlot;
}

/** Decide whether one paid call may go out now, and which hourly slot it needs. Pure. */
export function evaluatePaidOddsCall(input: PaidCallDecisionInput): PaidCallEvaluation {
  const { purpose, now } = input;
  const held = (reason: string): PaidCallEvaluation => ({ decision: { allow: false, reason }, slot: "none" });
  const allowed = (reason: string, slot: HourlySlot): PaidCallEvaluation => ({
    decision: { allow: true, reason },
    slot,
  });
  // Scores are capped at one call per sport per hour whatever the pace.
  const purposeSlot: HourlySlot = purpose === "scores" ? "purpose" : "none";

  if (input.freeCoversPurpose) {
    return held(`free source covers ${purpose}`);
  }
  if (purpose === "odds" && input.hasEventWithin48h === false) {
    return held(`no event within ${EVENT_HORIZON_HOURS}h on the free scoreboard`);
  }
  const calledThisHour = calledWithinInterval(input.lastPaidCallAt, now);
  if (purpose === "scores" && calledThisHour) {
    return held("paid scores already fetched for this sport within the hour");
  }
  const remaining = input.remaining;
  if (remaining === null || !Number.isFinite(remaining)) {
    return allowed("no observation yet", purposeSlot);
  }
  if (remaining <= 0) {
    // Self-healing: the ledger only gains a new reading from a paid call, so a
    // zero that is never re-probed would hold every caller past the vendor's
    // reset (or after one header-less response). A fresh zero holds; a stale
    // zero lets ONE probe per sport per hour, across purposes, re-observe the
    // real count.
    if (!zeroObservationIsStale(input.observedAt, now)) {
      return held("zero credits remaining");
    }
    const probedThisHour =
      calledThisHour || calledWithinInterval(input.lastPaidCallAnyPurposeAt, now);
    if (probedThisHour) {
      return held("zero credits remaining (stale reading) and this sport already probed this hour");
    }
    return allowed("probe: zero-credit observation is stale", "any-purpose");
  }
  const hours = hoursToMonthEnd(now);
  const pace = remaining / hours;
  if (pace >= HOURLY_BUDGET) {
    return allowed(
      `pace ok: ${remaining} credits over ${hours.toFixed(1)}h to month end ` +
        `(${pace.toFixed(1)}/h, floor ${HOURLY_BUDGET}/h)`,
      purposeSlot,
    );
  }
  if (calledThisHour) {
    return held(
      `reserve: ${remaining} credits over ${hours.toFixed(1)}h to month end ` +
        `(${pace.toFixed(1)}/h below ${HOURLY_BUDGET}/h) and this sport already made a ${purpose} call this hour`,
    );
  }
  return allowed(
    `reserve: ${remaining} credits over ${hours.toFixed(1)}h to month end ` +
      `(${pace.toFixed(1)}/h below ${HOURLY_BUDGET}/h); allowing one ${purpose} call per sport per hour`,
    "purpose",
  );
}

/** Decide whether one paid call may go out now. Pure. */
export function decidePaidOddsCall(input: PaidCallDecisionInput): PaidCallDecision {
  return evaluatePaidOddsCall(input).decision;
}

/** One durable reading of the vendor's quota headers. */
export interface OddsCreditObservation {
  /** x-requests-remaining */
  readonly remaining: number;
  /** x-requests-used; null when the caller only saw the remaining count. */
  readonly used: number | null;
  /** ISO timestamp of the paid call that produced the headers. */
  readonly observedAt: string;
  /** Which caller observed it, e.g. "settle-sport" or "refresh-odds". */
  readonly source: string;
}

/**
 * Linear projection of when credits reach zero, fitted on the FINAL monotonic
 * non-increasing run of the window: an upward step (the vendor's monthly reset,
 * or a counter correction) starts a new segment, so a reset never averages
 * against the pre-reset burn. Null when that segment holds fewer than two
 * observations, when they share a timestamp, or when the count did not fall.
 */
export function projectCreditExhaustion(
  observations: readonly OddsCreditObservation[],
  now: Date,
): string | null {
  const sorted = observations
    .map((o) => ({ ...o, t: Date.parse(o.observedAt) }))
    .filter((o) => Number.isFinite(o.t) && Number.isFinite(o.remaining))
    .sort((a, b) => a.t - b.t);
  let segmentStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.remaining > sorted[i - 1]!.remaining) segmentStart = i;
  }
  const rows = sorted.slice(segmentStart);
  if (rows.length < 2) return null;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const dt = last.t - first.t;
  if (dt <= 0) return null;
  const burnPerMs = (first.remaining - last.remaining) / dt;
  if (burnPerMs <= 0) return null;
  const msLeft = last.remaining / burnPerMs;
  if (!Number.isFinite(msLeft)) return null;
  // Anchor on the last observation, never before `now` (an already-exhausted
  // projection reads as "now").
  const at = Math.max(last.t + msLeft, now.getTime());
  return new Date(at).toISOString();
}

/** Truth-surface block under oddsInserting.dualPath.credits. */
export interface OddsCreditTruth {
  readonly remaining: number | null;
  readonly used: number | null;
  readonly observedAt: string | null;
  readonly dailyBudget: typeof DAILY_BUDGET;
  /** ISO, from the last 24h of observations; null with fewer than two. */
  readonly projectedExhaustionAt: string | null;
  /** Reserve pace holds at the latest observation; null when never observed. */
  readonly paceOk: boolean | null;
}

export function emptyOddsCreditTruth(): OddsCreditTruth {
  return {
    remaining: null,
    used: null,
    observedAt: null,
    dailyBudget: DAILY_BUDGET,
    projectedExhaustionAt: null,
    paceOk: null,
  };
}

/** Pure assembly of the truth block from the latest reading and the 24h window. */
export function buildOddsCreditTruth(input: {
  readonly latest: OddsCreditObservation | null;
  readonly last24h: readonly OddsCreditObservation[];
  readonly now: Date;
}): OddsCreditTruth {
  const { latest, now } = input;
  if (!latest) return emptyOddsCreditTruth();
  return {
    remaining: latest.remaining,
    used: latest.used,
    observedAt: latest.observedAt,
    dailyBudget: DAILY_BUDGET,
    projectedExhaustionAt: projectCreditExhaustion(input.last24h, now),
    paceOk: reservePaceOk(latest.remaining, now),
  };
}
