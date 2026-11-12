/**
 * Coaching staff evidence loader.
 *
 * Source: COACH_32_STAFF_PROFILES in
 * packages/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.ts
 * — the only structured staff table in the repo (verified by search
 * 2026-11-12; the xai audits and week-9 connected-workflow dossiers mention
 * coach names only in free-text prose, not as a staff table).
 *
 * Known defects this loader fixes:
 *  - The table is keyed "LA" and "WAS" while slates use "LAR" and "WSH".
 *    Every lookup resolves through canonicalTeamCode on BOTH the requested
 *    team and the table keys, so LA and LAR are the same staff record.
 *  - The slate pipeline fell back to Green Bay (home) / Carolina (away) on a
 *    failed lookup. This loader NEVER falls back: no row means
 *    missing("no staff record for <TEAM>"), not another team's staff.
 *
 * Field mapping:
 *  - headCoach <- headCoach (required; absent -> MISSING).
 *  - fourthDownAggression <- staffAggression, documented in the source as
 *    "Empirical 4th-and-short go rate" — a genuine fourth-down aggression
 *    measure, not a substitute.
 *  - offensiveCoordinator / defensiveCoordinator: the source carries NO
 *    coordinator names. CoachingRecord permits null for exactly this case;
 *    they ship as null (absent), never invented.
 *
 * asOf: the staff table is an undated constant. REAL evidence must carry the
 * instant the value describes, so the caller supplies opts.asOf (e.g. the
 * Tuesday staff-seal instant). Without it the loader returns MISSING rather
 * than inventing a timestamp.
 */

import type { CoachingRecord, Evidence } from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode, tryCanonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";
import { COACH_32_STAFF_PROFILES } from "@sports/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.js";

/**
 * The staff fields this loader reads. The built-in Coach32StaffProfile
 * satisfies this shape; tests may inject rows with coordinator names to
 * exercise the full record.
 */
export interface StaffProfileRow {
  readonly team?: string;
  readonly headCoach?: string;
  /** Empirical 4th-and-short go rate (source name for fourthDownAggression). */
  readonly staffAggression?: number;
  readonly fourthDownAggression?: number;
  readonly offensiveCoordinator?: string;
  readonly defensiveCoordinator?: string;
}

export interface CoachingOptions {
  /** Staff table override. Defaults to COACH_32_STAFF_PROFILES. */
  readonly staff?: Readonly<Record<string, StaffProfileRow>>;
  /** ISO-8601 UTC instant the staff table describes. Required to emit REAL. */
  readonly asOf?: string;
}

/** Stable source id for the staff table. */
export const COACHING_SOURCE = "coach-sim:COACH_32_STAFF_PROFILES";

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function finiteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Rows whose key resolves to the canonical code. "LA" -> LAR, "WAS" -> WSH.
 * Multiple matches are a conflict, never an arbitrary pick.
 */
function matchingRows<T>(
  table: Readonly<Record<string, T>>,
  code: string,
): Array<readonly [string, T]> {
  const out: Array<readonly [string, T]> = [];
  for (const [key, row] of Object.entries(table)) {
    if (tryCanonicalTeamCode(key) === code) out.push([key, row] as const);
  }
  return out;
}

export function loadCoaching(team: string, opts: CoachingOptions = {}): Evidence<CoachingRecord> {
  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${(err as Error).message}`, COACHING_SOURCE);
  }

  const table: Readonly<Record<string, StaffProfileRow>> = opts.staff ?? COACH_32_STAFF_PROFILES;
  const matches = matchingRows(table, code);
  const first = matches[0];
  if (matches.length === 0 || first === undefined) {
    // The old pipeline substituted GB/CAR here. Never again.
    return missing(`no staff record for ${code}`, COACHING_SOURCE);
  }
  if (matches.length > 1) {
    return missing(
      `conflicting staff records for ${code}: ${matches.map(([k]) => k).join(", ")}`,
      COACHING_SOURCE,
    );
  }
  const row = first[1];

  const headCoach = nonEmptyString(row.headCoach);
  if (headCoach === null) {
    return missing(`staff record for ${code} has no headCoach`, COACHING_SOURCE);
  }

  // null means "not obtained" — the contract's nullable fields exist for this.
  const offensiveCoordinator = nonEmptyString(row.offensiveCoordinator);
  const defensiveCoordinator = nonEmptyString(row.defensiveCoordinator);
  // Field alias, not a default: prefer an explicit fourthDownAggression, else
  // the source's staffAggression. Both absent -> null.
  const fourthDownAggression =
    finiteNumber(row.fourthDownAggression) ?? finiteNumber(row.staffAggression);

  if (opts.asOf === undefined || opts.asOf.trim().length === 0) {
    return missing(
      `staff record for ${code} is undated: ${COACHING_SOURCE} carries no timestamp; ` +
        `pass opts.asOf (the instant the staff table was sealed) to emit REAL`,
      COACHING_SOURCE,
    );
  }

  const notes: string[] = [];
  if (offensiveCoordinator === null) notes.push("offensiveCoordinator absent from source");
  if (defensiveCoordinator === null) notes.push("defensiveCoordinator absent from source");
  if (fourthDownAggression === null) {
    notes.push("fourthDownAggression absent from source");
  } else if (finiteNumber(row.fourthDownAggression) === null) {
    notes.push("fourthDownAggression = staffAggression (empirical 4th-and-short go rate)");
  }

  const record: CoachingRecord = {
    team: code,
    headCoach,
    offensiveCoordinator,
    defensiveCoordinator,
    fourthDownAggression,
  };
  return real(record, COACHING_SOURCE, opts.asOf, notes.length > 0 ? notes.join("; ") : undefined);
}
