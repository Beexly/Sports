import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, MODEL_VERSION, toEdgeIndex } from "@sports/prediction-engine";
import type { Entitlements } from "@sports/types";
import {
  buildBoardHealth,
  type BoardDegradation,
  type BoardHealthBadgeState,
  type BoardSuppressionReason,
} from "@/lib/board/health";
import { classifyDegradationCharacter, type DegradationCharacter } from "@/lib/board/degradation-character";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";
import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";
import { unevaluatedPassReason } from "./pass-reason";
import {
  classifyBoardState,
  type ClassifiedBoardState,
} from "./classify-board-state";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";
import { publicEdgeScore } from "@/lib/picks/public-edge-score";
import { freshPickWhere } from "@/lib/board/stale-pick-policy";
import { gameInSlateWindow, resolveSlateWindow } from "@/lib/picks/slate-window";

export type BoardLane = "SCORING_NOW" | "PUBLISHED_TODAY" | "GATED_TODAY";

/**
 * D-3 (C11 BEFORE DEPLOY): liveBoardOn was hardcoded false at every call site,
 * so classifyBoardState could NEVER return HAS_ROWS — the board rendered
 * "held by founder gate" copy above real rows the moment CANONICAL_HISTORY
 * flipped on. The gate is now env-driven, reading the SAME LIVE_BOARD variable
 * the autonomy kernel already observes (cron/autonomy-cycle/route.ts). House
 * flag convention (lib/ops/autonomy-posture.ts): trimmed, case-insensitive
 * "true" is the only truthy value — absent/empty/garbage stays false, so the
 * founder gate remains the production default until explicitly opened.
 */
export function liveBoardOn(env: Record<string, string | undefined> = process.env): boolean {
  return env["LIVE_BOARD"]?.trim().toLowerCase() === "true";
}

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
    /**
     * User-facing character of the current empty/degraded state.
     * Distinguishes genuinely-quiet (no eligible games, scheduler alive)
     * from stale-refreshing (data past SLA, awaiting fresh ingestion).
     * Never surfaces raw operator language.
     */
    degradationCharacter: DegradationCharacter;
  };
}

/**
 * Strip per-row confidence values for viewers without the PRO+
 * `canSeeConfidence` entitlement. Confidence is a paid metric — the
 * public board may show that a confidence label exists, but never the
 * number itself. Edge Index stays public by design (canSeeEdgeScore
 * is true for every tier).
 */
/**
 * Lane precedence when one fixture appears in more than one lane. PUBLISHED is
 * the strongest statement we make about a game, SCORING_NOW is a live state,
 * GATED_TODAY is the weakest ("we passed"). Published and gated are mutually
 * exclusive by query (the gated query requires no published pick), so in
 * practice this resolves the scoring/gated overlap the fallback path creates.
 */
const LANE_RANK: Record<BoardStateRow["status"], number> = {
  PUBLISHED_TODAY: 0,
  SCORING_NOW: 1,
  GATED_TODAY: 2,
};

/**
 * One fixture, one row per market (C-117).
 *
 * Measured on a live slate: 58 board rows covering 18 distinct fixtures, with
 * Notre Dame v Wisconsin MONEYLINE appearing four times as two contradictory
 * variants (FREE confidence 57 LEAN against PREMIUM confidence 88 STRONG_PLAY).
 * A subscriber and a free visitor could be shown opposite strength readings on
 * the same game, which is a direct hit on the product's premise.
 *
 * Keyed on `gameId` + `market`, NOT on the matchup string. `matchup` is built
 * from denormalized team-name columns that differ between rows for the same
 * fixture, and keying on names is exactly the identity guess that
 * game-merge-plan.ts deliberately fails closed on (a bare "Los Angeles" must
 * never prefix-match; MLB has two LA clubs). Collapsing two genuinely different
 * games is far worse than showing one twice.
 *
 * WHAT THIS DOES AND DOES NOT FIX, stated plainly because the difference
 * matters. It collapses duplicates that share a gameId: repeated GateDecision
 * evaluations of one game in a day (GateDecision has no unique constraint and
 * the query takes the latest 100 with no per-game collapse), and the
 * scoring/gated cross-lane overlap. It does NOT collapse two DIFFERENT Game
 * rows for the same real contest — that needs the rows merged (F-17), and the
 * aliased-row filter on the queries handles only the subset already tombstoned.
 *
 * The winner is deterministic: strongest lane, then the most informative row
 * (higher confidence, then higher edge), then the most recently evaluated, then
 * the lexically smallest id so the result never depends on query order.
 */
