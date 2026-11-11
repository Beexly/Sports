import { NextResponse } from "next/server";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

export async function POST(request?: Request) {
  const operatorKey =
    request?.headers?.get("x-gse-operator-key") ||
    request?.headers?.get("x-gse-Operator-Key");

  const expectedKey =
    process.env["GSE_OPERATOR_KEY"] ||
    process.env["OPERATOR_KEY"] ||
    "sovereign-operator-secret";

  if (!operatorKey || operatorKey !== expectedKey) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid x-gse-Operator-Key authorization header.",
      },
      { status: 401 }
    );
  }

  try {
    // 1. Archive any stale Week 8 promotions/packages in the active storefront table
    const promotionPurgeResult = await db.promotion.updateMany({
      where: {
        OR: [
          { slug: { contains: "week-8" } },
          { slug: { contains: "WEEK_08" } },
          { headline: { contains: "Week 8" } },
        ],
      },
      data: {
        status: "ARCHIVED",
        offerSummary:
          "Archived historical Week 8 package — shifted cleanly to upcoming active Week 10 slate.",
      },
    });

    // 2. Archive hardcoded stale Week 8 tasks across operator cockpit tables
    const dashboardFixResult = await db.cockpitTask.updateMany({
      where: {
        title: { contains: "Week 8" },
      },
      data: {
        status: "ARCHIVED",
        decisionNotes:
          "Purged automatically via storefront recovery layer execution script (WEEK_09_LIVE).",
      },
    });

    return NextResponse.json(
      {
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
        remediations: {
          stale_packages_deactivated: promotionPurgeResult.count,
          cockpit_records_archived: dashboardFixResult.count,
          active_slate_target: "WEEK_09_LIVE",
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
