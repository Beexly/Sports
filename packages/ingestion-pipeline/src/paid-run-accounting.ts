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
 * paid request (the governor's reservation covered the first; `paidRequestCount`
 * counts every request the run made, a preseason leg or a Pinnacle archive
 * request included; absent, one paid response means one request), then the one
 * quota reading the run observed. Never throws.
 */
export async function recordPaidRunAccounting(
  governor: PaidOddsGovernor,
  sportKey: string,
  res: ProcessSportResult,
): Promise<void> {
  const paidResponse = res.oddsApiRemainingRequests != null;
  const paidRequests = paidRequestCountOf(res) ?? (paidResponse ? 1 : 0);
  for (let i = 1; i < paidRequests; i++) {
    await governor.recordCall(sportKey, new Date()).catch(() => undefined);
  }
  if (res.oddsApiRemainingRequests != null) {
    await governor
      .recordCredits({ remaining: res.oddsApiRemainingRequests, observedAt: new Date() })
      .catch(() => undefined);
  }
}

/**
 * Ask the governor whether this sport's paid fetch may go out. The governor
 * fails open: a ledger or scoreboard outage must never blank the board, so a
 * decide() that throws reads as allow with the error in the reason.
 */
export async function governedDecision(
  governor: PaidOddsGovernor,
  sportKey: string,
): Promise<{ readonly allow: boolean; readonly reason: string }> {
  try {
    return await governor.decide(sportKey);
  } catch (govErr) {
    return {
      allow: true,
      reason: `governor unavailable, proceeding: ${govErr instanceof Error ? govErr.message : String(govErr)}`,
    };
  }
}
