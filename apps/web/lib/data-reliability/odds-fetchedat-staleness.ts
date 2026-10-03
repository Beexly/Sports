/**
 * Odds fetchedAt classification — ops SLA (global_max) + per-candidate gate age.
 *
 * global MAX(fetchedAt) must NEVER be treated as "gate clear".
 * Per-candidate age vs 6h is what Phase C "fresh odds" measures.
 * Does NOT widen 6h. Does NOT enable LIVE_BOARD.
 */

import { MAX_CANDIDATE_ODDS_AGE_MS } from "../board/load-gate-slate.js";

export const FETCHEDAT_WARN_AFTER_MINUTES = 120;
export const FETCHEDAT_STALE_AFTER_MINUTES = 240;

/**
 * DERIVED from the gate's own MAX_CANDIDATE_ODDS_AGE_MS, not re-declared as a
 * literal 360.
 *
 * The 6h candidate-odds budget is a protected constant: widening it is the
 * documented way this product would start publishing decisions on quotes it
 * cannot stand behind. A second hardcoded copy is how that widening happens by
 * accident — someone retunes the real gate, this monitor keeps classifying
 * against the old number, and the ops surface then reports "within gate
 * budget" for candidates the gate itself is rejecting. The monitor would be
 * confidently wrong in the one direction that matters.
 *
 * Deriving it means the two can never disagree.
 */
export const FETCHEDAT_GATE_BUDGET_MINUTES = MAX_CANDIDATE_ODDS_AGE_MS / 60_000;

export type GlobalFetchedAtStatus =
  | "ok"
  | "warn"
  | "stale"
  | "gate_budget_exceeded"
  | "unknown";

export type CandidateFreshnessStatus = "fresh" | "stale" | "missing";

export interface GlobalFetchedAtFreshness {
  readonly scope: "global_max";
  maxFetchedAt: Date | null;
  ageMinutes: number | null;
  status: GlobalFetchedAtStatus;
  shouldAlert: boolean;
  summary: string;
}

export interface CandidateOddsFreshness {
  readonly scope: "candidate";
  fetchedAt: Date | null;
  ageMinutes: number | null;
  status: CandidateFreshnessStatus;
  withinGateBudget: boolean;
  summary: string;
}

export function classifyGlobalMaxFetchedAt(
  maxFetchedAt: Date | null,
  now: Date = new Date(),
): GlobalFetchedAtFreshness {
  if (maxFetchedAt === null) {
    return {
      scope: "global_max",
      maxFetchedAt: null,
      ageMinutes: null,
      status: "unknown",
      shouldAlert: true,
      summary:
        "No odds.fetchedAt rows (global_max) — cannot prove any quote refresh",
    };
  }

  const ageMinutesExact =
    (now.getTime() - maxFetchedAt.getTime()) / 60_000;
  const ageMinutes = Math.round(ageMinutesExact);

  if (ageMinutesExact > FETCHEDAT_GATE_BUDGET_MINUTES) {
    return {
      scope: "global_max",
      maxFetchedAt,
      ageMinutes,
      status: "gate_budget_exceeded",
      shouldAlert: true,
      summary: `global_max fetchedAt age ${ageMinutes}m exceeds 6h (ops alert; still check per-candidate ages)`,
    };
  }
  if (ageMinutesExact > FETCHEDAT_STALE_AFTER_MINUTES) {
    return {
      scope: "global_max",
      maxFetchedAt,
      ageMinutes,
      status: "stale",
      shouldAlert: true,
      summary: `global_max fetchedAt age ${ageMinutes}m exceeds STALE (${FETCHEDAT_STALE_AFTER_MINUTES}m)`,
    };
  }
  if (ageMinutesExact > FETCHEDAT_WARN_AFTER_MINUTES) {
    return {
      scope: "global_max",
      maxFetchedAt,
      ageMinutes,
      status: "warn",
      shouldAlert: false,
      summary: `global_max fetchedAt age ${ageMinutes}m exceeds WARN (${FETCHEDAT_WARN_AFTER_MINUTES}m)`,
    };
  }
  return {
    scope: "global_max",
    maxFetchedAt,
    ageMinutes,
    status: "ok",
    shouldAlert: false,
    summary: `global_max fetchedAt age ${ageMinutes}m within ops SLA (not a per-candidate gate clearance)`,
  };
}

/** @deprecated prefer classifyGlobalMaxFetchedAt */
export const classifyOddsFetchedAt = classifyGlobalMaxFetchedAt;

export function classifyCandidateOddsAge(
  fetchedAt: Date | null | undefined,
  now: Date = new Date(),
  maxAgeMinutes: number = FETCHEDAT_GATE_BUDGET_MINUTES,
): CandidateOddsFreshness {
  if (fetchedAt == null) {
    return {
      scope: "candidate",
      fetchedAt: null,
      ageMinutes: null,
      status: "missing",
      withinGateBudget: false,
      summary: "candidate has no fetchedAt",
    };
  }
  const ageMinutesExact = (now.getTime() - fetchedAt.getTime()) / 60_000;
  const ageMinutes = Math.round(ageMinutesExact);
  if (ageMinutesExact > maxAgeMinutes) {
    return {
      scope: "candidate",
      fetchedAt,
      ageMinutes,
      status: "stale",
      withinGateBudget: false,
      summary: `candidate odds age ${ageMinutes}m > ${maxAgeMinutes}m gate budget`,
    };
  }
  return {
    scope: "candidate",
    fetchedAt,
    ageMinutes,
    status: "fresh",
    withinGateBudget: true,
    summary: `candidate odds age ${ageMinutes}m within gate budget`,
  };
}

export function summarizeCandidateAges(
  ages: readonly CandidateOddsFreshness[],
): {
  total: number;
  fresh: number;
  stale: number;
  missing: number;
  staleRate: number;
} {
  let fresh = 0;
  let stale = 0;
  let missing = 0;
  for (const a of ages) {
    if (a.status === "fresh") fresh += 1;
    else if (a.status === "stale") stale += 1;
    else missing += 1;
  }
  const total = ages.length;
  return {
    total,
    fresh,
    stale,
    missing,
    staleRate: total ? stale / total : 0,
  };
}
