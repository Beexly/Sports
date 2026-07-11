import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, MODEL_VERSION, toEdgeIndex } from "@sports/prediction-engine";
import {
  buildBoardHealth,
  type BoardDegradation,
  type BoardHealthBadgeState,
  type BoardSuppressionReason,
} from "@/lib/board/health";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";

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
  meta: {
    isSampleData: boolean;
    suppressedDemoData?: boolean;
    dataError?: "DB_UNREACHABLE";
    traceId: string;
    degradations: readonly BoardDegradation[];
    health: BoardHealthBadgeState;
  };
}

/**
 * Strip per-row confidence values for viewers without the PRO+
 * `canSeeConfidence` entitlement. Confidence is a paid metric — the
 * public board may show that a confidence label exists, but never the
 * number itself. Edge Index stays public by design (canSeeEdgeScore
 * is true for every tier).
 */
export function redactBoardConfidence(payload: BoardStatePayload): BoardStatePayload {
  const strip = (rows: BoardStateRow[]): BoardStateRow[] =>
    rows.map((row) => (row.confidence === null ? row : { ...row, confidence: null }));
  return {
    ...payload,
    data: {
      ...payload.data,
      scoringNow: strip(payload.data.scoringNow),
      publishedToday: strip(payload.data.publishedToday),
      gatedTodayRows: strip(payload.data.gatedTodayRows),
    },
  };
}

function todayBounds(): { start: Date; end: Date } {
  // UTC day bounds (T-board-utc). The engine's "day" is the UTC game-day
  // everywhere else (slate freeze keys, settlement windows), and setHours()
  // is SERVER-LOCAL midnight — identical on Vercel (TZ=UTC) but a different
  // day on any non-UTC host, which would show the board a different "today"
  // than the engine committed. Compute the bounds in UTC explicitly.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function rowCounts(rows: Pick<BoardStateData, "scoringNow" | "publishedToday" | "gatedTodayRows">) {
  return {
    gatedTodayRows: rows.gatedTodayRows.length,
    publishedToday: rows.publishedToday.length,
    scoringNow: rows.scoringNow.length,
  };
}

function buildBoardMeta({
  dataError,
  modelVersion,
  now,
  rows,
  suppressedReason,
}: {
  dataError?: "DB_UNREACHABLE";
  modelVersion: string;
  now: Date;
  rows: Pick<BoardStateData, "scoringNow" | "publishedToday" | "gatedTodayRows">;
  suppressedReason?: BoardSuppressionReason;
}): BoardStatePayload["meta"] {
  const health = buildBoardHealth({
    dataError,
    modelVersion,
    now,
    rowCounts: rowCounts(rows),
    suppressedReason,
  });
  return {
    degradations: health.degradations,
    health: health.badge,
    isSampleData: false,
    ...(dataError ? { dataError } : {}),
    ...(suppressedReason ? { suppressedDemoData: true } : {}),
    traceId: health.traceId,
  };
}

