import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import {
  loadPicks,
  parsePickDateParam,
  validatePickGrade,
} from "@/lib/picks-data";
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
      return NextResponse.json(bootstrapGateResponse("Public picks"), {
        status: 503,
      });
    }

    const session = await auth();
    const entitlements = session?.user?.id
      ? await getUserEntitlements(session.user.id)
      : DEFAULT_FREE_ENTITLEMENTS;

    const { searchParams } = new URL(req.url);

    const parsedDate = parsePickDateParam(searchParams.get("date"));
    if (!(parsedDate instanceof Date)) {
      return NextResponse.json(
        { success: false, error: parsedDate.error },
        { status: 400 }
      );
    }

    const grade = validatePickGrade(searchParams.get("grade"));
    if (grade && typeof grade === "object" && "error" in grade) {
      return NextResponse.json(
        { success: false, error: grade.error },
        { status: 400 }
      );
    }

    // Optional bounded limit query param — used by the homepage preview.
    // Clamped inside loadPicks() to a max of 200 to prevent abuse.
    const rawLimit = searchParams.get("limit");
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : null;
    const limit =
      parsedLimit !== null && Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : null;

    const result = await loadPicks({
      entitlements,
      sport: searchParams.get("sport"),
      date: searchParams.get("date"),
      grade: grade as Parameters<typeof loadPicks>[0]["grade"],
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.picks,
      meta: {
        tier: entitlements.tier,
        total: result.picks.length,
        date: result.date,
        canSeeConfidence: entitlements.canSeeConfidence,
        canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/picks] ${message}`);
    return NextResponse.json(
      { success: false, error: "Failed to load picks" },
      { status: 500 }
    );
  }
}
