import { db, getSamplePicks, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, MODEL_VERSION } from "@sports/prediction-engine";

export type BoardLane = "SCORING_NOW" | "PUBLISHED_TODAY" | "GATED_TODAY";

export interface BoardStateRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  market: string;
  status: BoardLane;
  edgeIndex: number | null;
  confidence: number | null;
  gateReason: string | null;
  updatedAt: string;
}

export interface BoardStateData {
  sportsWatched: number;
  booksPolled: number;
  openPicks: number;
  gatedToday: number;
  lastRefresh: string;
  modelVersion: string;
  bootstrap: boolean;
  scoringNow: BoardStateRow[];
  publishedToday: BoardStateRow[];
  gatedTodayRows: BoardStateRow[];
}

export interface BoardStatePayload {
  data: BoardStateData;
  meta: { isSampleData: boolean };
}

function todayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function sampleRows(now: Date): {
  scoringNow: BoardStateRow[];
  publishedToday: BoardStateRow[];
  gatedToday: BoardStateRow[];
} {
  const samples = getSamplePicks(now);
  const scoringNow = samples.slice(0, 3).map((pick): BoardStateRow => ({
    id: `scoring-${pick.gameId}`,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    market: pick.pickType,
    status: "SCORING_NOW",
    edgeIndex: Math.round(pick.edgeScore * 10),
    confidence: null,
    gateReason: "PREVIEW MODE: scoring snapshot from sample slate.",
    updatedAt: pick.dataFreshnessAt.toISOString(),
  }));

  const publishedToday = samples.slice(0, 5).map((pick): BoardStateRow => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    market: pick.selection,
    status: "PUBLISHED_TODAY",
    edgeIndex: Math.round(pick.edgeScore * 10),
    confidence: pick.confidence,
    gateReason: null,
    updatedAt: pick.generatedAt.toISOString(),
  }));

  const gatedToday = samples.slice(5, 9).map((pick, index): BoardStateRow => ({
    id: `gate-${pick.gameId}`,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    market: pick.pickType,
    status: "GATED_TODAY",
    edgeIndex: Math.round(pick.edgeScore * 10),
    confidence: null,
    gateReason: index % 2 === 0 ? "Consensus below publish threshold." : "Market depth too thin.",
    updatedAt: pick.dataFreshnessAt.toISOString(),
  }));

  return { scoringNow, publishedToday, gatedToday };
}