export async function loadBoardState(now = new Date()): Promise<BoardStatePayload> {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();

  // Stale-Data Kill Switch (default OFF via FORCE_NO_BET_IF_STALE). When ON and
  // the latest successful ingestion is "stale" per the shared Refresh SLA,
  // suppress the board the same way the demo path does — empty lanes, zeroed
  // counts — so the public board never surfaces a stale slate (CLAUDE.md #5).
  // Fail OPEN on a DB error so a transient blip can't black out a fresh board.
  const staleSuppressed =
    gates.forceNoBetIfStale && (await isPublicPicksSurfaceStale(now).catch(() => false));

  if (demoActive || staleSuppressed) {
    const emptyRows = {
      gatedTodayRows: [],
      publishedToday: [],
      scoringNow: [],
    };
    return {
      data: {
        sportsWatched: 0,
        booksPolled: 0,
        openPicks: 0,
        gatedToday: 0,
        lastRefresh: now.toISOString(),
        modelVersion: MODEL_VERSION,
        bootstrap: gates.isBootstrapMode,
        scoringNow: emptyRows.scoringNow,
        publishedToday: emptyRows.publishedToday,
        gatedTodayRows: emptyRows.gatedTodayRows,
      },
      meta: buildBoardMeta({
        modelVersion: MODEL_VERSION,
        now,
        rows: emptyRows,
        suppressedReason: demoActive ? "DEMO_DATA" : "STALE_DATA",
      }),
    };
  }

  // Production seed-row exclusion (defense-in-depth). The dev seed tags rows
  // with modelVersion="v5.0.0-seed". In production there should be zero, but
  // the board is a public surface so we exclude them ONLY in production. In
  // dev/test this spread is empty, so behavior is unchanged.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};
  // For the game→pick relation filters: "has a published, non-bootstrap pick".
  // In production, a seed pick must not count as a real published pick, so the
  // relation predicate excludes it too (a game whose only pick is a seed row is
  // then correctly treated as having no published pick).
  const publishedPickRelation = {
    isPublished: true,
    isBootstrap: false,
    ...excludeSeedInProd,
  };

  const { start, end } = todayBounds();
  try {
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
        edgeIndex: toEdgeIndex(decision.edgeIndex ?? decision.game.currentEdgeIndex),
        confidence: decision.confidence ?? decision.pick?.confidence ?? null,
        gateReason: decision.status === "PUBLISHED" ? null : decision.reason,
        updatedAt: decision.evaluatedAt.toISOString(),
      }));
      const scoringRows = decisionRows.filter((row) => row.status === "SCORING_NOW");
      const publishedRows = decisionRows.filter((row) => row.status === "PUBLISHED_TODAY");
      const gatedRows = decisionRows.filter((row) => row.status === "GATED_TODAY");

      const modelVersion = decisions[0]?.modelVersion ?? MODEL_VERSION;
      return {
        data: {
          sportsWatched: new Set(decisionRows.map((row) => row.sport)).size,
          booksPolled: Math.max(0, ...decisions.map((decision) => decision.game.bookmakerCoverageMax)),
          openPicks: publishedRows.length,
          gatedToday: gatedRows.length,
          lastRefresh: now.toISOString(),
          modelVersion,
          bootstrap: gates.isBootstrapMode,
          scoringNow: scoringRows,
          publishedToday: publishedRows,
          gatedTodayRows: gatedRows,
        },
        meta: buildBoardMeta({
          modelVersion,
          now,
          rows: { gatedTodayRows: gatedRows, publishedToday: publishedRows, scoringNow: scoringRows },
        }),
      };
    }

    const [publishedToday, scoringNow, gatedToday] = await Promise.all([
      db.pick.findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
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
          picks: { none: publishedPickRelation },
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
    edgeIndex: toEdgeIndex(pick.game.currentEdgeIndex ?? pick.edgeScore),
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
    edgeIndex: toEdgeIndex(game.currentEdgeIndex),
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
    edgeIndex: toEdgeIndex(game.currentEdgeIndex),
    confidence: null,
    gateReason:
      game.bookmakerCoverageMax < 3
        ? "Market depth below publish threshold."
        : "No pick cleared the publish threshold.",
    updatedAt: game.updatedAt.toISOString(),
  }));

    const modelVersion = publishedToday[0]?.modelVersion ?? MODEL_VERSION;
    return {
      data: {
        sportsWatched: new Set([...scoringRows, ...publishedRows, ...gatedRows].map((row) => row.sport)).size,
        booksPolled: Math.max(0, ...scoringNow.map((game) => game.bookmakerCoverageMax)),
        openPicks: publishedRows.length,
        gatedToday: gatedRows.length,
        lastRefresh: now.toISOString(),
        modelVersion,
        bootstrap: gates.isBootstrapMode,
        scoringNow: scoringRows,
        publishedToday: publishedRows,
        gatedTodayRows: gatedRows,
      },
      meta: buildBoardMeta({
        modelVersion,
        now,
        rows: { gatedTodayRows: gatedRows, publishedToday: publishedRows, scoringNow: scoringRows },
      }),
    };
  } catch {
    const emptyRows = {
      gatedTodayRows: [],
      publishedToday: [],
      scoringNow: [],
    };
    return {
      data: {
        sportsWatched: 0,
        booksPolled: 0,
        openPicks: 0,
        gatedToday: 0,
        lastRefresh: now.toISOString(),
        modelVersion: MODEL_VERSION,
        bootstrap: gates.isBootstrapMode,
        scoringNow: emptyRows.scoringNow,
        publishedToday: emptyRows.publishedToday,
        gatedTodayRows: emptyRows.gatedTodayRows,
      },
      meta: buildBoardMeta({
        dataError: "DB_UNREACHABLE",
        modelVersion: MODEL_VERSION,
        now,
        rows: emptyRows,
      }),
    };
  }
}
