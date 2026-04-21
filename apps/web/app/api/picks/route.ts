import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import { getAtsForm, getHeadToHeadForm, detectPlayoffContext } from "@sports/data-ingestion";
import type { PublicPick, PickResult, PickGrade, RiskLevel, FactorBreakdown, PickTrends, AtsRecord } from "@sports/types";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function toAtsRecord(
  form: { wins: number; losses: number; pushes: number; sampleSize: number } | null
): AtsRecord | null {
  if (!form) return null;
  return { wins: form.wins, losses: form.losses, pushes: form.pushes, window: form.sampleSize };
}

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
        canSeeEdgeScore: false,
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

  // ── Fetch trend data ──────────────────────────────────────────
  // Pro+ users get full ATS/H2H trends; all users get series context.
  const isPro = entitlements.canSeeConfidence;

  // Deduplicate games to avoid redundant fetches
  const uniqueGames = new Map<
    string,
    { homeTeam: string; awayTeam: string; sportKey: string; commenceTime: Date }
  >();
  for (const pick of picks) {
    if (!uniqueGames.has(pick.game.id)) {
      uniqueGames.set(pick.game.id, {
        homeTeam: pick.game.homeTeamName,
        awayTeam: pick.game.awayTeamName,
        sportKey: pick.game.sport.key,
        commenceTime: pick.game.commenceTime,
      });
    }
  }

  const trendsMap = new Map<string, PickTrends>();
  await Promise.all(
    Array.from(uniqueGames.entries()).map(async ([gameId, g]) => {
      const [homeAts, awayAts, homeAtHome, awayAway, h2h, series] = await Promise.all([
        isPro
          ? getAtsForm(g.homeTeam, g.sportKey, 10, undefined, true).catch(() => null)
          : Promise.resolve(null),
        isPro
          ? getAtsForm(g.awayTeam, g.sportKey, 10, undefined, true).catch(() => null)
          : Promise.resolve(null),
        isPro
          ? getAtsForm(g.homeTeam, g.sportKey, 10, "HOME", true).catch(() => null)
          : Promise.resolve(null),
        isPro
          ? getAtsForm(g.awayTeam, g.sportKey, 10, "AWAY", true).catch(() => null)
          : Promise.resolve(null),
        isPro
          ? getHeadToHeadForm(g.homeTeam, g.awayTeam, g.sportKey, 10, true).catch(() => null)
          : Promise.resolve(null),
        detectPlayoffContext(g.homeTeam, g.awayTeam, g.commenceTime).catch(() => null),
      ]);

      trendsMap.set(gameId, {
        homeTeamAts: toAtsRecord(homeAts),
        awayTeamAts: toAtsRecord(awayAts),
        homeTeamAtsAtHome: toAtsRecord(homeAtHome),
        awayTeamAtsAway: toAtsRecord(awayAway),
        headToHead: toAtsRecord(h2h),
        seriesContext: series
          ? {
              seriesHomeWins: series.seriesHomeWins,
              seriesAwayWins: series.seriesAwayWins,
              isEliminationGame: series.isEliminationGame,
              trailingTeam: series.trailingTeam,
              desperationMultiplier: series.desperationMultiplier,
            }
          : null,
      });
    })
  );
  // ─────────────────────────────────────────────────────────────

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
      // Trend data: ATS fields null for FREE, series context for all tiers
      trends: trendsMap.get(pick.game.id) ?? null,
      isFeatured: pick.isFeatured,
      generatedAt: pick.generatedAt.toISOString(),
      dataFreshnessAt: pick.dataFreshnessAt?.toISOString() ?? null,
      result: pick.result as PickResult,
    };
  });

  return NextResponse.json({
    success: true,
    data: publicPicks,
    meta: {
      tier: entitlements.tier,
      total: publicPicks.length,
      date: targetDate.toISOString().split("T")[0],
      canSeeConfidence: entitlements.canSeeConfidence,
      canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
      dailyPickLimit: entitlements.dailyPickLimit,
    },
  });
}
