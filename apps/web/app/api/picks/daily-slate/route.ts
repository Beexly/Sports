import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import type { DailySlate, PublicPick, PickGrade, RiskLevel } from "@sports/types";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canSeeFactorBreakdown: false,
        canSeeEdgeScore: false,
        canGetAlerts: false,
        dailyPickLimit: 1,
      };

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Parallel queries
  const [todayPicks, recentSettled, lastIngestion] = await Promise.all([
    db.pick.findMany({
      where: {
        isPublished: true,
        generatedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
      },
      orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
    }),
    // Last 7 days settled picks for record
    db.pick.findMany({
      where: {
        isPublished: true,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        settledAt: { gte: subDays(new Date(), 7) },
      },
      select: { result: true },
    }),
    db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);

  // Total / premium counts
  const totalPicks = todayPicks.length;
  const premiumPickCount = todayPicks.filter((p) => p.tier === "PREMIUM").length;

  // Sport breakdown
  const sportMap: Record<string, number> = {};
  for (const pick of todayPicks) {
    const sport = pick.game.sport.name;
    sportMap[sport] = (sportMap[sport] ?? 0) + 1;
  }
  const sportBreakdown = Object.entries(sportMap)
    .map(([sport, pickCount]) => ({ sport, pickCount }))
    .sort((a, b) => b.pickCount - a.pickCount);

  // Recent record (last 7 days)
  let recentRecord: DailySlate["recentRecord"] = null;
  if (recentSettled.length > 0) {
    const wins = recentSettled.filter((p) => p.result === "WIN").length;
    const losses = recentSettled.filter((p) => p.result === "LOSS").length;
    const pushes = recentSettled.filter((p) => p.result === "PUSH").length;
    recentRecord = { wins, losses, pushes, period: "Last 7 days" };
  }

  // Top edge pick today (highest confidence among published picks)
  const topEdgeDbPick = todayPicks.find(
    (p) =>
      entitlements.canSeePremiumPicks || p.tier === "FREE"
  );

  let topEdgePick: PublicPick | null = null;
  if (topEdgeDbPick) {
    topEdgePick = {
      id: topEdgeDbPick.id,
      game: {
        homeTeam: topEdgeDbPick.game.homeTeamName,
        awayTeam: topEdgeDbPick.game.awayTeamName,
        commenceTime: topEdgeDbPick.game.commenceTime.toISOString(),
        sport: topEdgeDbPick.game.sport.name,
      },
      pickType: topEdgeDbPick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
      selection: topEdgeDbPick.selection,
      line: topEdgeDbPick.line,
      confidence: entitlements.canSeeConfidence ? topEdgeDbPick.confidence : null,
      edgeScore: entitlements.canSeeEdgeScore ? topEdgeDbPick.edgeScore : null,
      factorBreakdown: null,
      tier: topEdgeDbPick.tier as "FREE" | "PREMIUM",
      pickGrade: (topEdgeDbPick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (topEdgeDbPick.riskLevel ?? "MODERATE") as RiskLevel,
      reasoning: entitlements.canSeeConfidence
        ? topEdgeDbPick.reasoning
        : topEdgeDbPick.reasoningShort,
      reasoningShort: topEdgeDbPick.reasoningShort,
      isFeatured: topEdgeDbPick.isFeatured,
      generatedAt: topEdgeDbPick.generatedAt.toISOString(),
      dataFreshnessAt: topEdgeDbPick.dataFreshnessAt?.toISOString() ?? null,
      result: topEdgeDbPick.result as "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID",
    };
  }

  const slate: DailySlate = {
    date: targetDate.toISOString().split("T")[0]!,
    totalGames: new Set(todayPicks.map((p) => p.gameId)).size,
    totalPicks,
    premiumPickCount,
    topEdgePick,
    lastUpdatedAt: lastIngestion?.completedAt?.toISOString() ?? null,
    sportBreakdown,
    recentRecord,
  };

  return NextResponse.json({ success: true, data: slate });
}
