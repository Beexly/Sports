/**
 * GET /api/ops/ranked-picks
 *
 * Owner read of the published slate. Same rows the entitled board shows,
 * with confidence and grade included. No free-tier daily cap.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> via hasOpsAuth. Fails closed
 * when the secret is unset. Never accepts x-vercel-cron.
 *
 * Query:
 *   date=YYYY-MM-DD   Central slate day (default: today)
 *   sport=NCAAF       matches sport key or name, case-insensitive
 *   limit=1..400      default 200
 *   order=confidence  default. "edge" sorts by expectedClv instead.
 */
import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { hasOpsAuth } from "@/lib/ops/ops-auth";
import { freshPickWhere } from "@/lib/board/stale-pick-policy";
import { gameInSlateWindow, resolveSlateWindow } from "@/lib/picks/slate-window";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import { displaySelection } from "@/lib/picks/display-selection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readNumber(fb: unknown, key: string): number | null {
  if (!fb || typeof fb !== "object") return null;
  const value = (fb as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readExpectedClv(fb: unknown): number | null {
  if (!fb || typeof fb !== "object") return null;
  const edge = (fb as Record<string, unknown>)["independentEdge"];
  if (!edge || typeof edge !== "object") return null;
  const clv = (edge as Record<string, unknown>)["expectedClv"];
  return typeof clv === "number" && Number.isFinite(clv) ? clv : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!hasOpsAuth(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const now = new Date();
  const slate = resolveSlateWindow(url.searchParams.get("date"), now);
  const sport = (url.searchParams.get("sport") ?? "").trim();
  const order = url.searchParams.get("order") === "edge" ? "edge" : "confidence";
  const rawLimit = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(rawLimit) ? Math.min(400, Math.max(1, Math.floor(rawLimit))) : 200;

  const excludeSeed =
    process.env.NODE_ENV === "production" ? { NOT: { modelVersion: "v5.0.0-seed" } } : {};

  const rows = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      ...excludeSeed,
      ...freshPickWhere(now),
      game: {
        dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE },
        mergedIntoGameId: null,
        ...gameInSlateWindow(slate),
        ...(sport
          ? {
              sport: {
                OR: [
                  { key: { contains: sport, mode: "insensitive" } },
                  { name: { contains: sport, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
    },
    select: {
      id: true,
      pickType: true,
      selection: true,
      line: true,
      confidence: true,
      edgeScore: true,
      tier: true,
      pickGrade: true,
      riskLevel: true,
      reasoningShort: true,
      factorBreakdown: true,
      modelVersion: true,
      generatedAt: true,
      game: {
        select: {
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          sport: { select: { key: true, name: true } },
        },
      },
    },
    take: 400,
  });

  const ranked = rows
    .map((pick) => ({
      id: pick.id,
      sport: pick.game.sport.name,
      sportKey: pick.game.sport.key,
      matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
      commenceTime: pick.game.commenceTime.toISOString(),
      pickType: pick.pickType,
      selection: displaySelection(pick.selection),
      line: pick.line,
      confidence: pick.confidence,
      pickGrade: pick.pickGrade,
      tier: pick.tier,
      edgeScore: pick.edgeScore,
      rankingP: readNumber(pick.factorBreakdown, "rankingP"),
      expectedClv: readExpectedClv(pick.factorBreakdown),
      riskLevel: pick.riskLevel,
      modelVersion: pick.modelVersion,
      reasoningShort: pick.reasoningShort,
    }))
    .sort((a, b) => {
      if (order === "edge") {
        const ea = a.expectedClv;
        const eb = b.expectedClv;
        if (ea !== null && eb === null) return -1;
        if (ea === null && eb !== null) return 1;
        if (ea !== null && eb !== null && ea !== eb) return eb - ea;
      }
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      const ea = a.expectedClv ?? Number.NEGATIVE_INFINITY;
      const eb = b.expectedClv ?? Number.NEGATIVE_INFINITY;
      return eb - ea;
    })
    .slice(0, limit);

  return NextResponse.json(
    {
      ok: true,
      date: slate.dayKey,
      order,
      total: rows.length,
      returned: ranked.length,
      picks: ranked,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
