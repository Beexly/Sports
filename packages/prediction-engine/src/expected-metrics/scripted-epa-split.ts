import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One offensive scrimmage play, mapped from nflverse. */
export interface ScriptedPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly posteam: string;
  readonly playType: string;
  readonly week: number;
  readonly epa: number | null;
}

export const SCRIPTED_EPA_MODEL_VERSION = "gse-scripted-epa-v1";

const SCRIPTED_EPA_FEATURE_KEYS = ["epa"] as const;

export interface ScriptedEpaSplitArm {
  readonly plays: number;
  readonly ratablePlays: number;
  readonly distinctGames: number;
  readonly totalOwnEpa: number;
  readonly epaPerPlay: number;
  readonly epaPerGame: number;
}

export interface ScriptedEpaDiagnostic {
  readonly unratablePlays: number;
  readonly belowFloorArms: number;
}

export interface TeamScriptedEpaSplit {
  readonly teamId: string;
  readonly window: "season" | "last-4" | "last-8";
  readonly scripted: ScriptedEpaSplitArm | undefined;
  readonly nonScripted: ScriptedEpaSplitArm | undefined;
  readonly differential: number | undefined;
  readonly diagnostics: ScriptedEpaDiagnostic;
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: SCRIPTED_EPA_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...SCRIPTED_EPA_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(SCRIPTED_EPA_FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Computes the team-level scripted vs non-scripted EPA/game and EPA/play based on the first 15 offensive plays.
 * `targetWeek`: The point in time evaluation week. Only plays with `week < targetWeek` are used.
 */
export function computeScriptedEpaSplits(
  plays: readonly ScriptedPlay[],
  targetWeek: number,
): TeamScriptedEpaSplit[] {
  // First, filter by targetWeek for point-in-time discipline
  // First, filter by targetWeek for point-in-time discipline, and ensure only valid offensive scrimmage plays enter
  const eligiblePlays = plays.filter((p) => p.week < targetWeek && (p.playType === "pass" || p.playType === "run") && p.posteam !== "");

  // Group plays by game and team
  const playsByGameAndTeam = new Map<string, ScriptedPlay[]>();
  for (const play of eligiblePlays) {
    const key = `${play.gameId}_${play.posteam}`;
    const bucket = playsByGameAndTeam.get(key) ?? [];
    bucket.push(play);
    playsByGameAndTeam.set(key, bucket);
  }

  interface TeamGameStat {
    teamId: string;
    week: number;
    gameId: string;
    scriptedPlays: number;
    scriptedRatablePlays: number;
    scriptedTotalEpa: number;
    scriptedUnratablePlays: number;
    nonScriptedPlays: number;
    nonScriptedRatablePlays: number;
    nonScriptedTotalEpa: number;
    nonScriptedUnratablePlays: number;
  }

  // Pre-process all games to classify plays into scripted/non-scripted
  const teamGameStats: TeamGameStat[] = [];

  for (const gamePlays of Array.from(playsByGameAndTeam.values())) {
    // gamePlays are already in array order from mapper
    const teamId = gamePlays[0]?.posteam ?? "";
    const week = gamePlays[0]?.week ?? 0;
    const gameId = gamePlays[0]?.gameId ?? "";

    let scPlays = 0;
    let scRatable = 0;
    let scEpa = 0;
    let scUnratable = 0;

    let nsPlays = 0;
    let nsRatable = 0;
    let nsEpa = 0;
    let nsUnratable = 0;

    for (let i = 0; i < gamePlays.length; i++) {
      const play = gamePlays[i]!;
      const isScripted = i < 15;

      if (isScripted) {
        scPlays++;
        if (play.epa !== null && Number.isFinite(play.epa)) {
          scRatable++;
          scEpa += play.epa;
        } else {
          scUnratable++;
        }
      } else {
        nsPlays++;
        if (play.epa !== null && Number.isFinite(play.epa)) {
          nsRatable++;
          nsEpa += play.epa;
        } else {
          nsUnratable++;
        }
      }
    }

    teamGameStats.push({
      teamId,
      week,
      gameId,
      scriptedPlays: scPlays,
      scriptedRatablePlays: scRatable,
      scriptedTotalEpa: scEpa,
      scriptedUnratablePlays: scUnratable,
      nonScriptedPlays: nsPlays,
      nonScriptedRatablePlays: nsRatable,
      nonScriptedTotalEpa: nsEpa,
      nonScriptedUnratablePlays: nsUnratable,
    });
  }

  const teamStats = new Map<string, TeamGameStat[]>();
  for (const stat of teamGameStats) {
    const bucket = teamStats.get(stat.teamId) ?? [];
    bucket.push(stat);
    teamStats.set(stat.teamId, bucket);
  }

  const windows: ("season" | "last-4" | "last-8")[] = ["season", "last-4", "last-8"];
  const results: TeamScriptedEpaSplit[] = [];

  for (const [teamId, games] of Array.from(teamStats.entries())) {
    // Sort games by week descending to easily pick last-X distinct weeks
    const sortedGames = [...games].sort((a, b) => b.week - a.week);

    // Find distinct weeks
    const distinctWeeks = Array.from(new Set(sortedGames.map(g => g.week))).sort((a, b) => b - a);

    for (const win of windows) {
      let allowedWeeks = distinctWeeks;
      if (win === "last-4") allowedWeeks = distinctWeeks.slice(0, 4);
      if (win === "last-8") allowedWeeks = distinctWeeks.slice(0, 8);

      const allowedWeeksSet = new Set(allowedWeeks);
      const windowGames = sortedGames.filter(g => allowedWeeksSet.has(g.week));

      let scPlays = 0;
      let scRatable = 0;
      let scEpa = 0;
      let scUnratable = 0;
      let scDistinctGames = 0;

      let nsPlays = 0;
      let nsRatable = 0;
      let nsEpa = 0;
      let nsUnratable = 0;
      let nsDistinctGames = 0;

      for (const g of windowGames) {
        if (g.scriptedPlays > 0 || g.nonScriptedPlays > 0) {
          scDistinctGames++;
          nsDistinctGames++;
        }
        if (g.scriptedPlays > 0) {
          scPlays += g.scriptedPlays;
          scRatable += g.scriptedRatablePlays;
          scEpa += g.scriptedTotalEpa;
          scUnratable += g.scriptedUnratablePlays;
        }
        if (g.nonScriptedPlays > 0) {
          nsPlays += g.nonScriptedPlays;
          nsRatable += g.nonScriptedRatablePlays;
          nsEpa += g.nonScriptedTotalEpa;
          nsUnratable += g.nonScriptedUnratablePlays;
        }
      }

      let belowFloorArms = 0;

      let scriptedArm: ScriptedEpaSplitArm | undefined = undefined;
      let nonScriptedArm: ScriptedEpaSplitArm | undefined = undefined;
      let differential: number | undefined = undefined;

      let totalRatable = 0;

      if (scRatable >= 20 && scDistinctGames >= 2) {
        scriptedArm = {
          plays: scPlays,
          ratablePlays: scRatable,
          distinctGames: scDistinctGames,
          totalOwnEpa: scEpa,
          epaPerPlay: round(scEpa / scRatable, 4),
          epaPerGame: round(scEpa / scDistinctGames, 4),
        };
        totalRatable += scRatable;
      } else {
        belowFloorArms++;
      }

      if (nsRatable >= 20 && nsDistinctGames >= 2) {
        nonScriptedArm = {
          plays: nsPlays,
          ratablePlays: nsRatable,
          distinctGames: nsDistinctGames,
          totalOwnEpa: nsEpa,
          epaPerPlay: round(nsEpa / nsRatable, 4),
          epaPerGame: round(nsEpa / nsDistinctGames, 4),
        };
        totalRatable += nsRatable;
      } else {
        belowFloorArms++;
      }

      if (scriptedArm && nonScriptedArm) {
        differential = round(scriptedArm.epaPerPlay - nonScriptedArm.epaPerPlay, 4);
      }

      const totalUnratable = scUnratable + nsUnratable;

      results.push({
        teamId,
        window: win,
        scripted: scriptedArm,
        nonScripted: nonScriptedArm,
        differential,
        diagnostics: {
          unratablePlays: totalUnratable,
          belowFloorArms,
        },
        provenance: buildProvenance(totalRatable),
      });
    }
  }

  return results;
}
