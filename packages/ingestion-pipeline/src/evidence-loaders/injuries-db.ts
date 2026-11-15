/**
 * Injuries from the database.
 *
 * The ESPN endpoint returns HTTP 403 to this client's User-Agent (verified
 * 2026-11-12: 403 with "GalaxySportsEdge/1.0", 200 with a browser UA). The
 * ingestion pipeline already writes the same feed into the `injuries` table
 * every morning, so the database is the reliable source and ESPN is the
 * fallback, not the other way round.
 *
 * The table is keyed by the feed's own team code, which uses "LA" and "WAS"
 * where the contract uses "LAR" and "WSH". Every row is resolved through
 * canonicalTeamCode before it is matched.
 */

import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence, InjuryRecord } from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode, tryCanonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

export interface DbInjuryRow {
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly reportStatus: string;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
  readonly fetchedAt: string;
}

export interface DbInjuriesOptions {
  readonly season: number;
  readonly week: number;
}

/**
 * Read the injury report for one team from the `injuries` table.
 *
 * Returns MISSING when the table has no rows for the team in that season/week.
 * An empty report is not the same as a healthy roster, and this loader will not
 * pretend it is.
 */
export async function loadInjuriesFromDb(
  db: SqlClient,
  team: string,
  opts: DbInjuriesOptions,
): Promise<Evidence<readonly InjuryRecord[]>> {
  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${(err as Error).message}`, "db:injuries");
  }

  let rows: readonly DbInjuryRow[];
  try {
    const res = await db.query(
      `SELECT "playerName", team, position, "reportStatus", "practiceStatus",
              "primaryInjury", "fetchedAt"
         FROM injuries
        WHERE season = $1 AND week = $2`,
      [opts.season, opts.week],
    );
    rows = res.rows as DbInjuryRow[];
  } catch (err) {
    return missing(`injuries query failed: ${(err as Error).message}`, "db:injuries");
  }

  const mine = rows.filter((r) => tryCanonicalTeamCode(r.team) === code);
  if (mine.length === 0) {
    return missing(
      `no injury rows for ${code} in season ${opts.season} week ${opts.week}`,
      "db:injuries",
    );
  }

  const newest = mine.reduce<string>((acc, r) => (r.fetchedAt > acc ? r.fetchedAt : acc), mine[0]?.fetchedAt ?? "");
  const records: InjuryRecord[] = mine.map((r) => ({
    playerName: r.playerName,
    team: code,
    position: r.position,
    reportStatus: r.reportStatus,
    practiceStatus: r.practiceStatus,
    primaryInjury: r.primaryInjury,
  }));

  return real(records, "db:injuries", newest);
}
