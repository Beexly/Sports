import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import type { PublicPick, PickResult } from "@sports/types";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();

  // Get entitlements — works for both authenticated and anonymous users
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : { tier: "FREE" as const, canSeePremiumPicks: false, canSeeConfidence: false, canSeeLineMovement: false, canGetAlerts: false, dailyPickLimit: 1 };

  const { searchParams } = new URL(req.url);
  const sportFilter = searchParams.get("sport");
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  // Build query
  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      generatedAt: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
      // Only return premium picks if user has access
      ...(entitlements.canSeePremiumPicks
        ? {}
        : { tier: "FREE" }),
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
    orderBy: [{ confidence: "desc" }, { generatedAt: "desc" }],
    take: entitlements.dailyPickLimit ?? 100,
  });

  const publicPicks: PublicPick[] = picks.map((pick) => ({
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
    // PAYWALL: hide confidence score from non-subscribers
    confidence: entitlements.canSeeConfidence ? pick.confidence : null,
    tier: pick.tier as "FREE" | "PREMIUM",
    reasoning: entitlements.canSeeConfidence
      ? pick.reasoning
      : pick.reasoning.split(".")[0] + ".", // Truncate reasoning for free users
    generatedAt: pick.generatedAt.toISOString(),
    result: pick.result as PickResult,
  }));

  return NextResponse.json({
    success: true,
    data: publicPicks,
    meta: {
      tier: entitlements.tier,
      total: publicPicks.length,
      date: targetDate.toISOString().split("T")[0],
    },
  });
}
