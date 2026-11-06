/**
 * Team Special Teams EPA — a SHADOW expected metric aggregating own-EPA
 * on special teams plays (kickoffs, punts, field goals, extra points).
 *
 * Filters raw pbp records for the four relevant play_types, attributing
 * them to `posteam`. Any ST play with an empty `posteam` is excluded and
 * tracked. Output aggregates EPA per play and EPA per game across
 * standard windows (season-to-date, last 4 games, last 8 games), strictly
 * enforcing a point-in-time boundary (`week < targetWeek`).
 *
 * Includes league comparisons (mean EPA/play and EPA/game) computed
 * across floor-qualifying teams. Floors: >= 3 distinct games and >= 30
 * qualifying ST plays in the window. Below floor, a team's window output
 * is excluded.
 */

import { mean, round, type FeatureScaler } from "./numeric.js";
import { type DrivePlay } from "./drives.js";
import { type PbpRow } from "./nflverse-pbp-mapper.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

export const TEAM_SPECIAL_TEAMS_EPA_VERSION = "gse-team-st-epa-shadow-v1";
const FEATURE_KEYS = ["play_type", "posteam", "week", "game_id"] as const;

export interface SpecialTeamsPhaseMetrics {
  readonly epaTotal: number;
  readonly playCount: number;
}

export interface TeamSpecialTeamsMetrics {
  readonly team: string;
  readonly targetWeek: number;
  readonly epaTotal: number;
  readonly epaPerPlay: number;
  readonly epaPerGame: number;
  readonly playCount: number;
  readonly gameCount: number;
  readonly splits: {
    readonly kickoff: SpecialTeamsPhaseMetrics;
    readonly punt: SpecialTeamsPhaseMetrics;
    readonly field_goal: SpecialTeamsPhaseMetrics;
    readonly extra_point: SpecialTeamsPhaseMetrics;
  };
}

export interface SpecialTeamsLeagueMean {
  readonly epaPerPlay: number;
  readonly epaPerGame: number;
  readonly teamCount: number;
}

export interface TeamSpecialTeamsEpaWindowOutput {
  readonly window: "season-to-date" | "last-4-games" | "last-8-games";
  readonly teams: readonly TeamSpecialTeamsMetrics[];
  readonly leagueMean: SpecialTeamsLeagueMean | null;
}

export interface TeamSpecialTeamsEpaOutput {
  readonly targetWeek: number;
  readonly windows: readonly TeamSpecialTeamsEpaWindowOutput[];
  readonly diagnostics: {
    readonly excludedEmptyPosteamPlays: number;
    readonly excludedNonSpecialTeamsPlays: number;
  };
  readonly provenance: ExpectedMetricProvenance;
}

interface InternalStPlay {
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly playType: "kickoff" | "punt" | "field_goal" | "extra_point";
  readonly epa: number;
}

function parseWeek(gameId: string, rowWeekStr: string | undefined): number {
  if (rowWeekStr) {
    const w = parseInt(rowWeekStr, 10);
    if (!isNaN(w)) return w;
  }
  // fallback for nflverse game_id format (YYYY_WW_AWAY_HOME)
  const parts = gameId.split("_");
  if (parts.length >= 2) {
    const w = parseInt(parts[1]!, 10);
    if (!isNaN(w)) return w;
  }
  return 0; // fallback
}