export type DedupeEntry = { readonly key: string; readonly row: BoardStateRow };

/**
 * The key MUST come from the caller, not from `row.market`.
 *
 * `market` is redacted at row-build time: every row a non-premium viewer gets
 * carries the literal "ALL_MARKETS", so keying on it would collapse a game's
 * SPREAD and TOTAL into one row for FREE viewers while PRO viewers kept both.
 * Rows and openPicks would then differ by entitlement, which is both a lost
 * pick for the free tier and a break of the tier-invariant count contract
 * (Devin Review, #717). Callers key on the unredacted pickType instead.
 */
export function dedupeBoardRows(entries: readonly DedupeEntry[]): BoardStateRow[] {
  const best = new Map<string, BoardStateRow>();
  for (const { key, row } of entries) {
    const held = best.get(key);
    if (held === undefined || outranks(row, held)) best.set(key, row);
  }
  return [...best.values()];
}

/** Fixture + market identity, built from values redaction never touches. */
export function boardDedupeKey(gameId: string, pickType: string | null | undefined): string {
  return `${gameId}\u0000${pickType ?? "NO_PICK"}`;
}

function outranks(candidate: BoardStateRow, held: BoardStateRow): boolean {
  const laneDelta = LANE_RANK[candidate.status] - LANE_RANK[held.status];
  if (laneDelta !== 0) return laneDelta < 0;
  const conf = (candidate.confidence ?? -1) - (held.confidence ?? -1);
  if (conf !== 0) return conf > 0;
  const edge = (candidate.edgeIndex ?? -1) - (held.edgeIndex ?? -1);
  if (edge !== 0) return edge > 0;
  if (candidate.updatedAt !== held.updatedAt) return candidate.updatedAt > held.updatedAt;
  return candidate.id < held.id;
}

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

function extractRankingFromFb(
  fb: unknown,
  isPremiumViewer: boolean,
): {
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
  // rankingP / rankingSource are premium-only model internals (the ranking
  // win-probability used for generation sort + selective publish). They must
  // never reach a non-PRO viewer. Null them out server-side alongside the
  // market/selection redaction above. (GSE-SEC-026)
  if (!isPremiumViewer) return { rankingP: null, rankingSource: null };
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
  schedulerLiveness = null,
  staleDetected = false,
}: {
  dataError?: "DB_UNREACHABLE";
  modelVersion: string;
  now: Date;
  rows: Pick<BoardStateData, "scoringNow" | "publishedToday" | "gatedTodayRows">;
  suppressedReason?: BoardSuppressionReason;
  /** Production default false — founder gate */
  liveBoardOn?: boolean;
  bootstrap?: boolean;
  /** Scheduler liveness already assessed by the caller (async). */
  schedulerLiveness?: { readonly status: "healthy" | "degraded" | "dead" | "unknown" } | null;
  /** When the kill switch is OFF but zero rows loaded while data is past SLA. */
  staleDetected?: boolean;
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
  const degradationCharacter = classifyDegradationCharacter({
    staleSuppressed: suppressedReason === "STALE_DATA",
    dbUnreachable: dataError === "DB_UNREACHABLE",
    demoSuppressed: suppressedReason === "DEMO_DATA",
    liveBoardOff: !liveBoardOn,
    rowCount,
    schedulerLiveness: schedulerLiveness?.status ?? null,
    staleDetected,
  });
  return {
    degradations: health.degradations,
    health: health.badge,
    isSampleData: false,
    boardClass,
    degradationCharacter,
    ...(dataError ? { dataError } : {}),
    ...(suppressedReason ? { suppressedDemoData: true } : {}),
    traceId: health.traceId,
  };
}

