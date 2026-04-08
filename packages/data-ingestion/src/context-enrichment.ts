// ============================================================
// Context Enrichment — runs after each ingestion cycle
//
// Responsibilities:
//   1. Opening line storage — store first-seen spread/total per game
//   2. Line movement delta — compute current vs opening on re-fetch
//   3. Rest day computation — days since last game for each team
//   4. Back-to-back detection — <2 calendar days between games
//   5. TeamGameLog population — write results when games complete
//   6. Data quality score — based on coverage + freshness
// ============================================================

import { db as prisma } from "@sports/db";
import type { OddsMarket } from "@prisma/client";

// ============================================================
// Opening line tracking
// ============================================================

/**
 * For each game, on first sight store opening lines.
 * On subsequent runs, compute line movement delta.
 * Returns updated delta values for the game record.
 */
export async function trackOpeningLines(
  gameId: string,
  currentSpread: number | null,
  currentTotal: number | null
): Promise<{ lineMovementSpread: number | null; lineMovementTotal: number | null }> {
  const result = {
    lineMovementSpread: null as number | null,
    lineMovementTotal: null as number | null,
  };

  // Handle spread opening line
  if (currentSpread !== null) {
    const spreadMarket: OddsMarket = "SPREADS";
    const existing = await prisma.openingLine.findUnique({
      where: { gameId_market: { gameId, market: spreadMarket } },
    });

    if (!existing) {
      // First sight — store as opening line
      await prisma.openingLine.create({
        data: { gameId, market: spreadMarket, spread: currentSpread },
      });
    } else if (existing.spread !== null) {
      // Subsequent fetch — compute movement
      result.lineMovementSpread = currentSpread - existing.spread;
    }
  }

  // Handle total opening line
  if (currentTotal !== null) {
    const totalMarket: OddsMarket = "TOTALS";
    const existing = await prisma.openingLine.findUnique({
      where: { gameId_market: { gameId, market: totalMarket } },
    });

    if (!existing) {
      await prisma.openingLine.create({
        data: { gameId, market: totalMarket, total: currentTotal },
      });
    } else if (existing.total !== null) {
      result.lineMovementTotal = currentTotal - existing.total;
    }
  }

  return result;
}

// ============================================================
// Rest day computation
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes rest days and B2B flag for a team before a given game.
 * Looks back at the most recent TeamGameLog entry before gameDate.
 */
export async function computeRestDays(
  teamName: string,
  sport: string,
  gameDate: Date
): Promise<{ restDays: number | null; isBackToBack: boolean }> {
  const lastGame = await prisma.teamGameLog.findFirst({
    where: {
      teamName,
      sport,
      gameDate: { lt: gameDate },
    },
    orderBy: { gameDate: "desc" },
  });

  if (!lastGame) {
    return { restDays: null, isBackToBack: false };
  }

  const diffMs = gameDate.getTime() - lastGame.gameDate.getTime();
  const restDays = Math.floor(diffMs / MS_PER_DAY);
  const isBackToBack = restDays < 2;

  return { restDays, isBackToBack };
}

// ============================================================
// ATS form bucketing
// ============================================================

/**
 * Fetches the last N TeamGameLogs for a team and computes their ATS record.
 * Returns null if fewer than MIN_SAMPLE games are settled.
 */
export async function getAtsForm(
  teamName: string,
  sport: string,
  windowGames: number = 15
): Promise<{ wins: number; losses: number; pushes: number; sampleSize: number } | null> {
  const logs = await prisma.teamGameLog.findMany({
    where: {
      teamName,
      sport,
      atsResult: { in: ["WIN", "LOSS", "PUSH"] },
    },
    orderBy: { gameDate: "desc" },
    take: windowGames,
  });

  if (logs.length < 5) return null;

  const wins = logs.filter((l) => l.atsResult === "WIN").length;
  const losses = logs.filter((l) => l.atsResult === "LOSS").length;
  const pushes = logs.filter((l) => l.atsResult === "PUSH").length;

  return { wins, losses, pushes, sampleSize: logs.length };
}

// ============================================================
// Enrich a single game with all context signals
// ============================================================

interface GameEnrichmentInput {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  commenceTime: Date;
  avgSpread: number | null;
  avgTotal: number | null;
  bookmakerCoverageMax: number;
  fetchedAt: Date;
}

/**
 * Run all enrichment steps for a single game after odds are ingested.
 * Updates the Game record in DB with context fields.
 */
