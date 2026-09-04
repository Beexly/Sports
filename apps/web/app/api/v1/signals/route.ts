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
      take: 50,
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
      data: [...picks]
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
            // Field gate: confidence is a PAID metric ("Free — 2 picks/day
            // teaser, NO confidence scores"), so a free-scope key gets null even
            // on the FREE-tier rows the row filter above lets it see. Mirrors
            // app/api/picks/route.ts, which nulls confidence for this same
            // viewer. The KEYS are kept and set to null rather than dropped:
            // this is a published response shape, and existing consumers read
            // `.modelConfidence` / `.rankingP` directly.
            modelConfidence: scope === "premium" ? p.confidence : null,
            rankingP: scope === "premium" ? rankingP : null,
            modelVersion: p.modelVersion,
            generatedAt: p.generatedAt,
            // Sort key is derived from the UNDERLYING model values regardless of
            // scope, so nulling the two fields above cannot silently degrade the
            // ordering. Stripped before the row is emitted.
            _sort: rankingP ?? p.confidence / 100,
          };
        })
        .sort((a, b) => b._sort - a._sort)
        .map(({ _sort, ...row }) => row),
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
