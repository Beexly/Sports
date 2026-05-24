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
// Schedule density — games in last 7/14 days (v5)
// ============================================================

/**
 * Counts how many games a team played in the last 7 and 14 days before gameDate.
 * Uses ALL TeamGameLog entries (not canonicalOnly) — this is about physical
 * game schedule reality, not ATS accuracy. Active even in bootstrap mode.
 *
 * Returns { gamesLast7: 0, gamesLast14: 0 } when no history exists, which
 * causes computeScheduleStressScore() to return 0 (neutral) — safe default.
 */
export async function computeScheduleDensity(
  teamName: string,
  sport: string,
  gameDate: Date
): Promise<{ gamesLast7: number; gamesLast14: number }> {
  const sevenDaysAgo  = new Date(gameDate.getTime() - 7 * MS_PER_DAY);
  const fourteenDaysAgo = new Date(gameDate.getTime() - 14 * MS_PER_DAY);

  const [last7, last14] = await Promise.all([
    prisma.teamGameLog.count({
      where: {
        teamName,
        sport,
        gameDate: { gte: sevenDaysAgo, lt: gameDate },
      },
    }),
    prisma.teamGameLog.count({
      where: {
        teamName,
        sport,
        gameDate: { gte: fourteenDaysAgo, lt: gameDate },
      },
    }),
  ]);

  return { gamesLast7: last7, gamesLast14: last14 };
}

// ============================================================
// ATS form bucketing
// ============================================================

/**
 * Fetches the last N TeamGameLogs for a team and computes their ATS record.
 * Returns null if fewer than MIN_SAMPLE games are settled.
 *
 * @param venueFilter    - If "HOME", only games where team was home.
 *                         If "AWAY", only games where team was away.
 *                         If omitted, all games.
 * @param canonicalOnly  - If true, exclude bootstrap-era logs (isBootstrap=false only).
 *                         Use when DERIVED_MODEL_HISTORY_ENABLED=true to prevent
 *                         bootstrap contamination from ever entering canonical scoring.
 */
