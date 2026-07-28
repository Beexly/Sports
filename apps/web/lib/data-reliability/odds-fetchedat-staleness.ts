/**
 * Odds fetchedAt staleness classification + alert decision.
 *
 * Aligns with refresh-sla WARN 120m / STALE 240m and the board gate's
 * MAX_CANDIDATE_ODDS_AGE_MS = 6h. Does NOT widen the 6h gate.
 */

export const FETCHEDAT_WARN_AFTER_MINUTES = 120;
export const FETCHEDAT_STALE_AFTER_MINUTES = 240;
/** Gate budget — candidates fail "fresh odds" beyond this */
export const FETCHEDAT_GATE_BUDGET_MINUTES = 360;

export type FetchedAtStatus =
  | "ok"
  | "warn"
  | "stale"
  | "gate_breach"
  | "unknown";

export interface FetchedAtFreshness {
  maxFetchedAt: Date | null;
  ageMinutes: number | null;
  status: FetchedAtStatus;
  /** true → page / Healthchecks /fail on dedicated check */
  shouldAlert: boolean;
  summary: string;
}

export function classifyOddsFetchedAt(
  maxFetchedAt: Date | null,
  now: Date = new Date(),
): FetchedAtFreshness {
  if (maxFetchedAt === null) {
    return {
      maxFetchedAt: null,
      ageMinutes: null,
      status: "unknown",
      shouldAlert: true,
      summary: "No odds.fetchedAt rows — cannot prove quote freshness",
    };
  }

  const ageMinutesExact =
    (now.getTime() - maxFetchedAt.getTime()) / 60_000;
  const ageMinutes = Math.round(ageMinutesExact);

  if (ageMinutesExact > FETCHEDAT_GATE_BUDGET_MINUTES) {
    return {
      maxFetchedAt,
      ageMinutes,
      status: "gate_breach",
      shouldAlert: true,
      summary: `max fetchedAt age ${ageMinutes}m exceeds 6h gate budget — pending will fail fresh-odds`,
    };
  }
  if (ageMinutesExact > FETCHEDAT_STALE_AFTER_MINUTES) {
    return {
      maxFetchedAt,
      ageMinutes,
      status: "stale",
      shouldAlert: true,
      summary: `max fetchedAt age ${ageMinutes}m exceeds STALE (${FETCHEDAT_STALE_AFTER_MINUTES}m)`,
    };
  }
  if (ageMinutesExact > FETCHEDAT_WARN_AFTER_MINUTES) {
    return {
      maxFetchedAt,
      ageMinutes,
      status: "warn",
      shouldAlert: false,
      summary: `max fetchedAt age ${ageMinutes}m exceeds WARN (${FETCHEDAT_WARN_AFTER_MINUTES}m)`,
    };
  }
  return {
    maxFetchedAt,
    ageMinutes,
    status: "ok",
    shouldAlert: false,
    summary: `max fetchedAt age ${ageMinutes}m within SLA`,
  };
}
