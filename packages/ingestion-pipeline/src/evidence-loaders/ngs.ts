/**
 * Next Gen Stats team loader (nflverse `next_gen_stats`, read-only).
 *
 * The table stores player-week rows by statType (passing / receiving /
 * rushing). This loader aggregates the team's 2026 regular-season rows for
 * weeks strictly before the game's week, using only rows fetched at or before
 * the seal instant. The output is DERIVED (an unweighted player-week mean, not
 * an nflverse-published team number) and enters the bundle at emission weight
 * 0.
 *
 * Honesty rules:
 *  - No rows means MISSING with the reason. A zero is never substituted.
 *  - A metric with no non-null input stays null, not zero.
 *  - The weeks actually covered are reported, never assumed.
 *  - A query failure is MISSING, never an empty success.
 */

import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence } from "@sports/prediction-engine/src/evidence/types.js";
import { derived, missing } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

const SOURCE = "nflverse:next_gen_stats";

export interface NgsTeamRecord {
  readonly team: string;
  readonly season: number;
  readonly weeksCovered: readonly number[];
  readonly playerWeekRows: number;
  readonly passing: {
    readonly cpoe: number | null;
    readonly avgTimeToThrow: number | null;
    readonly aggressiveness: number | null;
    readonly avgAirYardsToSticks: number | null;
  };
  readonly receiving: {
    readonly avgSeparation: number | null;
    readonly avgYacAboveExpectation: number | null;
  };
  readonly rushing: {
    readonly rushYardsOverExpectedPerAtt: number | null;
    readonly pctAttemptsGte8Defenders: number | null;
  };
}

/** The table uses nflverse codes (WAS); the contract uses WSH. Query both. */
function dbTeamCodes(code: string): string[] {
  if (code === "WSH") return ["WSH", "WAS"];
  if (code === "LAR") return ["LAR", "LA"];
  return [code];
}

const NGS_SQL = `
SELECT
  "statType" AS stat_type,
  week,
  cpoe, "avgTimeToThrow" AS avg_time_to_throw, aggressiveness,
  "avgAirYardsToSticks" AS avg_air_yards_to_sticks,
  "avgSeparation" AS avg_separation,
  "avgYacAboveExpectation" AS avg_yac_above_expectation,
  "rushYardsOverExpectedPerAtt" AS ryoe_per_att,
  "pctAttemptsGte8Defenders" AS pct_gte8,
  "fetchedAt" AS fetched_at
FROM next_gen_stats
WHERE season = $1
  AND team = ANY($2::text[])
  AND week >= 1 AND week < $3
  AND ("fetchedAt" IS NULL OR "fetchedAt" <= $4)
  AND ("seasonType" IS NULL OR "seasonType" = 'REG')
`;

interface NgsRow {
  stat_type: string;
  week: number;
  cpoe: number | null;
  avg_time_to_throw: number | null;
  aggressiveness: number | null;
  avg_air_yards_to_sticks: number | null;
  avg_separation: number | null;
  avg_yac_above_expectation: number | null;
  ryoe_per_att: number | null;
  pct_gte8: number | null;
  fetched_at: string | Date | null;
}

/** Mean of non-null finite values; null when there are none (never 0). */
export function meanOrNull(values: ReadonlyArray<number | null | undefined>): number | null {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function aggregateNgsRows(code: string, season: number, rows: readonly NgsRow[]): NgsTeamRecord {
  const by = (t: string) => rows.filter((r) => r.stat_type === t);
  const pass = by("passing");
  const rec = by("receiving");
  const rush = by("rushing");
  const weeks = [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b);
  return {
    team: code,
    season,
    weeksCovered: weeks,
    playerWeekRows: rows.length,
    passing: {
      cpoe: meanOrNull(pass.map((r) => r.cpoe)),
      avgTimeToThrow: meanOrNull(pass.map((r) => r.avg_time_to_throw)),
      aggressiveness: meanOrNull(pass.map((r) => r.aggressiveness)),
      avgAirYardsToSticks: meanOrNull(pass.map((r) => r.avg_air_yards_to_sticks)),
    },
    receiving: {
      avgSeparation: meanOrNull(rec.map((r) => r.avg_separation)),
      avgYacAboveExpectation: meanOrNull(rec.map((r) => r.avg_yac_above_expectation)),
    },
    rushing: {
      rushYardsOverExpectedPerAtt: meanOrNull(rush.map((r) => r.ryoe_per_att)),
      pctAttemptsGte8Defenders: meanOrNull(rush.map((r) => r.pct_gte8)),
    },
  };
}

export async function loadNgsTeam(
  db: SqlClient,
  team: string,
  opts: { season: number; week: number; asOf: Date },
): Promise<Evidence<NgsTeamRecord>> {
  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${(err as Error).message}`, SOURCE);
  }
  let rows: NgsRow[];
  try {
    const res = await db.query(NGS_SQL, [opts.season, dbTeamCodes(code), opts.week, opts.asOf]);
    rows = res.rows as NgsRow[];
  } catch (err) {
    return missing(`next_gen_stats query failed: ${(err as Error).message}`, SOURCE);
  }
  if (rows.length === 0) {
    return missing(
      `next_gen_stats has no ${opts.season} REG rows for ${code} before week ${opts.week} fetched by ${opts.asOf.toISOString()}`,
      SOURCE,
      opts.asOf.toISOString(),
    );
  }
  const record = aggregateNgsRows(code, opts.season, rows);
  return derived(
    record,
    SOURCE,
    opts.asOf.toISOString(),
    `unweighted player-week mean over ${rows.length} rows, weeks [${record.weeksCovered.join(",")}]`,
  );
}
