import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { authorizeOperator } from "@/lib/storefront/operator-auth";
import { activeSlateWeek, priorWeekMatchers, slateWeekToken } from "@/lib/storefront/slate-week";

export const dynamic = "force-dynamic";

export async function POST(request?: Request) {
  const operatorKey =
    request?.headers?.get("x-gse-operator-key") ||
    request?.headers?.get("x-gse-Operator-Key");

  // Fail closed: an unset key is a misconfiguration, not permission. There is
  // no literal fallback credential.
  const auth = authorizeOperator(operatorKey, process.env);
  if (auth === "unconfigured") {
    return NextResponse.json(
      {
        error: "Operator key not configured",
        message: "Set GSE_OPERATOR_KEY (16+ chars) before calling a storefront maintenance route.",
      },
      { status: 503 },
    );
  }
  if (auth !== "ok") {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid x-gse-Operator-Key authorization header.",
      },
      { status: 401 },
    );
  }

  try {
    // The active week comes from the catalogue, not from this file. Prior
    // weeks (the two behind it) are what the storefront can leave behind.
    const activeWeek = activeSlateWeek();
    const priorWeeks = [activeWeek - 2, activeWeek - 1];
    const priorMatchers = priorWeeks.map(priorWeekMatchers);
    const promotionFilters = priorMatchers.flatMap((m) => [
      ...m.slugs.map((slug) => ({ slug: { contains: slug } })),
      ...m.headlines.map((headline) => ({ headline: { contains: headline } })),
    ]);
    const taskFilters = priorMatchers.flatMap((m) =>
      m.headlines.map((title) => ({ title: { contains: title } }))
    );

    // 1. Archive stale prior-week promotions/packages so the active storefront
    // table carries only the current slate.
    const promotionPurgeResult = await db.promotion.updateMany({
      where: { OR: promotionFilters },
      data: {
        status: "ARCHIVED",
        offerSummary: `Archived historical prior-week package - shifted cleanly to the upcoming active Week ${activeWeek} slate.`,
      },
    });

    // 2. Archive stale prior-week tasks across operator cockpit tables
    const dashboardFixResult = await db.cockpitTask.updateMany({
      where: { OR: taskFilters },
      data: {
        status: "ARCHIVED",
        decisionNotes: `Purged automatically via storefront recovery layer execution script (${slateWeekToken(activeWeek)}).`,
      },
    });

    return NextResponse.json(
      {
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
        remediations: {
          stale_packages_deactivated: promotionPurgeResult.count,
          cockpit_records_archived: dashboardFixResult.count,
          active_slate_target: slateWeekToken(activeWeek),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const details =
      error instanceof Error
        ? error.message
        : "Unknown internal database transaction constraint exception";
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to purge stale storefront packages from active system memories.",
        details,
      },
      { status: 500 }
    );
  }
}
