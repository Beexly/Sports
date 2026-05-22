import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import type { PublicPick, PickResult, PickGrade, RiskLevel, FactorBreakdown } from "@sports/types";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) {
    return NextResponse.json(bootstrapGateResponse("Public picks"), { status: 503 });
  }

  const session = await auth();

  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canSeeFactorBreakdown: false,
        canSeeEdgeScore: true,
        canGetAlerts: false,
        dailyPickLimit: 1,
      };

  const { searchParams } = new URL(req.url);
  const sportFilter = searchParams.get("sport");
  const dateParam = searchParams.get("date");
  const gradeFilter = searchParams.get("grade") as PickGrade | null;
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false, // never expose bootstrap-era picks publicly
      generatedAt: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
      // Server-side tier gate
      ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
      // Optional grade filter (only useful for PRO+ who can see premium)
      ...(gradeFilter && entitlements.canSeePremiumPicks ? { pickGrade: gradeFilter } : {}),
      ...(sportFilter
        ? {
            game: {
              sport: {
                key: { contains: sportFilter, mode: "insensitive" as const },
              },
            },
          }
        : {}),
    },
    include: {
      game: {
        include: {
          sport: { select: { name: true, key: true } },
        },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { confidence: "desc" },
      { generatedAt: "desc" },
    ],
    take: entitlements.dailyPickLimit ?? 200,
  });

  const publicPicks: PublicPick[] = picks.map((pick) => {
    // Parse factorBreakdown from JSON storage
    let factorBreakdown: FactorBreakdown | null = null;
    if (entitlements.canSeeFactorBreakdown && pick.factorBreakdown) {
      try {
        factorBreakdown = pick.factorBreakdown as unknown as FactorBreakdown;
      } catch {
        factorBreakdown = null;
      }
    }

    // Extract dataQualityScore — always public trust signal
    // Prefer from stored factorBreakdown JSON if available, else fall back to game.dataQualityScore
    let storedDqScore: number | null = null;
    if (pick.factorBreakdown) {
      try {
        const fb = pick.factorBreakdown as Record<string, unknown>;
        if (typeof fb["dataQualityScore"] === "number") {
          storedDqScore = fb["dataQualityScore"];
        }
      } catch { /* ignore */ }
    }
    const dataQualityScore = storedDqScore ?? Math.round(pick.game.dataQualityScore);

    return {
      id: pick.id,
      game: {
        homeTeam: pick.game.homeTeamName,
        awayTeam: pick.game.awayTeamName,
        commenceTime: pick.game.commenceTime.toISOString(),
        sport: pick.game.sport.name,
      },
      pickType: pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
      selection: pick.selection,
      line: pick.line,
      // Gated fields
      confidence: entitlements.canSeeConfidence ? pick.confidence : null,
      edgeScore: entitlements.canSeeEdgeScore ? pick.edgeScore : null,
      factorBreakdown,
      // Always visible — trust transparency
      dataQualityScore,
      tier: pick.tier as "FREE" | "PREMIUM",
      pickGrade: (pick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (pick.riskLevel ?? "MODERATE") as RiskLevel,
      reasoning: entitlements.canSeeConfidence
        ? pick.reasoning
        : pick.reasoningShort || pick.reasoning.split(".")[0] + ".",
      reasoningShort: pick.reasoningShort,
      isFeatured: pick.isFeatured,
      isAuditAvailable:
        !pick.id.startsWith("sample-pick-") &&
        !(pick.modelVersion ?? "").startsWith("sample-"),
      generatedAt: pick.generatedAt.toISOString(),
      dataFreshnessAt: pick.dataFreshnessAt?.toISOString() ?? null,
      result: pick.result as PickResult,
    };
  });

  // Demo-mode detection: when any of the returned picks were created by
  // the dev seed (modelVersion === "v5.0.0-seed"), surface a flag so the
  // page can render a "demo mode" badge. Real model output never uses
  // this string — synthetic seed picks are the only producer.
  const containsSeedData = picks.some((p) => p.modelVersion === "v5.0.0-seed");

  return NextResponse.json({
    success: true,
    data: publicPicks,
    meta: {
      tier: entitlements.tier,
      total: publicPicks.length,
      date: targetDate.toISOString().split("T")[0],
      canSeeConfidence: entitlements.canSeeConfidence,
      canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
      containsSeedData,
    },
  });
}
