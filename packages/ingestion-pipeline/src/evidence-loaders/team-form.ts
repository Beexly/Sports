/**
 * Team form loader.
 *
 * Reads the trends artefact with the real field names and reports the weeks it
 * actually covers. It does not claim Weeks 1–9 when the file stops at Week 7.
 */

import type { Evidence, TeamFormRecord } from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";
import { loadTrendsFile, optionalNumber, requireNumber, type TrendsFile } from "./trends.js";

export interface TeamFormOptions {
  readonly trendsPath?: string;
  readonly trends?: TrendsFile;
}

/**
 * The artefact is keyed by whatever the builder wrote. The older file uses
 * "WAS" where the contract uses "WSH", so a direct lookup misses Washington
 * entirely. Resolve every key through canonicalTeamCode and match on the code.
 */
function findCanonicalRow(
  file: TrendsFile,
  code: string,
): Readonly<Record<string, unknown>> | undefined {
  for (const [key, row] of Object.entries(file.teams)) {
    try {
      if (canonicalTeamCode(key) === code) return row;
    } catch {
      // A key that is not a team is not this team. Keep looking.
    }
  }
  return undefined;
}

/** Percent -> 0..1 rate. Null in, null out; never a substituted zero. */
function toRate(pct: number | null): number | null {
  return pct === null ? null : pct / 100;
}

export function loadTeamForm(team: string, opts: TeamFormOptions = {}): Evidence<TeamFormRecord> {
  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${(err as Error).message}`, "trends");
  }

  let file: TrendsFile;
  try {
    file = opts.trends ?? loadTrendsFile(opts.trendsPath);
  } catch (err) {
    return missing(`trends file unreadable: ${(err as Error).message}`, "trends");
  }

  const row = file.teams[code] ?? findCanonicalRow(file, code);
  if (row === undefined) {
    return missing(`trends has no row for ${code}`, "trends", file.generatedAt);
  }

  try {
    const firstWeek = file.weeksCovered[0];
    const lastWeek = file.weeksCovered[file.weeksCovered.length - 1];
    if (firstWeek === undefined || lastWeek === undefined) {
      return missing("trends file has an empty weeks_covered", "trends", file.generatedAt);
    }
    const record: TeamFormRecord = {
      team: code,
      gamesPlayed: requireNumber(code, row, "games_played"),
      offEpaPerPlay: requireNumber(code, row, "off_epa_per_play"),
      defEpaPerPlay: requireNumber(code, row, "def_epa_per_play"),
      passEpaPerPlay: requireNumber(code, row, "off_pass_epa"),
      rushEpaPerPlay: requireNumber(code, row, "off_rush_epa"),
      // The trends artefact carries no points-per-game column. Null is the
      // honest value; a zero would be an invented measurement.
      successRate: optionalNumber(row, "third_down_conv_w6_w7"),
      pointsPerGame: optionalNumber(row, "points_per_game"),
      pointsAllowedPerGame: optionalNumber(row, "points_allowed_per_game"),
      // neutral_pass_rate_pct is a percentage in the artefact; the contract
      // carries a 0..1 rate. Divide only when the value is present.
      neutralPassRate: toRate(optionalNumber(row, "neutral_pass_rate_pct")),
      proePct: optionalNumber(row, "proe_pct"),
      playActionPct: optionalNumber(row, "play_action_pct"),
      weeksCovered: [firstWeek, lastWeek],
    };
    return real(record, "trends:nflverse-pbp", file.generatedAt);
  } catch (err) {
    return missing((err as Error).message, "trends", file.generatedAt);
  }
}
