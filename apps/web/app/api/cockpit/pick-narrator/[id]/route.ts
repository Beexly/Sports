import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { narratePick } from "@/lib/cockpit/pick-narrator";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ScoredPick, FactorBreakdown } from "@sports/types";

/**
 * Cockpit pick-narrator by DB ID — admin-gated GET.
 *
 * Fetches a Pick from the database, constructs a ScoredPick from its
 * stored fields, and returns the editorial narrative without requiring
 * the operator to paste raw JSON. This powers "Narrate" links in the
 * cockpit history page.
 *
 * Source-level invariants enforced by tests:
 *   - dynamic = "force-dynamic"
 *   - auth() + 403 for non-admins
 *   - 404 when pick ID not found
 *   - delegates to narratePick (same call site as POST route)
 *   - rate-limited 10/min per user, fail-closed
 *   - Cache-Control: no-store
 *   - no DB writes; no publishedAt
 */
export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const userId = session.user.email ?? session.user.id ?? "anon-admin";
  const limit = await checkRateLimit(userId, {
    route: "cockpit-pick-narrator",
    windowMs: 60_000,
    maxRequests: 10,
    failureMode: "fail-closed",
  });
  if (!limit.allowed) {
    return jsonNoStore(
      {
        error: "Rate limit exceeded",
        retryAfter: limit.resetAt ? Math.ceil((limit.resetAt - Date.now()) / 1000) : 60,
      },
      429
    );
  }

  const { id } = params;
  if (!id || typeof id !== "string") {
    return jsonNoStore({ error: "Pick ID required" }, 400);
  }

  const pick = await db.pick.findUnique({
    where: { id },
    include: { game: { include: { sport: true } } },
  });
  if (!pick) {
    return jsonNoStore({ error: `Pick ${id} not found` }, 404);
  }

  const scoredPick: ScoredPick = {
    gameId: pick.gameId,
    pickType: pick.pickType as ScoredPick["pickType"],
    selection: pick.selection,
    line: pick.line,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    consensusPct: pick.consensusPct,
    bookmakerCount: pick.bookmakerCount,
    dataQualityScore: 75,
    tier: pick.tier as ScoredPick["tier"],
    pickGrade: pick.pickGrade as ScoredPick["pickGrade"],
    riskLevel: pick.riskLevel as ScoredPick["riskLevel"],
    reasoning: pick.reasoning,
    reasoningShort: pick.reasoningShort,
    factorBreakdown: (pick.factorBreakdown as unknown as FactorBreakdown) ?? {
      consensusScore: 0,
      marketDepthScore: 0,
      edgeScore: 0,
      lineMovementScore: 0,
      volatilityPenalty: 0,
      factors: [],
    },
    modelVersion: pick.modelVersion,
    dataFreshnessAt: pick.dataFreshnessAt ?? pick.generatedAt,
  };

  try {
    const result = await narratePick(scoredPick);
    return jsonNoStore(
      {
        pickId: id,
        sport: pick.game?.sport?.displayName ?? pick.game?.sport?.key ?? "unknown",
        game: `${pick.game?.awayTeamName ?? "?"} @ ${pick.game?.homeTeamName ?? "?"}`,
        ...result,
      },
      200
    );
  } catch (err) {
    return jsonNoStore(
      {
        error: "Narrator error",
        detail: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}
