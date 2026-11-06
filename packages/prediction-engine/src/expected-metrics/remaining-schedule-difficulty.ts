import { round } from "./numeric.js";
import { type ExpectedMetricProvenance } from "./types.js";

export interface DefensivePlay {
  readonly playId: string;
  readonly gameId: string;
  readonly defteam: string;
  readonly week: number;
  readonly epa: number | null;
}

export interface NormalizedGame {
  readonly season: number;
  readonly week: number;
  readonly home_team?: string;
  readonly away_team?: string;
  readonly homeTeam?: string;
  readonly awayTeam?: string;
  readonly gameType?: string;
  readonly game_type?: string;
}

export interface RemainingScheduleDifficultyOpponent {
  readonly opponent: string;
  readonly week: number;
  readonly rawDefEpaPerPlay: number;
  readonly shrunkValue: number;
  readonly defensivePlays: number;
  readonly distinctGames: number;
}

export interface RemainingScheduleDifficultyResult {
  readonly team: string;
  readonly targetWeek: number;
  readonly remainingGames: number;
  readonly opponentsConsidered: number;
  readonly opponentsExcludedBelowFloor: number;
  readonly difficulty: number | null;
  readonly leagueDefensiveMean: number;
  readonly opponents: readonly RemainingScheduleDifficultyOpponent[];
  readonly provenance: ExpectedMetricProvenance;
}

export function computeRemainingScheduleDifficulty(
  plays: readonly DefensivePlay[],
  schedule: readonly NormalizedGame[],
  targetSeason: number,
  targetWeek: number,
): readonly RemainingScheduleDifficultyResult[] {
  // Point-in-time filter for defensive plays (week < targetWeek) and exclude null epa
  const eligiblePlays = plays.filter((p) => p.week < targetWeek && p.epa !== null);

  let totalEpa = 0;
  let totalPlays = 0;

  const teamStats = new Map<string, { epaSum: number; playCount: number; games: Set<string> }>();

  for (const play of eligiblePlays) {
    totalEpa += play.epa!;
    totalPlays++;

    let stats = teamStats.get(play.defteam);
    if (!stats) {
      stats = { epaSum: 0, playCount: 0, games: new Set() };
      teamStats.set(play.defteam, stats);
    }
    stats.epaSum += play.epa!;
    stats.playCount++;
    stats.games.add(play.gameId);
  }

  const leagueMean = totalPlays > 0 ? totalEpa / totalPlays : 0;

  const shrunkValues = new Map<string, { raw: number; shrunk: number; plays: number; distinctGames: number }>();

  for (const [team, stats] of teamStats.entries()) {
    const distinctGames = stats.games.size;
    if (distinctGames >= 3 && stats.playCount >= 100) {
      const raw = stats.epaSum / stats.playCount;
      const shrunk = leagueMean + (stats.playCount / (stats.playCount + 200)) * (raw - leagueMean);
      shrunkValues.set(team, { raw, shrunk, plays: stats.playCount, distinctGames });
    }
  }

  // Filter schedule for target season and week >= targetWeek, REG games only
  const remainingSchedule = schedule.filter((g) => {
    const type = g.gameType ?? g.game_type ?? "REG";
    return g.season === targetSeason && g.week >= targetWeek && type === "REG";
  });

  const allTeams = new Set<string>();
  for (const game of schedule) {
    if (game.season === targetSeason) {
      const home = game.homeTeam ?? game.home_team;
      const away = game.awayTeam ?? game.away_team;
      if (home) allTeams.add(home);
      if (away) allTeams.add(away);
    }
  }

  const results: RemainingScheduleDifficultyResult[] = [];

  const provenance: ExpectedMetricProvenance = {
    modelVersion: "1.0.0",
    method: "deterministic-rule",
    featureKeys: [],
    featureSchemaHash: "00000000",
    sampleSize: totalPlays,
  };

  for (const team of allTeams) {
    const teamGames = remainingSchedule.filter((g) => {
      const home = g.homeTeam ?? g.home_team;
      const away = g.awayTeam ?? g.away_team;
      return home === team || away === team;
    });

    let difficultySum = 0;
    let opponentsConsidered = 0;
    let opponentsExcludedBelowFloor = 0;
    const opponentDetails: RemainingScheduleDifficultyOpponent[] = [];

    for (const game of teamGames) {
      const home = game.homeTeam ?? game.home_team;
      const away = game.awayTeam ?? game.away_team;
      const opponent = home === team ? away : home;

      if (!opponent) continue;

      const oppValue = shrunkValues.get(opponent);

      if (oppValue) {
        difficultySum += oppValue.shrunk;
        opponentsConsidered++;
        opponentDetails.push({
          opponent,
          week: game.week,
          rawDefEpaPerPlay: oppValue.raw,
          shrunkValue: oppValue.shrunk,
          defensivePlays: oppValue.plays,
          distinctGames: oppValue.distinctGames,
        });
      } else {
        opponentsExcludedBelowFloor++;
      }
    }

    const difficulty = opponentsConsidered > 0 ? round(difficultySum / opponentsConsidered, 4) : null;

    results.push({
      team,
      targetWeek,
      remainingGames: teamGames.length,
      opponentsConsidered,
      opponentsExcludedBelowFloor,
      difficulty,
      leagueDefensiveMean: round(leagueMean, 4),
      opponents: opponentDetails,
      provenance,
    });
  }

  return results;
}
