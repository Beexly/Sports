import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, MODEL_VERSION, toEdgeIndex } from "@sports/prediction-engine";
import { collapseGameRowsToFixtures } from "@sports/ingestion-pipeline";
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
/**
 * How long after kickoff a game may still be counted as in progress.
 *
 * The scoring lane selects games that have STARTED and are not yet FINAL, but
 * a `status` of SCHEDULED outlives the game whenever result ingestion or
 * settlement fails. Without a lower bound those stale rows are eligible
 * forever and surface as SCORING_NOW on quiet slates (Devin Review, #717).
 * Eight hours covers the longest real game with margin — MLB's longest run to
 * about five — so anything older is a row that never got resolved, not a game
 * still being played.
 *
 * This bound applies to SCHEDULED rows only. See LIVE_ACTIVE_WINDOW_MS.
 */
const SCORING_ACTIVE_WINDOW_MS = 8 * 60 * 60 * 1000;

/**
 * The same staleness bound for rows the ingestion layer has marked LIVE.
 *
 * SCHEDULED past its kickoff is AMBIGUOUS — it means either "started" or "the
 * row was never updated" — which is why it needs the tight eight-hour bound.
 * LIVE is not ambiguous: it is a positive assertion that the game is in
 * progress, and applying the eight-hour bound to it silently DROPPED a
 * genuinely long or delayed game from the board entirely, since the gated lane
 * starts at `gt: now` and would not take it either (Devin Review, #719). A
 * rain-delayed MLB game or a lightning-suspended football game runs well past
 * eight hours.
 *
 * A bound is still needed, because a LIVE row also outlives the game when the
 * transition to FINAL fails. Twenty-four hours is the point past which the
 * assertion cannot be true of a single game session — a game suspended and
 * resumed the next day is settlement's problem, not the board's.
 */
const LIVE_ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Fallback-lane bounds (C-171). The SCAN limits are generous because they bound
 * rows read; the LANE limits are the numbers a viewer sees and are unchanged
 * from the caps they replace. Splitting them is the whole fix: the table holds
 * about 2.5 rows per real fixture with none tombstoned, so a cap applied before
 * the collapse showed a contest twice AND spent the lane on duplicates.
 */