export async function loadBoardState(now = new Date()): Promise<BoardStatePayload> {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();

  if (demoActive) {
    const rows = sampleRows(now);
    return {
      data: {
        sportsWatched: Array.from(new Set(getSamplePicks(now).map((pick) => pick.game.sport.name))).length,
        booksPolled: 14,
        openPicks: rows.publishedToday.length,
        gatedToday: rows.gatedToday.length,
        lastRefresh: now.toISOString(),
        modelVersion: "sample-v0.0.0",
        bootstrap: gates.isBootstrapMode,
        scoringNow: rows.scoringNow,
        publishedToday: rows.publishedToday,
        gatedTodayRows: rows.gatedToday,
      },
      meta: { isSampleData: true },
    };
  }

  const { start, end } = todayBounds();
  const decisions = await db.gateDecision.findMany({
    where: {
      isBootstrap: false,
      evaluatedAt: { gte: start, lt: end },
    },
    include: {
      game: { include: { sport: { select: { name: true } } } },
      pick: true,
    },
    orderBy: { evaluatedAt: "desc" },
    take: 100,
  });

  if (decisions.length > 0) {
    const decisionRows = decisions.map((decision): BoardStateRow => ({
      id: decision.id,
      gameId: decision.gameId,
      matchup: `${decision.game.awayTeamName} @ ${decision.game.homeTeamName}`,
      sport: decision.game.sport.name,
      market: decision.pick?.selection ?? "ALL_MARKETS",
      status:
        decision.status === "PUBLISHED"
          ? "PUBLISHED_TODAY"
          : decision.status === "GATED"
            ? "GATED_TODAY"
            : "SCORING_NOW",
      edgeIndex: decision.edgeIndex ?? decision.game.currentEdgeIndex,
      confidence: decision.confidence ?? decision.pick?.confidence ?? null,
      gateReason: decision.status === "PUBLISHED" ? null : decision.reason,
      updatedAt: decision.evaluatedAt.toISOString(),
    }));
    const scoringRows = decisionRows.filter((row) => row.status === "SCORING_NOW");
    const publishedRows = decisionRows.filter((row) => row.status === "PUBLISHED_TODAY");
    const gatedRows = decisionRows.filter((row) => row.status === "GATED_TODAY");

    return {
      data: {
        sportsWatched: new Set(decisionRows.map((row) => row.sport)).size,
        booksPolled: Math.max(0, ...decisions.map((decision) => decision.game.bookmakerCoverageMax)),
        openPicks: publishedRows.length,
        gatedToday: gatedRows.length,
        lastRefresh: now.toISOString(),
        modelVersion: decisions[0]?.modelVersion ?? MODEL_VERSION,
        bootstrap: gates.isBootstrapMode,
        scoringNow: scoringRows,
        publishedToday: publishedRows,
        gatedTodayRows: gatedRows,
      },
      meta: { isSampleData: false },
    };
  }

  const [publishedToday, scoringNow, gatedToday] = await Promise.all([
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        generatedAt: { gte: start, lt: end },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: [{ confidence: "desc" }, { generatedAt: "desc" }],
      take: 12,
    }),
    db.game.findMany({
      where: {
        commenceTime: { gte: now },
        status: "SCHEDULED",
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 8,
    }),
    db.game.findMany({
      where: {
        commenceTime: { gte: start, lt: end },
        picks: { none: { isPublished: true, isBootstrap: false } },
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 12,
    }),
  ]);

  const publishedRows = publishedToday.map((pick): BoardStateRow => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    market: pick.selection,
    status: "PUBLISHED_TODAY",
    edgeIndex: pick.game.currentEdgeIndex ?? Math.round(pick.edgeScore),
    confidence: pick.confidence,
    gateReason: null,
    updatedAt: pick.generatedAt.toISOString(),
  }));

  const scoringRows = scoringNow.map((game): BoardStateRow => ({
    id: `scoring-${game.id}`,
    gameId: game.id,
    matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
    sport: game.sport.name,
    market: "ALL_MARKETS",
    status: "SCORING_NOW",
    edgeIndex: game.currentEdgeIndex,
    confidence: null,
    gateReason: null,
    updatedAt: game.updatedAt.toISOString(),
  }));

  const gatedRows = gatedToday.map((game): BoardStateRow => ({
    id: `gate-${game.id}`,
    gameId: game.id,
    matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
    sport: game.sport.name,
    market: "ALL_MARKETS",
    status: "GATED_TODAY",
    edgeIndex: game.currentEdgeIndex,
    confidence: null,
    gateReason:
      game.bookmakerCoverageMax < 3
        ? "Market depth below publish threshold."
        : "No pick cleared the publish threshold.",
    updatedAt: game.updatedAt.toISOString(),
  }));

  return {
    data: {
      sportsWatched: new Set([...scoringRows, ...publishedRows, ...gatedRows].map((row) => row.sport)).size,
      booksPolled: Math.max(0, ...scoringNow.map((game) => game.bookmakerCoverageMax)),
      openPicks: publishedRows.length,
      gatedToday: gatedRows.length,
      lastRefresh: now.toISOString(),
      modelVersion: publishedToday[0]?.modelVersion ?? MODEL_VERSION,
      bootstrap: gates.isBootstrapMode,
      scoringNow: scoringRows,
      publishedToday: publishedRows,
      gatedTodayRows: gatedRows,
    },
    meta: { isSampleData: false },
  };
}