export async function getAtsForm(
  teamName: string,
  sport: string,
  windowGames: number = 15,
  venueFilter?: "HOME" | "AWAY",
  canonicalOnly: boolean = false
): Promise<{ wins: number; losses: number; pushes: number; sampleSize: number } | null> {
  const logs = await prisma.teamGameLog.findMany({
    where: {
      teamName,
      sport,
      atsResult: { in: ["WIN", "LOSS", "PUSH"] },
      ...(venueFilter === "HOME" ? { isHome: true } : {}),
      ...(venueFilter === "AWAY" ? { isHome: false } : {}),
      ...(canonicalOnly ? { isBootstrap: false } : {}),
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
// Head-to-head ATS form between two specific opponents
// ============================================================

/**
 * Fetches the ATS record for `teamName` specifically when playing against
 * `opponentName`. Uses `opponentName` field stored in TeamGameLog.
 *
 * Returns null if fewer than 5 H2H matchups are settled.
 *
 * @param canonicalOnly - If true, exclude bootstrap-era logs (isBootstrap=false only).
 */
export async function getHeadToHeadForm(
  teamName: string,
  opponentName: string,
  sport: string,
  windowGames: number = 10,
  canonicalOnly: boolean = false
): Promise<{ wins: number; losses: number; pushes: number; sampleSize: number } | null> {
  const logs = await prisma.teamGameLog.findMany({
    where: {
      teamName,
      opponentName,
      sport,
      atsResult: { in: ["WIN", "LOSS", "PUSH"] },
      ...(canonicalOnly ? { isBootstrap: false } : {}),
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
  // Market presence flags — used to compute accurate dataQualityScore.
  // Must match what the scoring engine computes per-pick in computeDataQuality().
  hasSpreadMarket?: boolean;
  hasTotalMarket?: boolean;
  hasH2HMarket?: boolean;
  // Bootstrap state — passed through to GameSignal writes for provenance tracking.
  // Defaults to true (safe) when not provided.
  isBootstrap?: boolean;
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
    hasSpreadMarket,
    hasTotalMarket,
    hasH2HMarket,
    isBootstrap = true, // default safe: treat as bootstrap unless caller explicitly opts in
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

  // 3a. Schedule density — game count in last 7 days for both teams (v5)
  // Active regardless of bootstrap mode: reads real schedule dates, not ATS results.
  const [homeDensity, awayDensity] = await Promise.all([
    computeScheduleDensity(homeTeam, sport, commenceTime),
    computeScheduleDensity(awayTeam, sport, commenceTime),
  ]);

  // Write schedule density to GameSignal for source-aware signal tracking.
  // @@unique([gameId, sourceName, signalKey]) enforces idempotent upserts.
  await Promise.all([
    prisma.gameSignal.upsert({
      where: {
        gameId_sourceName_signalKey: {
          gameId,
          sourceName: "schedule-internal",
          signalKey: "schedule_density_7d_home",
        },
      },
      create: {
        gameId,
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_home",
        signalValue: homeDensity.gamesLast7,
        fetchedAt: new Date(),
        trustLevel: 1.0,
        isBootstrap,
      },
      update: {
        signalValue: homeDensity.gamesLast7,
        fetchedAt: new Date(),
      },
    }),
    prisma.gameSignal.upsert({
      where: {
        gameId_sourceName_signalKey: {
          gameId,
          sourceName: "schedule-internal",
          signalKey: "schedule_density_7d_away",
        },
      },
      create: {
        gameId,
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_away",
        signalValue: awayDensity.gamesLast7,
        fetchedAt: new Date(),
        trustLevel: 1.0,
        isBootstrap,
      },
      update: {
        signalValue: awayDensity.gamesLast7,
        fetchedAt: new Date(),
      },
    }),
  ]);

  // 4. Data quality score — formula must exactly mirror computeDataQuality() in
  //    packages/prediction-engine/src/game-context.ts so that game.dataQualityScore
  //    matches factorBreakdown.dataQualityScore when used as a fallback in the picks API.
  const freshnessMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;
  const coverageScore = Math.min((bookmakerCoverageMax / 10) * 40, 40);
  const freshnessScore = Math.max(((90 - freshnessMinutes) / 90) * 30, 0);
  // Market coverage: 10 pts each for spread, total, H2H (0–30 total).
  // Use actual flags when provided; fall back to inferring from avg values.
  const effectiveHasSpread = hasSpreadMarket ?? avgSpread !== null;
  const effectiveHasTotal = hasTotalMarket ?? avgTotal !== null;
  const effectiveHasH2H = hasH2HMarket ?? false;
  const marketScore =
    (effectiveHasSpread ? 10 : 0) +
    (effectiveHasTotal ? 10 : 0) +
    (effectiveHasH2H ? 10 : 0);
  const dataQualityScore = Math.round(Math.min(coverageScore + freshnessScore + marketScore, 100));

  // 5. Update game record
  // IMPORTANT: openingSpread/openingTotal must only be written on first sight.
  // The real opening line is tracked in the OpeningLine model by trackOpeningLines.
  // We conditionally set them here only when not yet stored on the game record.
  const existingGame = await prisma.game.findUnique({
    where: { id: gameId },
    select: { openingSpread: true, openingTotal: true },
  });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      restDaysHome: homeRest.restDays,
      restDaysAway: awayRest.restDays,
      isBackToBackHome: homeRest.isBackToBack,
      isBackToBackAway: awayRest.isBackToBack,
      // Schedule density (v5) — refreshed each cycle as history grows
      scheduleDensityHome: homeDensity.gamesLast7,
      scheduleDensityAway: awayDensity.gamesLast7,
      // Only set on first ingestion — never overwrite with current line
      ...(existingGame?.openingSpread == null && avgSpread !== null && { openingSpread: avgSpread }),
      ...(existingGame?.openingTotal == null && avgTotal !== null && { openingTotal: avgTotal }),
      ...(lineMovementSpread !== null && { lineMovementSpread }),
      ...(lineMovementTotal !== null && { lineMovementTotal }),
      bookmakerCoverageMax,
      dataQualityScore,
      contextComputedAt: new Date(),
    },
  });
}

// ============================================================
// ATS result computation — pure helper, no DB dependency
// ============================================================

export type AtsResult = "WIN" | "LOSS" | "PUSH";

/**
 * Computes the ATS (against-the-spread) results for home and away teams.
 *
 * spread is from the home team's perspective:
 *   -7 = home favored by 7 (home must win by >7 to cover)
 *   +3 = away favored by 3 (home covers by winning or losing by <3)
 *
 * Push zone: |coverMargin| < 0.5 (half-point spreads eliminate true pushes
 * but integer spreads can push; 0.5 guards against floating-point noise).
 */
export function computeAtsResults(
  homeScore: number,
  awayScore: number,
  spread: number | null
): { homeAts: AtsResult; awayAts: AtsResult } {
  if (spread === null) {
    return { homeAts: "PUSH", awayAts: "PUSH" };
  }

  const actualMargin = homeScore - awayScore;
  const coverMargin = actualMargin + spread;

  if (Math.abs(coverMargin) < 0.5) {
    return { homeAts: "PUSH", awayAts: "PUSH" };
  }
  if (coverMargin > 0) {
    return { homeAts: "WIN", awayAts: "LOSS" };
  }
  return { homeAts: "LOSS", awayAts: "WIN" };
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

  // Bootstrap safety fields. Caller reads these from PlatformConfig / ReadinessGates.
  /**
   * When true, logs are marked isBootstrap=true and excluded from canonical
   * scoring even after DERIVED_MODEL_HISTORY_ENABLED is turned on.
   * Set to !gates.canPersistCanonicalHistory in the worker.
   */
  isBootstrap: boolean;

  /**
   * Minimum dataQualityScore required to write this game log.
   * Games with poor bookmaker coverage have unreliable spread data, making
   * ATS tracking inaccurate even with real final scores.
   * Pass gates.minDataQualityForGameLog from the worker.
   */
  minDataQualityThreshold?: number;

  /**
   * The game's dataQualityScore at settlement time (from game.dataQualityScore).
   * Compared against minDataQualityThreshold to gate the write.
   */
  gameDataQualityScore?: number;
}

/**
 * Called when a game is marked completed from scores API.
 * Writes TeamGameLog entries for both teams.
 *
 * Data quality gate: if gameDataQualityScore < minDataQualityThreshold, skips
 * the write entirely. Poor-coverage games have unreliable opening lines which
 * make ATS tracking inaccurate even when scores are real.
 *
 * Bootstrap gate: writes isBootstrap=true when caller is in bootstrap mode
 * (canonicalHistoryEnabled=false). Bootstrap logs are stored but not used for
 * ATS/H2H scoring until DERIVED_MODEL_HISTORY_ENABLED=true.
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
    isBootstrap,
    minDataQualityThreshold,
    gameDataQualityScore,
  } = input;

  // Data quality gate: skip if coverage was too thin to trust the spread data
  if (
    minDataQualityThreshold !== undefined &&
    gameDataQualityScore !== undefined &&
    gameDataQualityScore < minDataQualityThreshold
  ) {
    console.warn(
      `[settle] Skipping TeamGameLog for game ${gameId}: ` +
      `dataQualityScore ${gameDataQualityScore} < threshold ${minDataQualityThreshold}. ` +
      `ATS tracking requires reliable spread coverage.`
    );
    return;
  }

  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  const { homeAts, awayAts } = computeAtsResults(homeScore, awayScore, spread);

  // Upsert TeamGameLog for both teams using the @@unique([gameId, teamName]) constraint.
  // isBootstrap is immutable — creation era is never changed on update.
  // A bootstrap log stays bootstrap even if the system is later upgraded to canonical mode.
  await prisma.$transaction([
    prisma.teamGameLog.upsert({
      where: { gameId_teamName: { gameId, teamName: homeTeam } },
      update: {
        teamScore: homeScore,
        opponentScore: awayScore,
        result: homeWon ? "WIN" : awayWon ? "LOSS" : "TBD",
        atsResult: homeAts,
        // isBootstrap intentionally absent — creation era is immutable
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
        result: homeWon ? "WIN" : awayWon ? "LOSS" : "TBD",
        spread,
        atsResult: homeAts,
        isBootstrap,
      },
    }),
    prisma.teamGameLog.upsert({
      where: { gameId_teamName: { gameId, teamName: awayTeam } },
      update: {
        teamScore: awayScore,
        opponentScore: homeScore,
        result: awayWon ? "WIN" : homeWon ? "LOSS" : "TBD",
        atsResult: awayAts,
        // isBootstrap intentionally absent — creation era is immutable
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
        result: awayWon ? "WIN" : homeWon ? "LOSS" : "TBD",
        spread: spread !== null ? -spread : null,
        atsResult: awayAts,
        isBootstrap,
      },
    }),
  ]);
}
