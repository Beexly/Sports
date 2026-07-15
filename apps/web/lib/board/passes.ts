import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, toEdgeIndex } from "@sports/prediction-engine";
import {
  getFreshPublicOddsSportKeys,
  isPublicPicksSurfaceStale,
} from "@/lib/data-reliability/public-freshness-gate";
import { utcDayBounds } from "@/lib/time/utc-day";

export interface PassListRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  edgeIndex: number | null;
  reason: string;
  evaluatedAt: string;
}

export interface BoardPassesPayload {
  data: { date: string; passes: PassListRow[] };
  meta: { isSampleData: boolean; suppressedDemoData?: boolean; dataError?: "DB_UNREACHABLE" };
}

function passReason(bookmakerCoverageMax: number, dataQualityScore: number): string {
  if (bookmakerCoverageMax < 3) return "Market depth below publish threshold.";
  if (dataQualityScore < 70) return "Evidence health below publish threshold.";
  return "No pick cleared the publish threshold.";
}

export async function loadBoardPasses(now = new Date()): Promise<BoardPassesPayload> {
  const demoActive = isStubMode() && isDemoPicksEnabled();

  // Stale-Data Kill Switch (default ON via FORCE_NO_BET_IF_STALE). When ON and
  // the latest successful ingestion is "stale" per the shared Refresh SLA,
  // suppress the Pass List the same way the demo path does — empty passes — so
  // the public board never surfaces a stale slate (CLAUDE.md #5). Fail CLOSED on
  // a DB error because freshness that cannot be proven is stale.
  const forceNoBetIfStale = getReadinessGates().forceNoBetIfStale;
  let staleSuppressed = false;
  let freshSportKeys: string[] | null = null;
  if (forceNoBetIfStale) {
    staleSuppressed = await isPublicPicksSurfaceStale(now).catch(() => true);
    if (!staleSuppressed) {
      const freshSports = await getFreshPublicOddsSportKeys(now).catch(() => null);
      staleSuppressed = !freshSports || freshSports.size === 0;
      freshSportKeys = freshSports ? [...freshSports] : null;
    }
  }

  if (demoActive || staleSuppressed) {
    return {
      data: { date: now.toISOString().slice(0, 10), passes: [] },
      meta: { isSampleData: false, suppressedDemoData: true },
    };
  }

  // Production seed-row exclusion (defense-in-depth). In production a dev seed
  // pick (modelVersion="v5.0.0-seed") must not count as a real published pick,
  // so a game whose only pick is a seed row is correctly listed as a pass. The
  // spread is empty in dev/test, so behavior is unchanged there.
  const publishedPickRelation = {
    isPublished: true,
    isBootstrap: false,
    ...(process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {}),
  };

  const { start, end } = utcDayBounds(now);
  try {
    const gateDecisions = await db.gateDecision.findMany({
      where: {
        status: "GATED",
        isBootstrap: false,
        evaluatedAt: { gte: start, lt: end },
        ...(freshSportKeys
          ? { game: { sport: { key: { in: freshSportKeys } } } }
          : {}),
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { evaluatedAt: "desc" },
      take: 100,
    });

    if (gateDecisions.length > 0) {
      return {
        data: {
          date: now.toISOString().slice(0, 10),
          passes: gateDecisions.map((decision): PassListRow => ({
            id: decision.id,
            gameId: decision.gameId,
            matchup: `${decision.game.awayTeamName} @ ${decision.game.homeTeamName}`,
            sport: decision.game.sport.name,
            edgeIndex: toEdgeIndex(decision.edgeIndex ?? decision.game.currentEdgeIndex),
            reason: decision.reason,
            evaluatedAt: decision.evaluatedAt.toISOString(),
          })),
        },
        meta: { isSampleData: false },
      };
    }

    const games = await db.game.findMany({
      where: {
        commenceTime: { gte: start, lt: end },
        picks: { none: publishedPickRelation },
        ...(freshSportKeys ? { sport: { key: { in: freshSportKeys } } } : {}),
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 100,
    });

    const passes = games.map((game): PassListRow => ({
      id: `pass-${game.id}`,
      gameId: game.id,
      matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
      sport: game.sport.name,
      edgeIndex: toEdgeIndex(game.currentEdgeIndex),
      reason: passReason(game.bookmakerCoverageMax, game.dataQualityScore),
      evaluatedAt: game.updatedAt.toISOString(),
    }));

    return {
      data: { date: now.toISOString().slice(0, 10), passes },
      meta: { isSampleData: false },
    };
  } catch {
    return {
      data: { date: now.toISOString().slice(0, 10), passes: [] },
      meta: { isSampleData: false, dataError: "DB_UNREACHABLE" },
    };
  }
}
