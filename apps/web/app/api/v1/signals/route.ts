/**
 * B2B model signals — research/intelligence grade while RED.
 * No verified ROI / PROVEN claims in payload.
 */

import { NextResponse } from "next/server";
import {
  extractB2bApiKey,
  resolveB2bKeyScope,
  rateLimitB2b,
} from "@/lib/b2b/api-key-auth";
import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";
import { dropAdverseEdgePicks } from "@/lib/picks/adverse-edge-suppression";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // Scope decides whether this key may see PREMIUM rows. A bare key is FREE-only.
  const scope = resolveB2bKeyScope(req);
  if (scope === null) {
    return NextResponse.json(
      { error: "Unauthorized — provide x-api-key (GSE_B2B_API_KEYS)" },
      { status: 401 },
    );
  }
  const key = extractB2bApiKey(req) ?? "";
  const rl = await rateLimitB2b(key);
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.status === 429 ? "Rate limit exceeded" : "Rate limit service unavailable" },
      { status: rl.status },
    );
  }

  const gates = getReadinessGates();
  const claimPosture =
    gates.canExposePerformanceStats
      ? "gated_performance_may_apply"
      : "experimental_research_grade_not_verified_roi";

  if (isStubMode()) {
    return NextResponse.json({
      schemaVersion: "v1",
      surface: "signals",
      claimPosture,
      boardSurface: resolveBoardSurface(),
      data: [],
      note: "Stub mode — no rows.",
    });
  }

  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
        // Tier gate: only a :premium-scoped key sees PREMIUM rows. Without this the
        // route emitted Pro-gated confidence + factorBreakdown for the whole board.
        ...(scope === "premium" ? {} : { tier: "FREE" as const }),
      },
      orderBy: { generatedAt: "desc" },
      // Over-fetch so the adverse-edge filter below runs BEFORE the 50-row cap,
      // the same ordering /api/picks and lib/board/state.ts use. Capping first
      // would let a row we are about to drop consume one of the 50 slots and
      // then vanish, so a consumer asking for 50 signals would silently get
      // fewer for a reason the payload never states.
      take: 80,
      select: {
        id: true,
        pickType: true,
        confidence: true,
        selection: true,
        line: true,
        generatedAt: true,
        modelVersion: true,
        factorBreakdown: true,
        game: {
          select: {
            commenceTime: true,
            sport: { select: { key: true } },
            homeTeamName: true,
            awayTeamName: true,
          },
        },
      },
    })
    .catch(() => []);

  return NextResponse.json(
    {
      schemaVersion: "v1",
      surface: "signals",
      claimPosture,
      lineLabel:
        resolveBoardSurface() === "signal" ? "model_signal" : "may_include_market_context",
      boardSurface: resolveBoardSurface(),
      /*
       * ADVERSE-EDGE SUPPRESSION ON THE B2B SURFACE.
       *
       * /api/picks and lib/board/state.ts both drop rows whose own
       * `factorBreakdown.independentEdge.expectedClv` is negative: the engine
       * priced that side worse than the market, so it is a bet our own model
       * says loses. Neither v1 route applied the rule, so a row the board and
       * the consumer app suppress was still emitted here by name, line and
       * confidence to every API consumer. A partner integrating against v1 was
       * getting exactly the rows we had decided not to show.
       *
       * IMPORTS the predicate rather than restating it (via
       * dropAdverseEdgePicks -> pricesWorseThanMarket in @sports/types). Two
       * gates spelling one rule two ways is how they drift, and a drift in this
       * direction publishes a row the engine said to withhold.
       *
       * Absence is SILENCE: a missing, non-finite or unparseable breakdown
       * KEEPS the row. If that asymmetry ever inverts, a parse bug becomes a
       * silent board wipe on the partner surface.
       *
       * Writes nothing. `isPublished` is untouched, so a suppressed row still
       * settles and still counts in the published record, win or lose.
       */
      data: dropAdverseEdgePicks(picks)
        .slice(0, 50)
        .map((p) => {
          let rankingP: number | null = null;
          const fb = p.factorBreakdown;
          if (fb && typeof fb === "object" && !Array.isArray(fb)) {
            const rp = (fb as Record<string, unknown>)["rankingP"];
            if (typeof rp === "number" && Number.isFinite(rp)) rankingP = rp;
          }
          return {
            id: p.id,
            sport: p.game?.sport?.key ?? null,
            home: p.game?.homeTeamName ?? null,
            away: p.game?.awayTeamName ?? null,
            commenceTime: p.game?.commenceTime ?? null,
            market: p.pickType,
            selection: p.selection,
            line: p.line,
            modelConfidence: p.confidence,
            rankingP,
            modelVersion: p.modelVersion,
            generatedAt: p.generatedAt,
          };
        })
        .sort((a, b) => {
          const ra = a.rankingP ?? a.modelConfidence / 100;
          const rb = b.rankingP ?? b.modelConfidence / 100;
          return rb - ra;
        }),
      disclaimer:
        "Sports intelligence API — model signals only. Not verified ROI, not PROVEN track record while eligibility RED.",
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "Cache-Control": "no-store",
      },
    },
  );
}
