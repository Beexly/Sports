import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, toEdgeIndex } from "@sports/prediction-engine";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";
import { unevaluatedPassReason } from "./pass-reason";

/**
 * The auditable trail behind a refusal. Every field here is REAL data already
 * persisted on `gate_decisions` — none of it is derived, estimated, or
 * generated for display.
 *
 * This is the PAID layer of the No-Bet surface. The refusal itself and its
 * human-readable reason stay free on every tier: that a pick was declined IS
 * the product's credibility claim, and gating it would turn the pitch into
 * "more picks". What converts is wanting the machine-readable code, the model
 * version that made the call, and the evidence behind it.
 *
 * Withheld SERVER-SIDE (see `includeNoBetDetail`), never merely hidden in the
 * markup — an unentitled response must not carry the payload at all.
 */
export interface NoBetDetail {
  /** Machine-readable refusal code — which gate tripped. */
  reasonCode: string;
  /** Model confidence at refusal time. A diagnostic, NOT a performance claim. */
  confidence: number | null;
  /** Which model version declined it — makes a refusal reproducible. */
  modelVersion: string;
  /**
   * How many evidence references were attached. A COUNT, deliberately not the
   * raw `evidenceRefs` JSON: that column is free-form and could carry
   * arbitrary internal payload to a browser.
   */
  evidenceRefCount: number;
}

export interface PassListRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  edgeIndex: number | null;
  reason: string;
  evaluatedAt: string;
  /** Present ONLY when the caller passed `includeNoBetDetail`. */
  detail?: NoBetDetail;
}

export interface LoadBoardPassesOptions {
  /**
   * Include the auditable refusal trail. The caller establishes entitlement
   * (`Entitlements.canSeeNoBetDetail`); this module deliberately does not read
   * the session itself, so the access decision lives at the page/route
   * boundary rather than being duplicated here where it could drift.
   */
  includeNoBetDetail?: boolean;
}

/** Count evidence refs without letting the raw JSON escape to a client. */
function countEvidenceRefs(refs: unknown): number {
  if (Array.isArray(refs)) return refs.length;
  if (refs !== null && typeof refs === "object") return Object.keys(refs).length;
  return 0;
}

export interface BoardPassesPayload {
  data: { date: string; passes: PassListRow[] };
  meta: { isSampleData: boolean; suppressedDemoData?: boolean; dataError?: "DB_UNREACHABLE" };
}

function todayBounds(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// The reason for a no-published-pick row lives in ./pass-reason.ts, shared with
// loadBoardState — /board renders both lanes at once and they can describe the
// same game, so deriving the wording twice let them disagree in public.

/**
 * Collapse repeated evaluations of one fixture to a single, newest pass row.
 *
 * Exported so the collapse can be asserted without a database. Callers must pass
 * rows already ordered newest-first (`orderBy: [{ evaluatedAt: "desc" }, { id: "desc" }]`), which
 * is what makes "first seen wins" correct; the function does not re-sort,
 * because sorting here would hide an ordering mistake at the query instead of
 * surfacing it.
 */
export function dedupePassesByGame<T extends { gameId: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.gameId)) continue;
    seen.add(row.gameId);
    out.push(row);
  }
  return out;
}

