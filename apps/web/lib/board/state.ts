import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, MODEL_VERSION, toEdgeIndex } from "@sports/prediction-engine";
import type { Entitlements } from "@sports/types";
import {
  buildBoardHealth,
  type BoardDegradation,
  type BoardHealthBadgeState,
  type BoardSuppressionReason,
} from "@/lib/board/health";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";
import { unevaluatedPassReason } from "./pass-reason";
import {
  classifyBoardState,
  type ClassifiedBoardState,
} from "./classify-board-state";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";

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
  rankingP: number | null;
  rankingSource: string | null;
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
    /** Honest-empty classifier — refuse-default public fire claim */
    boardClass: ClassifiedBoardState;
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

function extractRankingFromFb(fb: unknown): {
  rankingP: number | null;
  rankingSource: string | null;
} {
  if (!fb || typeof fb !== "object") return { rankingP: null, rankingSource: null };
  const rec = fb as Record<string, unknown>;
  const rp = rec["rankingP"];
  const rankingP =
    typeof rp === "number" && Number.isFinite(rp)
      ? Math.min(1, Math.max(0, rp))
      : null;
  const rs = rec["rankingSource"];
  const rankingSource = typeof rs === "string" && rs.trim() ? rs.trim() : null;
  return { rankingP, rankingSource };
}

function todayBounds(): { start: Date; end: Date } {

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
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
  liveBoardOn = false,
  bootstrap = false,
}: {
  dataError?: "DB_UNREACHABLE";
  modelVersion: string;
  now: Date;
  rows: Pick<BoardStateData, "scoringNow" | "publishedToday" | "gatedTodayRows">;
  suppressedReason?: BoardSuppressionReason;
  /** Production default false — founder gate */
  liveBoardOn?: boolean;
  bootstrap?: boolean;
}): BoardStatePayload["meta"] {
  const counts = rowCounts(rows);
  const health = buildBoardHealth({
    dataError,
    modelVersion,
    now,
    rowCounts: counts,
    suppressedReason,
  });
  const rowCount = counts.scoringNow + counts.publishedToday + counts.gatedTodayRows;
  const boardClass = classifyBoardState({
    liveBoardOn,
    bootstrap,
    rowCount,
    dataError: dataError ?? null,
    suppressedReason: suppressedReason ?? null,
  });
  return {
    degradations: health.degradations,
    health: health.badge,
    isSampleData: false,
    boardClass,
    ...(dataError ? { dataError } : {}),
    ...(suppressedReason ? { suppressedDemoData: true } : {}),
    traceId: health.traceId,
  };
}

export async function loadBoardState(
  now = new Date(),
  entitlements?: Entitlements,
): Promise<BoardStatePayload> {
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
        liveBoardOn: false,
        bootstrap: gates.isBootstrapMode,
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

  // Server-side tier gate (CLAUDE.md rule #3 — no frontend-only paywalls).
  // The `market` field on each BoardStateRow carries pick.selection (e.g. "Chiefs -3.5"),
  // which embeds the paid selection + line. For viewers without canSeePremiumPicks,
  // tier-filter at the query and redact any selection that still slips through.
  const isPremiumViewer = entitlements?.canSeePremiumPicks ?? false;
  const tierFilter = isPremiumViewer ? {} : { tier: "FREE" as const };

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
        market: isPremiumViewer
          ? (decision.pick?.selection ?? "ALL_MARKETS")
          : "ALL_MARKETS",
        status:
          decision.status === "PUBLISHED"
            ? "PUBLISHED_TODAY"
            : decision.status === "GATED"
              ? "GATED_TODAY"
              : "SCORING_NOW",
        edgeIndex: toEdgeIndex(decision.edgeIndex ?? decision.game.currentEdgeIndex),
        confidence: decision.confidence ?? decision.pick?.confidence ?? null,
        ...extractRankingFromFb(decision.pick?.factorBreakdown),
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
        liveBoardOn: false,
        bootstrap: gates.isBootstrapMode,
      }),
      };
    }

    const [publishedTodayRaw, scoringNow, gatedToday] = await Promise.all([
      db.pick.findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
          ...tierFilter,
          generatedAt: { gte: start, lt: end },
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        // Wide window — re-rank by rankingP below so low-conf demotions surface
        // and high-conf market-echo does not monopolize the take.
        orderBy: [{ generatedAt: "desc" }],
        take: 48,
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

  const publishedToday = [...publishedTodayRaw]
    .sort(comparePicksByRanking)
    .slice(0, 12);

  const publishedRows = publishedToday.map((pick): BoardStateRow => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    market: isPremiumViewer ? pick.selection : "ALL_MARKETS",
    status: "PUBLISHED_TODAY",
    edgeIndex: toEdgeIndex(pick.game.currentEdgeIndex ?? pick.edgeScore),
    confidence: pick.confidence,
    ...extractRankingFromFb(pick.factorBreakdown),
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
    rankingP: null,
    rankingSource: null,
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
    rankingP: null,
    rankingSource: null,
    // Shared with the Pass List (./pass-reason.ts). `gatedToday` here is the
    // FALLBACK query — games matching `picks: { none: ... }` — so a row exists
    // because no published pick does, not because the model evaluated the game
    // and declined. This lane and the Pass List can describe the same game on
    // one page, so they must not derive the wording separately; they previously
    // did, and had already drifted on evidence health.
    //
    // The primary path above (real `gateDecision` rows) is untouched: those
    // carry `decision.reason`, which IS a genuine judgement.
    gateReason: unevaluatedPassReason(game.bookmakerCoverageMax, game.dataQualityScore),
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
        liveBoardOn: false,
        bootstrap: gates.isBootstrapMode,
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
        liveBoardOn: false,
        bootstrap: gates.isBootstrapMode,
      }),
    };
  }
}
