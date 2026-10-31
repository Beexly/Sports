/**
 * Q50: WR depth after the leader (WR receiving yards per team game excluding the window's leading WR)
 *
 * Computes a descriptive WR depth rate for a team within a specified window by:
 * 1. Identifying the window's leading WR (max yards, tiebreak lowest playerId).
 * 2. Subtracting the leader's yards from the team's total WR receiving yards.
 * 3. Dividing by the team's distinct games played in that window.
 *
 * This module enforces GSE's pinned translations of the source concept:
 * - Window-internal leader (never leaking full-season leaders into early windows).
 * - Qualification floor (>= 3 distinct games AND >= 30 WR targets in the window).
 * - "WR" identity requires the injected position lookup returning exactly "WR".
 */

import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { round } from "./numeric.js";

export const WR_DEPTH_AFTER_LEADER_MODEL_VERSION = "v1.0.0";

/** Target play grain: every REG pass-play row with a non-empty receiver_player_id */
export interface WrDepthTargetPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly receiverPlayerId: string;
  readonly receivingYards: number | null; // null represents missing/incompletion (contributes 0 yards)
}

/** Team game grain: every REG scrimmage row with a non-empty posteam (used for game counting) */
export interface WrDepthTeamGamePlay {
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
}

export interface WrDepthResult {
  readonly posteam: string;
  readonly distinctGames: number;
  readonly wrTargets: number;
  readonly wrCount: number;
  readonly totalWrReceivingYards: number;
  readonly totalWrYardsPerGame: number;
  readonly leaderPlayerId: string;
  readonly leaderReceivingYards: number;
  readonly leaderShareOfWrYards: number | null;
  readonly depthReceivingYards: number;
  readonly depthYardsPerGame: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface WrDepthDiagnostics {
  /** Targets where the position lookup did not return 'WR' (e.g. TE, RB) */
  readonly excludedNonWrYards: number;
  readonly excludedNonWrTargets: number;
  /** Targets where the position lookup returned undefined */
  readonly excludedUnknownPositionYards: number;
  readonly excludedUnknownPositionTargets: number;
  /** Teams falling below the games or targets floor in the window */
  readonly belowFloorTeamAbsences: number;
  /** Targeted rows with missing/null yards (incompletions) */
  readonly missingYardsTargets: number;
}

export interface WrDepthOutput {
  readonly results: readonly WrDepthResult[];
  readonly diagnostics: WrDepthDiagnostics;
}

export function computeWrDepthAfterLeader(
  targetPlays: readonly WrDepthTargetPlay[],
  teamGamePlays: readonly WrDepthTeamGamePlay[],
  positionLookup: ReadonlyMap<string, string>,
  targetWeek: number,
  windowWeeks: number | "season-to-date"
): WrDepthOutput {
  // Determine the start week based on the window.
  // We only include weeks < targetWeek.
  const startWeek = windowWeeks === "season-to-date" ? 0 : targetWeek - windowWeeks;

  // 1. Filter target plays to the window
  const windowTargetPlays = targetPlays.filter(p => p.week >= startWeek && p.week < targetWeek);

  // 2. Filter team games to the window and count distinct games per team
  const distinctGamesByTeam = new Map<string, Set<string>>();
  for (const play of teamGamePlays) {
    if (play.week >= startWeek && play.week < targetWeek) {
      let games = distinctGamesByTeam.get(play.posteam);
      if (!games) {
        games = new Set<string>();
        distinctGamesByTeam.set(play.posteam, games);
      }
      games.add(play.gameId);
    }
  }

  // 3. Accumulate stats per team, per player, and track diagnostics
  let excludedNonWrYards = 0;
  let excludedNonWrTargets = 0;
  let excludedUnknownPositionYards = 0;
  let excludedUnknownPositionTargets = 0;
  let belowFloorTeamAbsences = 0;
  let missingYardsTargets = 0;

  const teamWrStats = new Map<string, Map<string, { yards: number; targets: number }>>();

  for (const play of windowTargetPlays) {
    const pos = positionLookup.get(play.receiverPlayerId);
    const yards = play.receivingYards ?? 0;

    if (play.receivingYards === null) {
      missingYardsTargets++;
    }

    if (pos === undefined) {
      excludedUnknownPositionTargets++;
      excludedUnknownPositionYards += yards;
      continue;
    }

    if (pos !== "WR") {
      excludedNonWrTargets++;
      excludedNonWrYards += yards;
      continue;
    }

    let teamMap = teamWrStats.get(play.posteam);
    if (!teamMap) {
      teamMap = new Map();
      teamWrStats.set(play.posteam, teamMap);
    }

    let playerStats = teamMap.get(play.receiverPlayerId);
    if (!playerStats) {
      playerStats = { yards: 0, targets: 0 };
      teamMap.set(play.receiverPlayerId, playerStats);
    }

    playerStats.yards += yards;
    playerStats.targets += 1;
  }

  // 4. Compute results per team
  const results: WrDepthResult[] = [];
  const emptyTeamKeys = Array.from(distinctGamesByTeam.keys());

  // Ensure we check all teams that had a distinct game in the window, even if they had 0 WR targets
  const teamsToCheck = new Set([...teamWrStats.keys(), ...emptyTeamKeys]);

  for (const team of teamsToCheck) {
    const distinctGames = distinctGamesByTeam.get(team)?.size ?? 0;
    const teamMap = teamWrStats.get(team);

    let wrTargets = 0;
    let wrCount = 0;
    let totalWrReceivingYards = 0;
    let leaderPlayerId = "";
    let leaderReceivingYards = -1;

    if (teamMap) {
      wrCount = teamMap.size;
      for (const [playerId, stats] of teamMap.entries()) {
        wrTargets += stats.targets;
        totalWrReceivingYards += stats.yards;

        // Window-internal leader identification with tie-break
        if (stats.yards > leaderReceivingYards || (stats.yards === leaderReceivingYards && playerId < leaderPlayerId)) {
          leaderReceivingYards = stats.yards;
          leaderPlayerId = playerId;
        }
      }
    }

    // Floor: >= 3 distinct games AND >= 30 WR targets
    if (distinctGames < 3 || wrTargets < 30) {
      belowFloorTeamAbsences++;
      continue;
    }

    // Safety check in case leader is missing (e.g. no targets but >= 30 somehow, theoretically impossible but handled)
    if (leaderReceivingYards === -1) {
      leaderReceivingYards = 0;
    }

    const depthReceivingYards = totalWrReceivingYards - leaderReceivingYards;
    const depthYardsPerGame = distinctGames > 0 ? depthReceivingYards / distinctGames : 0;
    const totalWrYardsPerGame = distinctGames > 0 ? totalWrReceivingYards / distinctGames : 0;
    const leaderShareOfWrYards = totalWrReceivingYards > 0 ? leaderReceivingYards / totalWrReceivingYards : null;

    const featureKeys = ["window_weeks", "target_week"];
    const provenance: ExpectedMetricProvenance = {
      modelVersion: WR_DEPTH_AFTER_LEADER_MODEL_VERSION,
      method: "deterministic-rule",
      featureKeys,
      featureSchemaHash: computeFeatureSchemaHash(featureKeys),
      sampleSize: wrTargets,
    };

    results.push({
      posteam: team,
      distinctGames,
      wrTargets,
      wrCount,
      totalWrReceivingYards,
      totalWrYardsPerGame: round(totalWrYardsPerGame, 4),
      leaderPlayerId,
      leaderReceivingYards,
      leaderShareOfWrYards: leaderShareOfWrYards !== null ? round(leaderShareOfWrYards, 4) : null,
      depthReceivingYards,
      depthYardsPerGame: round(depthYardsPerGame, 4),
      provenance,
    });
  }

  // Sort deterministically by team name
  results.sort((a, b) => a.posteam.localeCompare(b.posteam));

  return {
    results,
    diagnostics: {
      excludedNonWrYards,
      excludedNonWrTargets,
      excludedUnknownPositionYards,
      excludedUnknownPositionTargets,
      belowFloorTeamAbsences,
      missingYardsTargets,
    }
  };
}
