/**
 * OddsPapi credit governor. PURE: no I/O, no env, no clock.
 *
 * WHY: the free tier is 250 requests/month with flat per-request billing.
 * That is ~8/day — a poll loop would burn the month in an hour. This module
 * decides, from durable observations the caller supplies, whether one
 * billable call may go out right now. Historical line movement is the whole
 * point of this integration and /historical-odds is UNMETERED, so the
 * governor routes volume there whenever possible and rations billable
 * calls (fixtures/odds/markets/settlements) to a monthly pace.
 *
 * Quota facts (CONFIRMED, official requests-and-quota doc, 2026-09-18):
 *   - /v4/historical-odds and /v4/account do NOT increment request usage.
 *   - /account stays available after exhaustion; every other endpoint 429s.
 *   - After the plan limit is reached, ALL endpoints (billable or "free")
 *     are blocked with 429 except /account. "Unmetered" != "usable after
 *     exhaustion". Hence even the historical purpose holds on exhaustion.
 *   - Billable errors (4xx/5xx processed by a billable endpoint) count.
 *   - Rejected-before-processing calls (invalid key, already exhausted) do not.
 *
 * BILLING CYCLE NOTE: unlike The Odds API (documented 1st-of-month reset),
 * OddsPapi does not publicly document its monthly reset cadence — it is
 * UNVERIFIED. The governor paces against the CURRENT CALENDAR MONTH as an
 * assumption (flagged); if live /account readings ever contradict it, the
 * observedAt staleness rule below self-heals. Do not harden this into a
 * contract.
 *
 * Nothing here touches MIN_BOOKMAKERS, a gate, or a cron schedule.
 */

export const ODDSPAPI_MONTHLY_CREDITS = 250;
/** Target steady-state spend per UTC day (250 over a ~30-day month). */
export const ODDSPAPI_DAILY_BUDGET = 8;
/** Reserve pace floor: below this many credits per remaining hour we ration. */
export const ODDSPAPI_HOURLY_BUDGET = ODDSPAPI_DAILY_BUDGET / 24;
/** One billable call per purpose-slot per interval while rationing. */
export const ODDSPAPI_BILLABLE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type OddsPapiCallPurpose = "billable" | "historical";

export interface OddsPapiCallDecisionInput {
  readonly purpose: OddsPapiCallPurpose;
  /** Latest observed request_count-vs-limit headroom; null when never observed. */
  readonly remaining: number | null;
  readonly now: Date;
  /**
   * Latest billable call timestamp (durable); null when none. Only gates the
   * billable purpose while rationing.
   */
  readonly lastBillableCallAt?: Date | null;
  /**
   * ISO timestamp of the observation that produced `remaining`; null when
   * unknown. A zero observed in an earlier UTC month (or with no usable
   * timestamp) is stale — the vendor may have reset — so one unmetered
   * /account probe may go out to re-observe. /account is unmetered and stays
   * available after exhaustion, so probing it never burns quota.
   */
  readonly observedAt?: string | null;
}

export interface OddsPapiCallDecision {
  readonly allow: boolean;
  readonly reason: string;
}

/**
 * Whole hours (fractional) from `now` to the first instant of next UTC month.
 * See BILLING CYCLE NOTE above: calendar month is an ASSUMED cycle for
 * OddsPapi, not a documented contract.
 */
export function hoursToOddsPapiMonthEnd(now: Date): number {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const hours = (end - now.getTime()) / 3_600_000;
  return Math.max(hours, 1 / 60);
}

/** True when the remaining credits fund ODDSPAPI_HOURLY_BUDGET until month end. */
export function oddsPapiReservePaceOk(remaining: number, now: Date): boolean {
  return remaining / hoursToOddsPapiMonthEnd(now) >= ODDSPAPI_HOURLY_BUDGET;
}

function calledWithinInterval(
  lastCallAt: Date | null | undefined,
  now: Date,
  intervalMs: number,
): boolean {
  if (!lastCallAt) return false;
  const age = now.getTime() - lastCallAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < intervalMs;
}

/**
 * A zero-credit reading is stale when it is older than the ration interval,
 * was taken in an earlier UTC month than `now`, or carries no usable
 * timestamp. A fresh zero holds; a stale zero lets one unmetered /account
 * probe re-observe the real count.
 */
export function oddsPapiZeroObservationIsStale(
  observedAt: string | null | undefined,
  now: Date,
): boolean {
  if (!observedAt) return true;
  const t = Date.parse(observedAt);
  if (!Number.isFinite(t)) return true;
  if (t < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) return true;
  return now.getTime() - t >= ODDSPAPI_BILLABLE_MIN_INTERVAL_MS;
}

/** Decide whether one OddsPapi call may go out now. Pure. */
export function decideOddsPapiCall(
  input: OddsPapiCallDecisionInput,
): OddsPapiCallDecision {
  const { purpose, now, remaining } = input;
  const held = (reason: string): OddsPapiCallDecision => ({ allow: false, reason });
  const allowed = (reason: string): OddsPapiCallDecision => ({ allow: true, reason });

  // Exhaustion blocks EVERYTHING except /account (unmetered and exempt).
  // Historical is unmetered but the vendor 429s it post-exhaustion, so a
  // historical call would just be rejected — never send it.
  if (remaining !== null && Number.isFinite(remaining) && remaining <= 0) {
    if (oddsPapiZeroObservationIsStale(input.observedAt, now)) {
      return allowed("stale zero: unmetered /account probe may re-observe");
    }
    return held("quota exhausted — vendor blocks all endpoints except /account");
  }

  if (purpose === "historical") {
    // Unmetered, 5000ms vendor cooldown enforced client-side. Always allowed
    // when the plan is not exhausted.
    return allowed("unmetered endpoint, plan not exhausted");
  }

  // Billable purpose: pace against the month.
  if (remaining === null || !Number.isFinite(remaining)) {
    return allowed("no observation yet — /account is unmetered, observe freely");
  }
  const hours = hoursToOddsPapiMonthEnd(now);
  const pace = remaining / hours;
  if (pace >= ODDSPAPI_HOURLY_BUDGET) {
    return allowed(
      `pace ok: ${remaining} credits over ${hours.toFixed(1)}h to month end ` +
        `(${pace.toFixed(3)}/h, floor ${ODDSPAPI_HOURLY_BUDGET.toFixed(3)}/h)`,
    );
  }
  if (
    calledWithinInterval(input.lastBillableCallAt, now, ODDSPAPI_BILLABLE_MIN_INTERVAL_MS)
  ) {
    return held(
      `reserve: ${remaining} credits over ${hours.toFixed(1)}h ` +
        `(${pace.toFixed(3)}/h below ${ODDSPAPI_HOURLY_BUDGET.toFixed(3)}/h) and a billable call went out within the interval`,
    );
  }
  return allowed(
    `reserve: ${remaining} credits over ${hours.toFixed(1)}h ` +
      `(${pace.toFixed(3)}/h below floor) — allowing one billable call per interval`,
  );
}