export async function loadBoardPasses(
  now = new Date(),
  options: LoadBoardPassesOptions = {},
): Promise<BoardPassesPayload> {
  const includeDetail = options.includeNoBetDetail === true;
  const demoActive = isStubMode() && isDemoPicksEnabled();

  // Stale-Data Kill Switch (default OFF via FORCE_NO_BET_IF_STALE). When ON and
  // the latest successful ingestion is "stale" per the shared Refresh SLA,
  // suppress the Pass List the same way the demo path does — empty passes — so
  // the public board never surfaces a stale slate (CLAUDE.md #5). Fail OPEN on a
  // DB error so a transient blip can't black out a fresh board.
  const staleSuppressed =
    getReadinessGates().forceNoBetIfStale &&
    (await isPublicPicksSurfaceStale(now).catch(() => false));

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

  const { start, end } = todayBounds();
  try {
    const [allGatedRows, publishedDecisionRows] = await Promise.all([
      db.gateDecision.findMany({
        where: {
          status: "GATED",
          isBootstrap: false,
          evaluatedAt: { gte: start, lt: end },
          // A game with a LIVE PUBLISHED PICK is not a pass, whatever an earlier
          // decision row says.
          //
          // `publishedPickRelation` was declared in this file and applied only to
          // the fallback game query below; the decision query above it had no
          // published exclusion at all. So the board could show a subscriber a
          // published pick in one section and "evaluated without publishing" for
          // the same fixture in the other (Devin Review, #719). The state loader
          // got this suppression in c0cfa2b07 and its sibling here did not, which
          // is the thirteenth time in this PR's history that a fix landed on one
          // lane and not on its twin.
          //
          // Game-level, matching the state loader, because a PassListRow names a
          // fixture and carries no market: there is no market on the row for a
          // per-market exclusion to be honest about.
          game: { picks: { none: publishedPickRelation } },
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        // TOTAL ORDER, not just a sort key (Devin Review, #719).
        //
        // dedupePassesByGame keeps the FIRST row per fixture and deliberately
        // does not re-sort, so the query ordering IS the tie-break. On
        // `evaluatedAt` alone, two evaluations of one fixture written in the
        // same millisecond leave the winner to whatever order postgres happens
        // to return, and two identical board loads could show different reasons
        // and confidences for the same game - the C-117 contradiction again,
        // this time nondeterministic and so not reproducible from a screenshot.
        //
        // MEASURED before fixing: across all 356 GATED decisions in production,
        // ZERO (gameId, evaluatedAt) pairs carry more than one row, so this has
        // never fired. It is a one-line total order broken by a column that is
        // already unique, and the cost of leaving it latent is a bug nobody
        // could reproduce from a report.
        orderBy: [{ evaluatedAt: "desc" }, { id: "desc" }],
        // Bounds decisions SCANNED, not fixtures shown - the collapse below
        // reduces this to one row per fixture.
        //
        // This was 100, and 100 was ALREADY TRUNCATING REAL DAYS. Measured
        // read-only on production 2026-09-07: a single day has produced 305 GATED
        // rows across 58 distinct fixtures, with at most 6 evaluations for any one
        // fixture. So the cap was silently dropping genuine passes off the end of
        // the list today, and a fixture evaluated repeatedly could crowd others out
        // entirely (Devin Review and CodeRabbit, #719). 500 matches the bound the
        // decision query in state.ts already uses for the same reason, and leaves
        // headroom over the worst day observed.
        take: 500,
      }),
      // WITHDRAWN PUBLICATIONS, so an OLDER pass cannot outlive one.
      //
      // THE FOURTEENTH SIBLING-LANE INSTANCE (CodeRabbit, #719). The query
      // above excludes a game that has a LIVE published pick, which is the
      // right rule for a live publication and no rule at all for a withdrawn
      // one: once the pick is unpublished the relation matches again, and an
      // OLDER gated evaluation for that fixture reappears as a current pass.
      // "We passed on this" is then false in the strongest way the pass list
      // can be false - we evaluated it, published it, and withdrew it. C-149
      // fixed exactly this in the state loader and left its twin here.
      //
      // Same rule as state.ts, deliberately: a withdrawn publication cannot be
      // SHOWN, but it still RESOLVES ORDER. It suppresses gated rows at or
      // older than itself; a genuinely NEWER gated evaluation still displays,
      // because that one really is the fixture's current state.
      //
      // Same KNOWN LIMITATION as the state lane, stated there in full
      // (state.ts, the newestWithdrawnPublishedAt comment; Devin Review, #719,
      // round 37): the watermark is the PUBLICATION's evaluatedAt, not the
      // WITHDRAWAL's, because Pick.isPublished is a bare Boolean with no
      // timestamp. A gated evaluation made while a pick was still live, on a
      // fixture withdrawn afterwards, therefore survives this rule and lists as
      // a pass. Fixing it needs the C-158 provenance column, which is frozen
      // for agents by AGENTS.md law 2. Pinned by a test in
      // board-passes-published-suppression.test.ts.
      // AGGREGATED, NOT PAGED, and that is the whole point (CodeRabbit, #719).
      //
      // My first version of this was a findMany with `take: 500` and NO
      // ordering, which is the same class of defect this file keeps producing:
      // a cap applied BEFORE the per-fixture collapse. Production holds 811
      // PUBLISHED decisions, so an arbitrary 500 of them would have been kept
      // and a fixture whose withdrawal fell outside that slice would have had
      // its OLD gated row displayed as a current pass - the exact false claim
      // this query exists to prevent, reintroduced by the query itself.
      //
      // groupBy computes max(evaluatedAt) per gameId in the DATABASE, so there
      // is no window to truncate and no cap to size. The filter is also the
      // guarantee now: only a WITHDRAWN publication is selected, so nothing
      // downstream has to re-assert what the rows are.
      db.gateDecision.groupBy({
        by: ["gameId"],
        where: {
          status: "PUBLISHED",
          isBootstrap: false,
          evaluatedAt: { gte: start, lt: end },
          // Withdrawn, or a broken link. A LIVE publication is already handled
          // by the picks-none relation on the query above, and must NOT
          // suppress by chronology as well - see the test that pins the two
          // mechanisms apart.
          OR: [{ pick: null }, { pick: { isPublished: false } }],
        },
        _max: { evaluatedAt: true },
      }),
    ]);

    const newestWithdrawnPublishedAt = new Map<string, number>();
    for (const row of publishedDecisionRows) {
      const at = row._max?.evaluatedAt?.getTime();
      if (at === undefined) continue;
      newestWithdrawnPublishedAt.set(row.gameId, at);
    }

    const gateDecisionRows = allGatedRows.filter((row) => {
      const withdrawnAt = newestWithdrawnPublishedAt.get(row.gameId);
      return withdrawnAt === undefined || row.evaluatedAt.getTime() > withdrawnAt;
    });

    // ONE ROW PER FIXTURE, newest evaluation.
    //
    // GateDecision has no unique constraint and this query takes the latest 100
    // with no per-game collapse, so a game evaluated repeatedly in a day became
    // several pass rows carrying different reasons and confidences - the same
    // contradiction C-117 fixed on the board itself. `orderBy evaluatedAt desc`
    // means the first row seen for a gameId is already the newest.
    const gateDecisions = dedupePassesByGame(gateDecisionRows);

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
            // Server-side redaction: an unentitled caller's payload never
            // contains `detail` at all, so there is nothing to leak in the
            // markup, the RSC flight data, or the JSON route.
            ...(includeDetail
              ? {
                  detail: {
                    reasonCode: decision.reasonCode,
                    confidence: decision.confidence,
                    modelVersion: decision.modelVersion,
                    evidenceRefCount: countEvidenceRefs(decision.evidenceRefs),
                  },
                }
              : {}),
          })),
        },
        meta: { isSampleData: false },
      };
    }

    const games = await db.game.findMany({
      where: {
        commenceTime: { gte: start, lt: end },
        picks: { none: publishedPickRelation },
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
      reason: unevaluatedPassReason(game.bookmakerCoverageMax, game.dataQualityScore),
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
