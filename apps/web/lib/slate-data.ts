/**
 * Shared daily-slate loader. Same rationale as picks-data.ts — server
 * components can't HTTP-fetch their own API routes without dropping the
 * session cookie.
 */

import { db } from "@sports/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import type {
  DailySlate,
  Entitlements,
  PublicPick,
  PickGrade,
  RiskLevel,
} from "@sports/types";
import { parsePickDateParam } from "./picks-data";

export type LoadSlateOptions = {
  entitlements: Entitlements;
  /** YYYY-MM-DD or null for today. Invalid values fall back to today. */
  date: string | null;
};

export async function loadDailySlate(
  opts: LoadSlateOptions
): Promise<DailySlate> {
  const { entitlements, date } = opts;
  const parsed = parsePickDateParam(date);
  const targetDate = parsed instanceof Date ? parsed : new Date();

  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const [todayPicks, recentSettled, lastIngestion] = await Promise.all([
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        generatedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
      },
      orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
    }),
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
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

  const totalPicks = todayPicks.length;
  const premiumPickCount = todayPicks.filter((p) => p.tier === "PREMIUM").length;

  const sportMap: Record<string, number> = {};
  for (const pick of todayPicks) {
    const sportName = pick.game.sport.name;
    sportMap[sportName] = (sportMap[sportName] ?? 0) + 1;
  }
  const sportBreakdown = Object.entries(sportMap)
    .map(([sport, pickCount]) => ({ sport, pickCount }))
    .sort((a, b) => b.pickCount - a.pickCount);

  let recentRecord: DailySlate["recentRecord"] = null;
  if (recentSettled.length > 0) {
    const wins = recentSettled.filter((p) => p.result === "WIN").length;
    const losses = recentSettled.filter((p) => p.result === "LOSS").length;
    const pushes = recentSettled.filter((p) => p.result === "PUSH").length;
    recentRecord = { wins, losses, pushes, period: "Last 7 days" };
  }

  const topEdgeDbPick = todayPicks.find(
    (p) => entitlements.canSeePremiumPicks || p.tier === "FREE"
  );

  let topEdgePick: PublicPick | null = null;
  if (topEdgeDbPick) {
    let slatePickDqScore = Math.round(topEdgeDbPick.game.dataQualityScore ?? 0);
    if (topEdgeDbPick.factorBreakdown) {
      const fb = topEdgeDbPick.factorBreakdown as Record<string, unknown>;
      if (typeof fb["dataQualityScore"] === "number")
        slatePickDqScore = fb["dataQualityScore"];
    }

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
      dataQualityScore: slatePickDqScore,
      tier: topEdgeDbPick.tier as "FREE" | "PREMIUM",
      pickGrade: (topEdgeDbPick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (topEdgeDbPick.riskLevel ?? "MODERATE") as RiskLevel,
      reasoning: entitlements.canSeeConfidence
        ? topEdgeDbPick.reasoning
        : topEdgeDbPick.reasoningShort ||
          topEdgeDbPick.reasoning.split(".")[0] + ".",
      reasoningShort:
        topEdgeDbPick.reasoningShort ||
        topEdgeDbPick.reasoning.split(".")[0] + ".",
      isFeatured: topEdgeDbPick.isFeatured,
      generatedAt: topEdgeDbPick.generatedAt.toISOString(),
      dataFreshnessAt: topEdgeDbPick.dataFreshnessAt?.toISOString() ?? null,
      result: topEdgeDbPick.result as
        | "PENDING"
        | "WIN"
        | "LOSS"
        | "PUSH"
        | "VOID",
    };
  }

  return {
    date: targetDate.toISOString().split("T")[0]!,
    totalGames: new Set(todayPicks.map((p) => p.gameId)).size,
    totalPicks,
    premiumPickCount,
    topEdgePick,
    lastUpdatedAt: lastIngestion?.completedAt?.toISOString() ?? null,
    sportBreakdown,
    recentRecord,
  };
}
