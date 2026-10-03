/**
 * Paid-run accounting shared by every caller that drives `processSport` with a
 * real The Odds API key (the `refreshOdds` loop behind the cron routes and
 * board-fill, and the long-running data-refresh worker), so the two paid
 * callers can never account differently (C-109).
 *
 * Deliberately free of runtime imports (types only): unit tests of the callers
 * can load the real helpers while stubbing the fetch and the governor factory.
 */

import type { PaidOddsGovernor } from "@sports/data-ingestion";
import type { ProcessSportResult } from "./process-sport.js";

/**
 * Below this many remaining The-Odds-API credits, a multi-sport caller stops
 * starting new sports in its cycle rather than risk exhausting the monthly
 * budget mid-loop. One more MARKETS.length-market/1-region call costs
 * MARKETS.length credits (3 today); this leaves real margin above that for
 * settle-picks' own getScores calls sharing the same key. Shared here so the
 * cron loop and the worker cut off at the same reading.
 */
export const ODDS_API_LOW_QUOTA_THRESHOLD = 10;

/**
 * True when a run's envelope carries a quota reading below
 * ODDS_API_LOW_QUOTA_THRESHOLD. A missing reading (null / absent) is never
 * low: a header-less response is not a zero.
 */
export function isLowQuota(res: Pick<ProcessSportResult, "oddsApiRemainingRequests">): boolean {
  return res.oddsApiRemainingRequests != null && res.oddsApiRemainingRequests < ODDS_API_LOW_QUOTA_THRESHOLD;
}

/**
 * Paid Odds API requests processSport made in one run, read defensively from
 * its envelope (`paidRequestCount`, on both the ok and the failed shapes;
 * absent on older envelopes). null when the envelope does not say.
 */
export function paidRequestCountOf(res: ProcessSportResult): number | null {
  if (!("paidRequestCount" in res)) return null;
  const raw: unknown = res.paidRequestCount;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : null;
}

/**
 * Ledger accounting after one processSport run, on the ok AND the failed
 * envelope: a request that succeeded upstream but whose persistence failed
 * still spent a credit and still reported x-requests-remaining. One marker per
 * paid request (`paidRequestCount` counts every request the run made, a
 * preseason leg or a Pinnacle archive request included; absent, one paid
 * response means one request), then the one quota reading the run observed,
 * with x-requests-used alongside it when the run saw that header.
 *
 * `reserved` (default true) says whether the governor's own decide() reserved
 * the slot and wrote the FIRST request's marker before the fetch, in which
 * case only the additional requests are marked here. When the governor was
 * unavailable and the caller failed open (`governedDecision` reports
 * `reserved: false`), nothing is in the ledger for this run yet, so every
 * paid request is marked here, the first included. Never throws: a governor
 * that rejects OR throws synchronously is swallowed.
 */
export async function recordPaidRunAccounting(
  governor: PaidOddsGovernor,
  sportKey: string,
  res: ProcessSportResult,
  opts: { readonly reserved: boolean } = { reserved: true },
): Promise<void> {
  const paidResponse = res.oddsApiRemainingRequests != null;
  const paidRequests = paidRequestCountOf(res) ?? (paidResponse ? 1 : 0);
  for (let i = opts.reserved ? 1 : 0; i < paidRequests; i++) {
    try {
      await governor.recordCall(sportKey, new Date());
    } catch {
      // A ledger outage removes the pacing signal; it never fails the run.
    }
  }
  if (res.oddsApiRemainingRequests != null) {
    try {
      await governor.recordCredits({
        remaining: res.oddsApiRemainingRequests,
        used: res.oddsApiUsedRequests ?? null,
        observedAt: new Date(),
      });
    } catch {
      // Same: the reading is lost for this run, the run is not.
    }
  }
}

export interface GovernedDecision {
  readonly allow: boolean;
  /**
   * True when the governor itself answered allow: its decide() has reserved
   * this sport's hourly slot and written the first paid request's marker.
   * False when the governor was unavailable and the caller proceeds
   * unpaced: nothing is in the ledger for this run yet, so
   * `recordPaidRunAccounting` must mark the first request too.
   */
  readonly reserved: boolean;
  readonly reason: string;
}

/**
 * Ask the governor whether this sport's paid fetch may go out. The governor
 * fails open: a ledger or scoreboard outage must never blank the board, so a
 * decide() that throws reads as allow with the error in the reason and
 * `reserved: false`.
 */
export async function governedDecision(
  governor: PaidOddsGovernor,
  sportKey: string,
): Promise<GovernedDecision> {
  try {
    const decision = await governor.decide(sportKey);
    return { allow: decision.allow, reserved: decision.allow, reason: decision.reason };
  } catch (govErr) {
    return {
      allow: true,
      reserved: false,
      reason: `governor unavailable, proceeding: ${govErr instanceof Error ? govErr.message : String(govErr)}`,
    };
  }
}
