import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadDailySlate } from "@/lib/slate-data";
import { parsePickDateParam } from "@/lib/picks-data";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

const DEFAULT_FREE_ENTITLEMENTS = {
  tier: "FREE" as const,
  canSeePremiumPicks: false,
  canSeeConfidence: false,
  canSeeLineMovement: false,
  canSeeFactorBreakdown: false,
  canSeeEdgeScore: false,
  canGetAlerts: false,
  dailyPickLimit: 1,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const gates = getReadinessGates();
    if (!gates.canExposePublicPicks) {
      return NextResponse.json(bootstrapGateResponse("Daily slate"), {
        status: 503,
      });
    }

    const session = await auth();
    const entitlements = session?.user?.id
      ? await getUserEntitlements(session.user.id)
      : DEFAULT_FREE_ENTITLEMENTS;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    if (dateParam) {
      const parsed = parsePickDateParam(dateParam);
      if (!(parsed instanceof Date)) {
        return NextResponse.json(
          { success: false, error: parsed.error },
          { status: 400 }
        );
      }
    }

    const slate = await loadDailySlate({ entitlements, date: dateParam });

    return NextResponse.json({ success: true, data: slate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/picks/daily-slate] ${message}`);
    return NextResponse.json(
      { success: false, error: "Failed to load daily slate" },
      { status: 500 }
    );
  }
}