async function loadBoardStateInner(
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

  // When suppressing for staleness, assess scheduler liveness to distinguish
  // "genuinely quiet (scheduler alive, nothing to do)" from "stale-refreshing
  // (data past SLA, scheduler may be dead)". This feeds the user-facing copy.
  // assessed but never awaited (synchronous build needs the status now).
  const schedulerLiveness = staleSuppressed
    ? await assessSchedulerLiveness(now.getTime()).catch(() => null)
    : null;

  // When the kill switch is OFF but the board loads zero rows, we still must
  // distinguish a genuinely-quiet slate from a stale-but-refreshing one. The
  // dead-scheduler condition (2026-08-10 incident) proved the board can show
  // "quiet board — not an outage" while data is 20h stale because zero rows
  // loaded. Only check when rowCount === 0 to avoid the freshness query on a
  // real slate.
  const detectStaleWhenEmpty = async (): Promise<{
    stale: boolean;
    schedulerLiveness: { readonly status: "healthy" | "degraded" | "dead" | "unknown" } | null;
  }> => {
    const stale = await isPublicPicksSurfaceStale(now).catch(() => false);
    if (stale) {
      return {
        stale: true,
        schedulerLiveness: await assessSchedulerLiveness(now.getTime()).catch(() => null),
      };
    }
    return { stale: false, schedulerLiveness: null };
  };

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
        liveBoardOn: liveBoardOn(),
        bootstrap: gates.isBootstrapMode,
        schedulerLiveness,
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
  // keep every row in the query so counts are identical for all viewers, but redact
  // the `market`/selection field to "ALL_MARKETS" at the row level (see mapping below).
  const isPremiumViewer = entitlements?.canSeePremiumPicks ?? false;

  const { start, end } = todayBounds();
  // Published rows follow the public slate window (Eastern day the game starts
  // in, rows still refreshed), the same as /api/picks; see lib/picks/slate-window.ts.
  const slateNow = new Date();
  const slate = resolveSlateWindow(null, slateNow);
  try {
    const decisions = await db.gateDecision.findMany({
      where: {
        isBootstrap: false,
        evaluatedAt: { gte: start, lt: end },
        // Never show a decision about a game row that has been merged away
        // (C-117). This is the database's own canonicity marker, so it needs
        // no guess about which of two rows is the real fixture.
        game: { mergedIntoGameId: null },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        pick: true,
      },
      orderBy: { evaluatedAt: "desc" },
      // Bounds decisions SCANNED, not fixtures shown. GateDecision has no
      // unique constraint, so one game evaluated repeatedly could consume a
      // small cap and crowd every other fixture off the board before the
      // collapse below ever ran (Devin Review, #717). Sized well above a
      // realistic slate's decision count so the cap cannot silently drop a
      // fixture; the collapse then reduces this to one row per fixture and
      // market.
      take: 500,
    });

    if (decisions.length > 0) {
      const decisionEntries = decisions.map((decision): DedupeEntry => ({
        // Key built beside the row it belongs to. A parallel-index lookup
        // into `decisions` would break silently the day anyone filters this
        // list, and the failure would be a silently merged pick.
        key: boardDedupeKey(decision.gameId, decision.pick?.pickType),
        row: {
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
          ...extractRankingFromFb(decision.pick?.factorBreakdown, isPremiumViewer),
          gateReason: decision.status === "PUBLISHED" ? null : decision.reason,
          updatedAt: decision.evaluatedAt.toISOString(),
        },
      }));
      // Deduped BEFORE the lane split and before the counts below, so
      // openPicks/gatedToday/sportsWatched describe the rows a viewer is
      // actually shown. Deduping after the counts are taken would leave the
      // board's own numbers disagreeing with its own rows (C-117).
      const dedupedDecisionRows = dedupeBoardRows(decisionEntries);
      const scoringRows = dedupedDecisionRows.filter((row) => row.status === "SCORING_NOW");
      const publishedRows = dedupedDecisionRows.filter((row) => row.status === "PUBLISHED_TODAY");
      const gatedRows = dedupedDecisionRows.filter((row) => row.status === "GATED_TODAY");

      const modelVersion = decisions[0]?.modelVersion ?? MODEL_VERSION;
      return {
        data: {
          sportsWatched: new Set(dedupedDecisionRows.map((row) => row.sport)).size,
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
        liveBoardOn: liveBoardOn(),
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
          ...freshPickWhere(slateNow),
          game: { ...gameInSlateWindow(slate), mergedIntoGameId: null },
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
          // Same canonicity marker as the decision query. Two rows for one
          // fixture carry DIFFERENT ids, so the collapse below cannot pair
          // them; only excluding the tombstoned row can (Devin Review, #717).
          mergedIntoGameId: null,
        },
        include: { sport: { select: { name: true } } },
        orderBy: { commenceTime: "asc" },
        take: 8,
      }),
      db.game.findMany({
        where: {
          commenceTime: { gte: start, lt: end },
          picks: { none: publishedPickRelation },
          mergedIntoGameId: null,
        },
        include: { sport: { select: { name: true } } },
        orderBy: { commenceTime: "asc" },
        take: 12,
      }),
    ]);

  const publishedToday = [...publishedTodayRaw]
    .sort(comparePicksByRanking)
    .slice(0, 12);

  const publishedEntries = publishedToday.map((pick): DedupeEntry => ({
    key: boardDedupeKey(pick.gameId, pick.pickType),
    row: {
      id: pick.id,
      gameId: pick.gameId,
      matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
      sport: pick.game.sport.name,
      market: isPremiumViewer ? pick.selection : "ALL_MARKETS",
      status: "PUBLISHED_TODAY",
      // The per-pick fallback is withheld on book-less rows for non-premium viewers
      // (edgeScore = confidence - 50 there; lib/picks/public-edge-score.ts).
      edgeIndex: toEdgeIndex(
        pick.game.currentEdgeIndex ??
          publicEdgeScore(pick, { canSeeEdgeScore: true, canSeeConfidence: isPremiumViewer }),
      ),
      confidence: pick.confidence,
      ...extractRankingFromFb(pick.factorBreakdown, isPremiumViewer),
      gateReason: null,
      updatedAt: pick.generatedAt.toISOString(),
    },
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
    // Cross-lane collapse. The scoringNow query (commenceTime >= now,
    // SCHEDULED) and the gatedToday query (commenceTime today, no published
    // pick) overlap by construction: a game later today that is scheduled and
    // has no published pick satisfies both, and became `scoring-<id>` and
    // `gate-<id>` — same fixture, same market, two rows. Deduping the union and
    // re-splitting keeps the lane precedence explicit rather than letting
    // whichever query ran first win.
    const dedupedFallback = dedupeBoardRows([
      ...scoringRows.map((row) => ({ key: boardDedupeKey(row.gameId, null), row })),
      ...publishedEntries,
      ...gatedRows.map((row) => ({ key: boardDedupeKey(row.gameId, null), row })),
    ]);
    const scoringRowsFinal = dedupedFallback.filter((row) => row.status === "SCORING_NOW");
    const publishedRowsFinal = dedupedFallback.filter((row) => row.status === "PUBLISHED_TODAY");
    const gatedRowsFinal = dedupedFallback.filter((row) => row.status === "GATED_TODAY");

    const rowCount = scoringRowsFinal.length + publishedRowsFinal.length + gatedRowsFinal.length;
    const staleInfo =
      rowCount === 0 ? await detectStaleWhenEmpty() : { stale: false, schedulerLiveness: null };
    return {
      data: {
        sportsWatched: new Set(dedupedFallback.map((row) => row.sport)).size,
        booksPolled: Math.max(0, ...scoringNow.map((game) => game.bookmakerCoverageMax)),
        openPicks: publishedRowsFinal.length,
        gatedToday: gatedRowsFinal.length,
        lastRefresh: now.toISOString(),
        modelVersion,
        bootstrap: gates.isBootstrapMode,
        scoringNow: scoringRowsFinal,
        publishedToday: publishedRowsFinal,
        gatedTodayRows: gatedRowsFinal,
      },
      meta: buildBoardMeta({
        modelVersion,
        now,
        rows: {
          gatedTodayRows: gatedRowsFinal,
          publishedToday: publishedRowsFinal,
          scoringNow: scoringRowsFinal,
        },
        liveBoardOn: liveBoardOn(),
        bootstrap: gates.isBootstrapMode,
        staleDetected: staleInfo.stale,
        schedulerLiveness: staleInfo.schedulerLiveness ?? schedulerLiveness,
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
        liveBoardOn: liveBoardOn(),
        bootstrap: gates.isBootstrapMode,
      }),
    };
  }
}

/**
 * Viewer-facing redaction: confidence is PRO+ (canSeeConfidence). Mirrors the
 * rankingP pattern (GSE-SEC-026): redact inside the loader so no caller can
 * forget. Entitlement-less/internal callers already receive rankingP nulled;
 * confidence now follows the same rule.
 */
export function applyViewerRedaction(
  payload: BoardStatePayload,
  entitlements?: Entitlements,
): BoardStatePayload {
  return entitlements?.canSeeConfidence === true ? payload : redactBoardConfidence(payload);
}

export async function loadBoardState(
  now = new Date(),
  entitlements?: Entitlements,
): Promise<BoardStatePayload> {
  return applyViewerRedaction(await loadBoardStateInner(now, entitlements), entitlements);
}
