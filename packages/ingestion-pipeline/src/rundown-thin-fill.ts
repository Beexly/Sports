/**
 * Rundown thin-fill admission — who may spend a TheRundown call, and when.
 *
 * TheRundown's free tier is 20k data-points a day and it is the ONLY registered
 * commercial-use fallback that can supply a second book. Production logs on
 * 2026-09-05 show every refresh cycle for all four in-season sports answering
 * `rundown empty (2d): HTTP 429 rate_limited`: our own cadence (refresh-odds
 * every 15 minutes plus board-fill four times an hour, four sports, two dates,
 * no back-off after a 429) burns the quota early and the feed is gone for the
 * rest of the day — including through NFL kickoff, which is the slate that
 * actually needs it.
 *
 * This module is the rationing. Three rules, all pure except the cooldown clock:
 *   1. Only NFL and NCAAF thin-fill. Those are the boards where the second book
 *      decides whether a MONEYLINE or TOTAL publishes at all.
 *   2. Only when that sport has a THIN fixture inside the board window — a
 *      slate that is already covered, already played, or not yet in range is
 *      not worth a data point.
 *   3. After a 429, that sport is skipped for 30 minutes. In-process only: the
 *      cooldown is a courtesy back-off for a long-lived worker, not a
 *      distributed lock, and it must never be mistaken for one.
 *
 * No I/O, no env, no key. The clock is injectable so tests do not sleep.
 */

import type { OddsApiEvent } from "@sports/types";

/**
 * Sports whose board may spend a Rundown thin-fill call.
 *
 * NFL and NCAAF only (founder priority, ledger C-278a): the production truth
 * surface reads MONEYLINE 0 and TOTAL 0 on the NFL games inside the 72-hour
 * window because ESPN is one book and MIN_BOOKMAKERS is 2. Widening this set
 * spends the same finite quota on boards that are not blocking launch.
 */
export const RUNDOWN_THIN_FILL_SPORT_KEYS: ReadonlySet<string> = new Set([
  "americanfootball_nfl",
  "americanfootball_ncaaf",
]);

/** Board window a thin fixture must fall inside to be worth a call. */
export const RUNDOWN_THIN_FILL_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * A game that has already kicked off is still worth pricing for a short while
 * (settlement and live line movement read it), but a finished one is not.
 */
export const RUNDOWN_THIN_FILL_IN_PLAY_GRACE_MS = 6 * 60 * 60 * 1000;

/** How long a sport sits out after the free tier answers 429. */
export const RUNDOWN_RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

export function isRundownThinFillSport(sportKey: string): boolean {
  return RUNDOWN_THIN_FILL_SPORT_KEYS.has(sportKey);
}

function commenceMs(event: OddsApiEvent): number {
  const t = new Date(event.commence_time).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Is this event inside the board window — kicking off within
 * RUNDOWN_THIN_FILL_WINDOW_MS, or in play within the grace behind us?
 *
 * An unparseable commence_time is NOT in the window. Spending a rationed data
 * point on a row we cannot place in time is the same mistake as pricing it.
 */
export function isInThinFillWindow(event: OddsApiEvent, now: number): boolean {
  const t = commenceMs(event);
  if (!Number.isFinite(t)) return false;
  return t >= now - RUNDOWN_THIN_FILL_IN_PLAY_GRACE_MS && t <= now + RUNDOWN_THIN_FILL_WINDOW_MS;
}

/**
 * The thin events (already filtered to under MIN_BOOKMAKERS by the caller)
 * that sit inside the board window. Empty means: do not call.
 */
export function thinFillCandidates(
  thinEvents: readonly OddsApiEvent[],
  now: number,
): OddsApiEvent[] {
  return thinEvents.filter((event) => isInThinFillWindow(event, now));
}

/**
 * In-process 429 cooldown, keyed by sport.
 *
 * Module-level state on purpose: the data-refresh worker and the cron route
 * each run one process per cycle, and the cheapest correct back-off is "this
 * process does not ask again for 30 minutes". A restart clears it, which is
 * acceptable — the cost of one extra 429 is one refused request, not a charge.
 */
const cooldownUntilBySport = new Map<string, number>();

/** Milliseconds left on this sport's cooldown; 0 when it may call. */
export function rundownCooldownRemainingMs(sportKey: string, now: number = Date.now()): number {
  const until = cooldownUntilBySport.get(sportKey);
  if (until == null) return 0;
  if (until <= now) {
    cooldownUntilBySport.delete(sportKey);
    return 0;
  }
  return until - now;
}

export function isRundownCoolingDown(sportKey: string, now: number = Date.now()): boolean {
  return rundownCooldownRemainingMs(sportKey, now) > 0;
}

/**
 * Open (or extend) the cooldown after a 429. Returns the resume instant so the
 * caller can log it — the log line carries a time, never a key.
 */
export function openRundownCooldown(sportKey: string, now: number = Date.now()): Date {
  const until = now + RUNDOWN_RATE_LIMIT_COOLDOWN_MS;
  const existing = cooldownUntilBySport.get(sportKey) ?? 0;
  const resumeAt = Math.max(existing, until);
  cooldownUntilBySport.set(sportKey, resumeAt);
  return new Date(resumeAt);
}

/** Test seam only. Never called from the pipeline. */
export function resetRundownCooldowns(): void {
  cooldownUntilBySport.clear();
}
