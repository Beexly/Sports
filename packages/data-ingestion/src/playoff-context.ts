/**
 * Playoff / series context detection.
 *
 * Detects whether an upcoming game is part of an active playoff series between
 * the same two teams. When detected, computes:
 *   - Series record (home team wins vs away team wins)
 *   - Whether it's an elimination game
 *   - A desperation multiplier — higher = trailing team is in more urgent territory
 *
 * Detection heuristic: if the same two teams (either order) played 2+ completed
 * games within the last SERIES_LOOKBACK_DAYS, it's treated as an active series.
 * This correctly identifies NBA/NHL/MLB playoff series (best-of-7) without
 * requiring external API calls or sport-specific playoff calendar knowledge.
 *
 * Important: this uses our own settled Game records, so it only fires once
 * series games have been settled. The signal is absent for game 1 of a new
 * series, which is correct — there's nothing to detect yet.
 */

import { db as prisma } from "@sports/db";
import type { PlayoffContext } from "@sports/types";

export type { PlayoffContext };

const SERIES_LOOKBACK_DAYS = 28;
const MIN_SERIES_GAMES = 2;

/**
 * Best-of-7: a team wins the series at 4 wins.
 * Elimination game = one team is already at 3 wins (one more loss and they're out).
 */
const SERIES_WIN_THRESHOLD = 4;

function computeDesperationMultiplier(trailingWins: number, leadingWins: number): number {
  const deficit = leadingWins - trailingWins;
  if (deficit <= 0) {
    // Tied series: escalating stakes
    const totalGames = trailingWins + leadingWins;
    if (totalGames >= 6) return 1.35; // 3-3: winner-take-all
    if (totalGames >= 4) return 1.20; // 2-2: must-win mentality
    return 1.05;                      // 1-1: early series, low desperation
  }
  // Trailing team:
  if (deficit === 1) return 1.40; // down 2-1 or 3-2: must-win urgency
  if (deficit === 2) return 1.70; // down 3-1: rare comeback territory
  return 1.90;                    // down 3-0: near-elimination desperation
}

/**
 * Detects if the upcoming game between homeTeam and awayTeam is part of
 * an active playoff series. Returns PlayoffContext or null if no series found.
 */
export async function detectPlayoffContext(
  homeTeam: string,
  awayTeam: string,
  gameDate: Date
): Promise<PlayoffContext | null> {
  const lookbackDate = new Date(
    gameDate.getTime() - SERIES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );

  const priorGames = await prisma.game.findMany({
    where: {
      OR: [
        { homeTeamName: homeTeam, awayTeamName: awayTeam },
        { homeTeamName: awayTeam, awayTeamName: homeTeam },
      ],
      commenceTime: { gte: lookbackDate, lt: gameDate },
      status: "FINAL",
      homeScore: { not: null },
      awayScore: { not: null },
    },
    orderBy: { commenceTime: "asc" },
    select: {
      homeTeamName: true,
      awayTeamName: true,
      homeScore: true,
      awayScore: true,
    },
  });

  if (priorGames.length < MIN_SERIES_GAMES) return null;

  // Count wins from each team's perspective (using the current game's home/away labels)
  let homeTeamWins = 0;
  let awayTeamWins = 0;

  for (const g of priorGames) {
    const hs = g.homeScore!;
    const as_ = g.awayScore!;
    if (hs === as_) continue; // ignore ties (rare in playoff sports)
    const homeWon = hs > as_;

    if (g.homeTeamName === homeTeam) {
      // The current homeTeam was home in this past game
      if (homeWon) homeTeamWins++;
      else awayTeamWins++;
    } else {
      // The current homeTeam was away in this past game
      if (!homeWon) homeTeamWins++;
      else awayTeamWins++;
    }
  }

  const seriesGamesPlayed = priorGames.length;

  // Elimination: loser of this game is eliminated
  const isEliminationGame =
    homeTeamWins === SERIES_WIN_THRESHOLD - 1 ||
    awayTeamWins === SERIES_WIN_THRESHOLD - 1;

  let trailingTeam: "HOME" | "AWAY" | null = null;
  let seriesDeficit = 0;

  if (homeTeamWins < awayTeamWins) {
    trailingTeam = "HOME";
    seriesDeficit = awayTeamWins - homeTeamWins;
  } else if (awayTeamWins < homeTeamWins) {
    trailingTeam = "AWAY";
    seriesDeficit = homeTeamWins - awayTeamWins;
  }

  const trailingWins = trailingTeam === "HOME" ? homeTeamWins : awayTeamWins;
  const leadingWins = trailingTeam === "HOME" ? awayTeamWins : homeTeamWins;

  const desperationMultiplier = computeDesperationMultiplier(trailingWins, leadingWins);

  return {
    isPlayoffGame: true,
    seriesHomeWins: homeTeamWins,
    seriesAwayWins: awayTeamWins,
    seriesGamesPlayed,
    isEliminationGame,
    trailingTeam,
    seriesDeficit,
    desperationMultiplier,
  };
}
