import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";
import { getReadinessGates, toEdgeIndex } from "@sports/prediction-engine";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";

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

function passReason(bookmakerCoverageMax: number, dataQualityScore: number): string {
  if (bookmakerCoverageMax < 3) return "Market depth below publish threshold.";
  if (dataQualityScore < 70) return "Evidence health below publish threshold.";
  return "No pick cleared the publish threshold.";
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
    const gateDecisions = await db.gateDecision.findMany({
      where: {
        status: "GATED",
        isBootstrap: false,
        evaluatedAt: { gte: start, lt: end },
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