const SCORING_FALLBACK_SCAN_LIMIT = 40;
const SCORING_LANE_LIMIT = 8;
const GATED_FALLBACK_SCAN_LIMIT = 60;
const GATED_LANE_LIMIT = 12;

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
  // A PUBLISHED row is a FACT, not an evaluation, so it wins outright.
  //
  // A published pick either exists or it does not; nothing the gate decides
  // afterwards makes it stop existing. Letting a newer GATED_TODAY row displace
  // it would tell a subscriber "we passed on this" about a fixture they can see
  // a live pick for, which is the same false label C-136 and C-141 are about.
  const candidatePublished = candidate.status === "PUBLISHED_TODAY";
  const heldPublished = held.status === "PUBLISHED_TODAY";
  if (candidatePublished !== heldPublished) return candidatePublished;

  // Between the two EVALUATION lanes, newest wins - lane rank does not.
  //
  // SCORING_NOW ranks above GATED_TODAY for display ordering, and comparing that
  // rank first meant an OLDER "scoring" decision beat a NEWER "gated" one on the
  // same fixture, so the board showed a state the model had already moved on
  // from (CodeRabbit, #719). Lane rank survives only as the tie-break for two
  // rows evaluated at the same instant.
  //
  // Note this is narrower than the reviewer's suggestion of comparing timestamps
  // before lane rank unconditionally: that ordering would let a newer GATED row
  // displace an older PUBLISHED one, which is the bug the block above prevents.
  if (candidate.updatedAt !== held.updatedAt) return candidate.updatedAt > held.updatedAt;
  const laneDelta = LANE_RANK[candidate.status] - LANE_RANK[held.status];
  if (laneDelta !== 0) return laneDelta < 0;
  // GateDecision rows are repeated evaluations of the same game over time, and
  // confidence can legitimately FALL between them as the line moves. Ranking on
  // confidence first meant an older, stronger reading beat the newer downgrade,
  // so a subscriber was shown a number the model no longer stood behind
  // (Devin Review, #717). Confidence and edge stay as tie-breakers for rows
  // evaluated at the same instant.
  const conf = (candidate.confidence ?? -1) - (held.confidence ?? -1);
  if (conf !== 0) return conf > 0;
  const edge = (candidate.edgeIndex ?? -1) - (held.edgeIndex ?? -1);
  if (edge !== 0) return edge > 0;
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
        game: {
          include: {
            sport: { select: { name: true } },
            // EXISTENCE PROBE FOR A LIVE PUBLISHED PICK, and it is the sibling
            // of a filter passes.ts has had all along (`game.picks.none` on its
            // gated query, line ~159). This lane could only learn that a
            // fixture was published from a PUBLISHED GateDecision inside
            // TODAY's window, so a pick published yesterday and still live
            // today - or one whose decision fell outside this query at all -
            // left the fixture looking un-published, and a GATED row for it
            // rendered as "we passed on this" while a subscriber could see the
            // pick (Devin Review, #719, round 38).
            //
            // `take: 1` makes this a boolean, not a list: the id is never read
            // and no cap can truncate an answer that only has to be
            // present-or-absent. It cannot be a `where` on the query itself,
            // because that would also exclude the PUBLISHED decisions this
            // lane exists to show.
            picks: { where: publishedPickRelation, select: { id: true }, take: 1 },
          },
        },
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

    // A PUBLISHED decision is only a published pick while its pick IS STILL
    // PUBLISHED.
    //
    // GateDecision records what we decided at a moment in time; Pick.isPublished
    // records what is live now. Nothing kept them in step, so a withdrawn pick
    // kept its PUBLISHED_TODAY row AND kept suppressing that fixture's gated row
    // (Devin Review, #719). Measured on production 2026-09-07: 84 PUBLISHED
    // decisions already point at picks with isPublished=false, so this is a live
    // defect, not a forward risk - and the corrupted-pick remediation
    // (scripts/ops/unpublish-corrupted-picks.ts) withdraws 586 more, every one of
    // which would have stayed on the board looking published. A remediation the
    // product surface ignores is not a remediation.
    //
    // Withdrawn rows are DROPPED rather than relabelled. There is no honest lane
    // for them: GATED_TODAY would claim we evaluated and passed, which is false -
    // we published and then withdrew - and a published decision carries no
    // `reason` to show. Dropping also leaves the fixture free to be picked up by
    // the fallback lanes on their own predicates.
    //
    // Fail closed when the link is absent. Measured on the same read, all 811
    // PUBLISHED decisions carry a resolvable pick row and all 356 GATED ones
    // carry none, so the null branch costs nothing today; it is here so a broken
    // reference can never render as a published pick that does not exist.
    const displayableDecisions = decisions.filter(
      (decision) => decision.status !== "PUBLISHED" || decision.pick?.isPublished === true,
    );

    if (displayableDecisions.length > 0) {
      const decisionEntries = displayableDecisions.map((decision): DedupeEntry => ({
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
      // Same published-suppression the fallback path applies, and it belongs
      // here too: GateDecision rows are historical and the query does not make
      // PUBLISHED and GATED mutually exclusive, so one game can carry both. A
      // published decision keys on its real pickType and a gated one on
      // NO_PICK, so their keys never collide and the collapse cannot pair them
      // — the board showed a published row and a "we passed on this" row for
      // the same fixture. Multiple genuine published markets on one game are
      // preserved; only the generic rows are dropped (Devin Review, #717).
      // SUPPRESSION IS NOT THE SAME QUESTION AS DISPLAY, AND A LIVE PICK IS NOT
      // AN EVALUATION.
      //
      // Two different rules, for the same reason `outranks` treats a published
      // row as a fact rather than a reading:
      //
      //   LIVE publication  - the pick EXISTS right now. It suppresses every
      //                       generic row for that fixture unconditionally,
      //                       whatever was evaluated afterwards, because
      //                       "we passed on this" is false while a subscriber
      //                       can see the pick (C-136, C-141).
      //   WITHDRAWN one     - there is no live fact left, only history, so
      //                       chronology decides. It still resolves order even
      //                       though it cannot be shown: an OLDER gated
      //                       evaluation must not resurface as the fixture's
      //                       current state, because we evaluated, published and
      //                       withdrew, and reverting to an earlier "we passed"
      //                       misrepresents that sequence (Devin Review, #719).
      //                       A genuinely NEWER gated evaluation still displays.
      //
      // KNOWN LIMITATION, and it is C-158's missing column showing a second
      // face (Devin Review, #719, round 37). The watermark is the
      // PUBLICATION's evaluatedAt, because that is the only timestamp either
      // board lane has. It is not the WITHDRAWAL's. So "published at T1,
      // evaluated gated at T2, withdrawn at T3" is indistinguishable in the
      // data from "published at T1, withdrawn at T2, evaluated gated at T3",
      // and only the second is honestly a pass. In the first, the T2 gated row
      // survives this rule and displays as the fixture's current state even
      // though a published pick was live at the moment it was evaluated.
      //
      // It cannot be fixed here: Pick.isPublished is a bare Boolean
      // (schema.prisma:550) with nowhere to record WHEN it flipped, and the
      // schema and migrations are frozen for agents by AGENTS.md law 2. So
      // C-158's suggested shape needs a TIMESTAMP (`unpublishedAt`) and not
      // only an `unpublishedReason`.
      //
      // The one fix available without that column - suppress every gated row
      // for any withdrawn fixture - is worse, and that is a judgement rather
      // than a measurement: it silences the board on games we have an honest
      // current answer for, which is exactly what C-149 was written to stop.
      // Bounded and named beats broad and quiet. Pinned by a test that says in
      // its own body that it should be REPLACED when the column lands.
      const livePublishedGameIds = new Set([
        ...decisionEntries
          .filter((entry) => entry.row.status === "PUBLISHED_TODAY")
          .map((entry) => entry.row.gameId),
        // The probe above, unioned in. A fixture is suppressed because a pick
        // is LIVE, which is a fact about Pick.isPublished now - not about
        // whether this query happened to return the decision that published it.
        ...decisions.filter((d) => d.game.picks.length > 0).map((d) => d.gameId),
      ]);
      const newestWithdrawnPublishedAt = new Map<string, number>();
      for (const decision of decisions) {
        if (decision.status !== "PUBLISHED") continue;
        if (decision.pick?.isPublished === true) continue;
        const at = decision.evaluatedAt.getTime();
        const seen = newestWithdrawnPublishedAt.get(decision.gameId);
        if (seen === undefined || at > seen) newestWithdrawnPublishedAt.set(decision.gameId, at);
      }
      const supersededByPublication = (entry: DedupeEntry): boolean => {
        if (livePublishedGameIds.has(entry.row.gameId)) return true;
        const withdrawnAt = newestWithdrawnPublishedAt.get(entry.row.gameId);
        if (withdrawnAt === undefined) return false;
        return Date.parse(entry.row.updatedAt) <= withdrawnAt;
      };
      const dedupedDecisionRows = dedupeBoardRows(
        decisionEntries.filter(
          (entry) => entry.row.status === "PUBLISHED_TODAY" || !supersededByPublication(entry),
        ),
      );
      const scoringRows = dedupedDecisionRows.filter((row) => row.status === "SCORING_NOW");
      const publishedRows = dedupedDecisionRows.filter((row) => row.status === "PUBLISHED_TODAY");
      const gatedRows = dedupedDecisionRows.filter((row) => row.status === "GATED_TODAY");

      // RETURN ON ROWS, NOT ON CANDIDATES (Devin Review, #719).
      //
      // This branch is entered when any decision is DISPLAYABLE, but the
      // chronology rule above can then supersede every one of them: a fixture
      // whose only surviving row is a gated evaluation OLDER than a withdrawn
      // publication drops out here by design. Returning at that point handed
      // the caller a board with three empty lanes and skipped the fallback
      // pick and game queries entirely, so one withdrawal could blank the
      // WHOLE board - including live published picks on other fixtures that
      // the fallback lane would have found. The C-149 comment already said the
      // fixture "drops out of the decision path entirely and the fallback
      // lanes judge it on their own predicates"; the code did not do that, and
      // the test that pins the rule stubbed both fallback queries empty, so it
      // could not tell an empty board from a fallback that never ran.
      //
      // The chronology rule is unchanged: superseded rows do not display
      // either way. They simply stop being a reason to answer at all.
      if (dedupedDecisionRows.length > 0) {
        const modelVersion = displayableDecisions[0]?.modelVersion ?? MODEL_VERSION;
        return {
          data: {
            sportsWatched: new Set(dedupedDecisionRows.map((row) => row.sport)).size,
            booksPolled: Math.max(0, ...displayableDecisions.map((decision) => decision.game.bookmakerCoverageMax)),
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
    }

    const [publishedTodayRaw, scoringNowRaw, gatedTodayRaw] = await Promise.all([
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
          // SCORING_NOW must mean a game that is actually being scored. This
          // query previously selected `commenceTime >= now AND status
          // SCHEDULED` — games that have NOT started — and every one of them
          // was labelled SCORING_NOW. Suppressing only the ones that overlapped
          // today's gated window left every game FURTHER out still claiming to
          // be scoring, which is the same false claim with a smaller blast
          // radius (Devin Review, #717).
          //
          // GameStatus carries a real LIVE value, so the truthful set is games
          // that have started and are not yet FINAL. A game that has not kicked
          // off belongs to the gated lane, which describes it honestly.
          // STARTED, and started recently enough to still be in progress.
          //
          // `lte: now` alone had no lower bound, so any historical row still
          // marked SCHEDULED — a game whose result ingestion or settlement
          // failed — stayed eligible forever and would surface as SCORING_NOW
          // on a quiet slate, indefinitely (Devin Review, #717). A game cannot
          // still be playing eight hours after first pitch; the longest MLB
          // games run to about five.
          //
          // The bound is PER STATUS, not shared. One eight-hour window across
          // both values dropped a LIVE game older than eight hours off the
          // board completely — the gated lane starts at `gt: now` and does not
          // take it either — so a rain delay made an in-progress game vanish
          // rather than mislabel it (Devin Review, #719). SCHEDULED needs the
          // tight bound because it is ambiguous past kickoff; LIVE is a
          // positive assertion and gets the wider one.
          OR: [
            {
              status: "LIVE",
              commenceTime: { lte: now, gte: new Date(now.getTime() - LIVE_ACTIVE_WINDOW_MS) },
            },
            {
              status: "SCHEDULED",
              commenceTime: {
                lte: now,
                gte: new Date(now.getTime() - SCORING_ACTIVE_WINDOW_MS),
              },
            },
          ],
          // Same canonicity marker as the decision query. Two rows for one
          // fixture carry DIFFERENT ids, so the collapse below cannot pair
          // them; only excluding the tombstoned row can (Devin Review, #717).
          mergedIntoGameId: null,
        },
        // `key` as well as `name`: the per-fixture collapse below picks its twin
        // window from the sport key, and baseball's is 2h so a doubleheader
        // stays two contests. Omitting it silently takes the 18h default.
        include: {
          sport: { select: { name: true, key: true } },
          _count: { select: { picks: true, odds: true, oddsLineSnapshots: true } },
        },
        // Most recently started first: a live game is more useful at the top of
        // the lane than one that began hours ago.
        orderBy: { commenceTime: "desc" },
        take: SCORING_FALLBACK_SCAN_LIMIT,
      }),
      db.game.findMany({
        where: {
          // NOT started. The two fallback lanes are now disjoint BY PREDICATE
          // rather than by a precedence rule applied afterwards.
          //
          // This previously read `gte: start`, the top of today's slate, so a
          // game that had already kicked off satisfied BOTH lanes. The
          // suppression that resolved the overlap dropped the scoring row, so a
          // started game kept reading GATED_TODAY after kickoff — the exact
          // false label the scoring-query fix was meant to remove, inverted
          // (Devin Review, #717). Two queries that cannot both match a game are
          // a stronger guarantee than any tie-break between them.
          // STRICT lower bound. Scoring owns the exact instant via `lte: now`,
          // so `gte` here would put a game kicking off at exactly `now` in BOTH
          // lanes, which is the overlap this split exists to remove
          // (CodeRabbit, #719). Inclusive-inclusive is not disjoint.
          commenceTime: { gt: now, lt: end },
          picks: { none: publishedPickRelation },
          mergedIntoGameId: null,
        },
        include: {
          sport: { select: { name: true, key: true } },
          _count: { select: { picks: true, odds: true, oddsLineSnapshots: true } },
        },
        orderBy: { commenceTime: "asc" },
        take: GATED_FALLBACK_SCAN_LIMIT,
      }),
    ]);

  // ONE ROW PER FIXTURE IN BOTH FALLBACK LANES (C-171).
  //
  // The comment on the scoring query's `mergedIntoGameId` filter says it
  // straight: "Two rows for one fixture carry DIFFERENT ids, so the collapse
  // below cannot pair them; only excluding the tombstoned row can." That was
  // right, and the merge it depends on has never run - zero rows are tombstoned
  // in any sport - so the board could and did show one contest twice, with the
  // duplicates eating the lane's slots.
  //
  // The cap is therefore a SCAN bound now and the display cap comes after the
  // collapse: the fifth time tonight the same repair has been the right one.
  const scoringNow = collapseGameRowsToFixtures(scoringNowRaw).slice(0, SCORING_LANE_LIMIT);
  const gatedToday = collapseGameRowsToFixtures(gatedTodayRaw).slice(0, GATED_LANE_LIMIT);

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
    // A generic lane row is suppressed for any fixture already represented by a
    // more specific one. The collapse alone cannot do this: published rows key
    // on the real pickType so one fixture can legitimately hold several, while
    // the generic lanes key on NO_PICK, so their keys never collide by
    // construction and both rows survive (Devin Review, #717).
    //
    // Lane precedence also cannot resolve the scoring/gated overlap here, and
    // reversing it would be wrong for the decision path. The scoring query
    // selects `commenceTime >= now AND status SCHEDULED` — games that have NOT
    // started — so on THIS path a "scoring" row is never more truthful than the
    // gated row for the same fixture, whatever LANE_RANK says. A game that has
    // not started is gated, not being scored, and telling a viewer otherwise is
    // the kind of claim this product does not make.
    // The scoring and gated queries are now disjoint by predicate — started
    // versus not started — so there is nothing left to arbitrate between them,
    // and the gated-versus-scoring half of this suppression has been REMOVED.
    // It was not merely redundant: with the lanes fixed it would have dropped
    // the scoring row of a started game and left it labelled GATED_TODAY after
    // kickoff (Devin Review, #717).
    //
    // The published half stays. Published rows key on the real pickType and the
    // generic lanes on NO_PICK, so their keys never collide and the collapse
    // cannot pair them; only excluding the fixture can.
    const publishedGameIds = new Set(publishedEntries.map((e) => e.row.gameId));
    const scoringRowsScoped = scoringRows.filter((row) => !publishedGameIds.has(row.gameId));
    const gatedRowsScoped = gatedRows.filter((row) => !publishedGameIds.has(row.gameId));

    const dedupedFallback = dedupeBoardRows([
      ...scoringRowsScoped.map((row) => ({ key: boardDedupeKey(row.gameId, null), row })),
      ...publishedEntries,
      ...gatedRowsScoped.map((row) => ({ key: boardDedupeKey(row.gameId, null), row })),
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