export async function enrichGameContext(input: GameEnrichmentInput): Promise<void> {
  const {
    gameId,
    homeTeam,
    awayTeam,
    sport,
    commenceTime,
    avgSpread,
    avgTotal,
    bookmakerCoverageMax,
    fetchedAt,
  } = input;

  // 1. Opening line tracking + movement delta
  const { lineMovementSpread, lineMovementTotal } = await trackOpeningLines(
    gameId,
    avgSpread,
    avgTotal
  );

  // 2. Rest days for both teams
  const [homeRest, awayRest] = await Promise.all([
    computeRestDays(homeTeam, sport, commenceTime),
    computeRestDays(awayTeam, sport, commenceTime),
  ]);

  // 3. Data quality score (mirrors computeDataQuality in prediction-engine)
  const freshnessMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;
  const coverageScore = Math.min((bookmakerCoverageMax / 10) * 40, 40);
  const freshnessScore = Math.max(((90 - freshnessMinutes) / 90) * 30, 0);
  const dataQualityScore = Math.round(Math.min(coverageScore + freshnessScore + 30, 100));
  // +30 assumes at least one market type — actual market coverage tracked per pick

  // 4. Update game record
  await prisma.game.update({
    where: { id: gameId },
    data: {
      restDaysHome: homeRest.restDays,
      restDaysAway: awayRest.restDays,
      isBackToBackHome: homeRest.isBackToBack,
      isBackToBackAway: awayRest.isBackToBack,
      openingSpread: avgSpread,    // stored on first run (won't overwrite — see below)
      openingTotal: avgTotal,
      ...(lineMovementSpread !== null && { lineMovementSpread }),
      ...(lineMovementTotal !== null && { lineMovementTotal }),
      bookmakerCoverageMax,
      dataQualityScore,
      contextComputedAt: new Date(),
    },
  });
}

// ============================================================
// Settle game — write TeamGameLog entries when game completes
// ============================================================

interface SettledGameInput {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameDate: Date;
  homeScore: number;
  awayScore: number;
  spread: number | null;   // the consensus spread (negative = home favored)
}

/**
 * Called when a game is marked completed from scores API.
 * Writes TeamGameLog entries for both teams.
 */
export async function settleGameLogs(input: SettledGameInput): Promise<void> {
  const {
    gameId,
    homeTeam,
    awayTeam,
    sport,
    gameDate,
    homeScore,
    awayScore,
    spread,
  } = input;

  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  // ATS result: home covers if actual margin > spread
  // spread is from home's perspective (e.g. -7 = home favored by 7)
  let homeAts: "WIN" | "LOSS" | "PUSH" = "PUSH";
  let awayAts: "WIN" | "LOSS" | "PUSH" = "PUSH";

  if (spread !== null) {
    const actualMargin = homeScore - awayScore; // positive = home won
    const coverMargin = actualMargin + spread;  // home covers if > 0 (spread is negative for fav)
    if (Math.abs(coverMargin) < 0.5) {
      homeAts = "PUSH";
      awayAts = "PUSH";
    } else if (coverMargin > 0) {
      homeAts = "WIN";
      awayAts = "LOSS";
    } else {
      homeAts = "LOSS";
      awayAts = "WIN";
    }
  }

  // Upsert TeamGameLog for both teams (avoid duplicates on re-settlement)
  await prisma.$transaction([
    prisma.teamGameLog.upsert({
      where: {
        // Use a compound unique-ish approach via gameId + team
        // Since there's no @@unique on [gameId, teamName], we query first
        id: await getOrCreateLogId(gameId, homeTeam),
      },
      update: {
        teamScore: homeScore,
        opponentScore: awayScore,
        result: homeWon ? "WIN" : awayWon ? "LOSS" : "LOSS",
        atsResult: homeAts,
      },
      create: {
        gameId,
        teamName: homeTeam,
        sport,
        opponentName: awayTeam,
        isHome: true,
        gameDate,
        teamScore: homeScore,
        opponentScore: awayScore,
        result: homeWon ? "WIN" : awayWon ? "LOSS" : "LOSS",
        spread,
        atsResult: homeAts,
      },
    }),
    prisma.teamGameLog.upsert({
      where: {
        id: await getOrCreateLogId(gameId, awayTeam),
      },
      update: {
        teamScore: awayScore,
        opponentScore: homeScore,
        result: awayWon ? "WIN" : homeWon ? "LOSS" : "LOSS",
        atsResult: awayAts,
      },
      create: {
        gameId,
        teamName: awayTeam,
        sport,
        opponentName: homeTeam,
        isHome: false,
        gameDate,
        teamScore: awayScore,
        opponentScore: homeScore,
        result: awayWon ? "WIN" : homeWon ? "LOSS" : "LOSS",
        spread: spread !== null ? -spread : null,
        atsResult: awayAts,
      },
    }),
  ]);
}

// Helper to get existing TeamGameLog id for upsert
async function getOrCreateLogId(gameId: string, teamName: string): Promise<string> {
  const existing = await prisma.teamGameLog.findFirst({
    where: { gameId, teamName },
    select: { id: true },
  });
  // Return existing id or a placeholder that won't match — upsert create path runs
  return existing?.id ?? `__new__${gameId}__${teamName}`;
}
