/**
 * B2B model signals — research/intelligence grade while RED.
 * No verified ROI / PROVEN claims in payload.
 */

import { NextResponse } from "next/server";
import {
  authorizeB2bApiKey,
  extractB2bApiKey,
  rateLimitB2b,
} from "@/lib/b2b/api-key-auth";
import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorizeB2bApiKey(req)) {
    return NextResponse.json(
      { error: "Unauthorized — provide x-api-key (GSE_B2B_API_KEYS)" },
      { status: 401 },
    );
  }
  const key = extractB2bApiKey(req) ?? "";
  const rl = rateLimitB2b(key);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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
