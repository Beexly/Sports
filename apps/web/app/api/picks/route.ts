import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import type { PublicPick, PickResult, PickGrade, RiskLevel, FactorBreakdown } from "@sports/types";
import { startOfDay, endOfDay } from "date-fns";
import { parseDateParam } from "@/lib/parse-date-param";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import { isPublicPicksSurfaceStale } from "@/lib/data-reliability/public-freshness-gate";
import { parseFactorBreakdown } from "@/lib/picks/parse-factor-breakdown";
import { getPublicCalibrator, honestConfidence } from "@/lib/calibration/public-confidence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) {
    return NextResponse.json(bootstrapGateResponse("Public picks"), { status: 503 });
  }

  // Stale-Data Kill Switch (default OFF via FORCE_NO_BET_IF_STALE). When ON and
  // the latest successful ingestion is "stale" per the shared Refresh SLA, fall
  // back to the same dark/"collecting" 503 as the bootstrap gate so the public
  // surface never serves a stale slate (CLAUDE.md rule #5). Fail OPEN on a DB
  // error — a transient blip must not black out a fresh surface.
  if (gates.forceNoBetIfStale) {
    const stale = await isPublicPicksSurfaceStale().catch(() => false);
    if (stale) {
      return NextResponse.json(bootstrapGateResponse("Public picks"), { status: 503 });
    }
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
        dailyPickLimit: 2,
      };

  const { searchParams } = new URL(req.url);
  const sportFilter = searchParams.get("sport");
  const dateParam = searchParams.get("date");
  const gradeFilter = searchParams.get("grade") as PickGrade | null;
  // Guard against malformed `?date=` values producing an Invalid Date query.
  const targetDate = parseDateParam(dateParam);

  // Production seed-row exclusion (defense-in-depth). The dev seed writes
  // synthetic rows tagged modelVersion="v5.0.0-seed"; in production there
  // should be zero of them, but this is the last unguarded public path.
  // Exclude them ONLY in production so a stray seed row can never surface on
  // the live picks endpoint. In dev/test this spread is empty, so demo mode —
  // which intentionally returns seed rows and flags meta.containsSeedData —
  // is preserved byte-for-byte.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};
  const gameFilter = {
    dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE },
    ...(sportFilter
      ? {
          sport: {
            key: { contains: sportFilter, mode: "insensitive" as const },
          },
        }
      : {}),
  };

  // Fail OPEN on a DB error — a transient blip on the primary query must not
  // black out a fresh surface. The sibling count below already falls back, and
  // the stale-check fails open too; an unwrapped throw here would 500 the public
  // endpoint instead of honestly returning the bootstrap/collecting state. So on
  // a primary-query failure, collapse to the same dark/"collecting" 503 the
  // bootstrap gate returns rather than leaking a stack trace.
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false, // never expose bootstrap-era picks publicly
        ...excludeSeedInProd, // prod-only: drop dev seed rows (no-op in dev/test)
        generatedAt: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        // Server-side tier gate
        ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
        // Optional grade filter (only useful for PRO+ who can see premium)
        ...(gradeFilter && entitlements.canSeePremiumPicks ? { pickGrade: gradeFilter } : {}),
        game: gameFilter,
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
    })
    .catch(() => null);
  if (picks === null) {
    return NextResponse.json(bootstrapGateResponse("Public picks"), { status: 503 });
  }

  // Thread 2: honest calibrated confidence. Built once (memoised) and only when
  // the audited calibrator is on; the calibrator is self-suppressing if the
  // sample is insufficient/non-improving, so this is null-safe by construction.
  const calibrator = gates.canApplyCalibrationAdjustments ? await getPublicCalibrator() : null;

  const publicPicks: PublicPick[] = picks.map((pick) => {
    // Parse + validate factorBreakdown from JSON storage. The Prisma column is
    // typed JsonValue; parseFactorBreakdown checks the shape and returns null
    // for a malformed/legacy blob (a handled "no factor trail" state) so a
    // consumer iterating `.factors` can never crash on bad data.
    let factorBreakdown: FactorBreakdown | null = null;
    if (entitlements.canSeeFactorBreakdown && pick.factorBreakdown) {
      factorBreakdown = parseFactorBreakdown(pick.factorBreakdown);
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

    // FREE-tier picks always carry their confidence; premium picks need the
    // canSeeConfidence entitlement. (Picks are free; confidence is the paid line
    // until Step 3 frees the now-calibrated number.)
    const shownConfidence =
      entitlements.canSeeConfidence || pick.tier === "FREE" ? pick.confidence : null;

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
      // Gated fields. FREE-tier picks are the public free sample — they carry
      // their confidence score (the owner's "2 free picks with confidence"
      // decision). Premium picks are never returned to FREE viewers (tier filter
      // above), and the board redacts confidence independently, so this does not
      // leak the paid product.
      confidence: shownConfidence,
      // Honest calibrated display of the confidence shown, when the audited
      // calibrator is active (else null → surfaces show the raw heuristic %).
      confidenceCalibrated: calibrator ? honestConfidence(shownConfidence, calibrator, true) : null,
      edgeScore: entitlements.canSeeEdgeScore ? pick.edgeScore : null,
      factorBreakdown,
      // Always visible — trust transparency
      dataQualityScore,
      tier: pick.tier as "FREE" | "PREMIUM",
      pickGrade: (pick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (pick.riskLevel ?? "MODERATE") as RiskLevel,
      // Full reasoning / "the why" stays a paid feature (Pro+). Decoupled from
      // canSeeConfidence (now true for FREE) so freeing confidence does not also
      // free the premium reasoning trail. FREE gets the short teaser.
      reasoning: entitlements.canSeeFactorBreakdown
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

  // Daily-limit transparency for FREE viewers: count the full published
  // slate (no tier filter, no take) so the UI can say "N picks published
  // today — you're seeing 1" instead of silently truncating. The count is
  // already public on the board (openPicks), so no premium data leaks.
  let totalAvailableToday = publicPicks.length;
  if (!entitlements.canSeePremiumPicks) {
    totalAvailableToday = await db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd, // prod-only: keep the count consistent with the slate
          generatedAt: {
            gte: startOfDay(targetDate),
            lte: endOfDay(targetDate),
          },
          game: gameFilter,
        },
      })
      .catch(() => publicPicks.length);
  }
  const hitDailyLimit = totalAvailableToday > publicPicks.length;

  return NextResponse.json({
    success: true,
    data: publicPicks,
    meta: {
      tier: entitlements.tier,
      total: publicPicks.length,
      totalAvailableToday,
      hitDailyLimit,
      date: targetDate.toISOString().split("T")[0],
      canSeeConfidence: entitlements.canSeeConfidence,
      canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
      containsSeedData,
    },
  });
}