export function computeTeamSpecialTeamsEpa(
  pbpRows: readonly PbpRow[],
  drivePlays: readonly DrivePlay[],
  targetWeek: number,
): TeamSpecialTeamsEpaOutput {
  let excludedEmptyPosteamPlays = 0;
  let excludedNonSpecialTeamsPlays = 0;
  const validPlays: InternalStPlay[] = [];

  // Map play_id to DrivePlay to get attached own-EPA
  const drivePlayByPlayId = new Map<string, DrivePlay>();
  for (const dp of drivePlays) {
    drivePlayByPlayId.set(dp.playId, dp);
  }

  for (const row of pbpRows) {
    const playType = row["play_type"];
    if (
      playType !== "kickoff" &&
      playType !== "punt" &&
      playType !== "field_goal" &&
      playType !== "extra_point"
    ) {
      excludedNonSpecialTeamsPlays++;
      continue;
    }

    const gameId = row["game_id"] ?? "";
    const week = parseWeek(gameId, row["week"]);

    // Strict point-in-time boundary
    if (week >= targetWeek) {
      continue;
    }

    const posteam = row["posteam"] ?? "";
    if (posteam === "") {
      excludedEmptyPosteamPlays++;
      continue;
    }

    const playId = `${gameId}-${row["play_id"] ?? ""}`;
    const dp = drivePlayByPlayId.get(playId);

    // If we don't have our own EPA for this play, count it as 0 as per Drives module logic
    // but typically we should only evaluate rows that have an EPA attached or use 0.
    const epa = dp?.epa ?? 0;

    validPlays.push({
      gameId,
      week,
      posteam,
      playType,
      epa,
    });
  }

  // Aggregate by team
  const playsByTeam = new Map<string, InternalStPlay[]>();
  for (const play of validPlays) {
    const bucket = playsByTeam.get(play.posteam);
    if (bucket) {
      bucket.push(play);
    } else {
      playsByTeam.set(play.posteam, [play]);
    }
  }

  const computeWindow = (
    windowName: "season-to-date" | "last-4-games" | "last-8-games",
    limitGames: number | null
  ): TeamSpecialTeamsEpaWindowOutput => {
    const teamsInWindow: TeamSpecialTeamsMetrics[] = [];

    for (const [team, teamPlays] of playsByTeam.entries()) {
      // Sort plays by gameId (since game_id includes week usually, but we have week too)
      // We need distinct games
      const distinctGames = new Set(teamPlays.map(p => p.gameId));
      const sortedGames = Array.from(distinctGames).sort();

      let gamesToKeep = sortedGames;
      if (limitGames !== null) {
        gamesToKeep = sortedGames.slice(-limitGames);
      }

      const gameSet = new Set(gamesToKeep);
      const playsInWindow = teamPlays.filter(p => gameSet.has(p.gameId));

      const gameCount = gameSet.size;
      const playCount = playsInWindow.length;

      // Enforce floor
      if (gameCount < 3 || playCount < 30) {
        continue;
      }

      let epaTotal = 0;
      let kickoffEpa = 0; let kickoffPlays = 0;
      let puntEpa = 0; let puntPlays = 0;
      let fgEpa = 0; let fgPlays = 0;
      let xpEpa = 0; let xpPlays = 0;

      for (const p of playsInWindow) {
        epaTotal += p.epa;
        if (p.playType === "kickoff") { kickoffEpa += p.epa; kickoffPlays++; }
        else if (p.playType === "punt") { puntEpa += p.epa; puntPlays++; }
        else if (p.playType === "field_goal") { fgEpa += p.epa; fgPlays++; }
        else if (p.playType === "extra_point") { xpEpa += p.epa; xpPlays++; }
      }

      teamsInWindow.push({
        team,
        targetWeek,
        epaTotal: round(epaTotal, 4),
        epaPerPlay: round(epaTotal / playCount, 4),
        epaPerGame: round(epaTotal / gameCount, 4),
        playCount,
        gameCount,
        splits: {
          kickoff: { epaTotal: round(kickoffEpa, 4), playCount: kickoffPlays },
          punt: { epaTotal: round(puntEpa, 4), playCount: puntPlays },
          field_goal: { epaTotal: round(fgEpa, 4), playCount: fgPlays },
          extra_point: { epaTotal: round(xpEpa, 4), playCount: xpPlays },
        }
      });
    }

    // Sort teams by team name for deterministic output
    teamsInWindow.sort((a, b) => a.team.localeCompare(b.team));

    let leagueMean: SpecialTeamsLeagueMean | null = null;
    if (teamsInWindow.length > 0) {
      const allEpaPerPlay = teamsInWindow.map(t => t.epaPerPlay);
      const allEpaPerGame = teamsInWindow.map(t => t.epaPerGame);
      leagueMean = {
        epaPerPlay: round(mean(allEpaPerPlay), 4),
        epaPerGame: round(mean(allEpaPerGame), 4),
        teamCount: teamsInWindow.length
      };
    }

    return {
      window: windowName,
      teams: teamsInWindow,
      leagueMean
    };
  };

  const provenance: ExpectedMetricProvenance = {
    modelVersion: TEAM_SPECIAL_TEAMS_EPA_VERSION,
    method: "deterministic-rule",
    featureKeys: FEATURE_KEYS,
    featureSchemaHash: computeFeatureSchemaHash(FEATURE_KEYS),
    sampleSize: validPlays.length,
  };

  return {
    targetWeek,
    windows: [
      computeWindow("season-to-date", null),
      computeWindow("last-4-games", 4),
      computeWindow("last-8-games", 8)
    ],
    diagnostics: {
      excludedEmptyPosteamPlays,
      excludedNonSpecialTeamsPlays,
    },
    provenance,
  };
}
