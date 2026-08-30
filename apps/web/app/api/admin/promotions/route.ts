/**
 * Admin Promotions API — /api/admin/promotions
 *
 * Internal endpoint for the cockpit. Returns every promotion row with the
 * computed publish verdict so the cockpit table can render blockers next to
 * each row.
 *
 * Admin gate: session.user.role !== "ADMIN" -> 401. Matches the existing
 * admin route pattern used elsewhere in the app.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { evaluatePromotionForPublish } from "@/lib/promotions/guards";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const promos = await db.promotion.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 250,
  });
  const now = new Date();

  const data = promos.map((p) => {
    const verdict = evaluatePromotionForPublish(p, { now });
    return {
      id: p.id,
      slug: p.slug,
      operatorName: p.operatorName,
      headline: p.headline,
      status: p.status,
      complianceStatus: p.complianceStatus,
      offerCategory: p.offerCategory,
      affiliateType: p.affiliateType,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      lastReviewedAt: p.lastReviewedAt ? p.lastReviewedAt.toISOString() : null,
      publishable: verdict.publishable,
      blockers: verdict.blockers,
    };
  });

  return NextResponse.json({
    success: true,
    data,
    meta: {
      total: promos.length,
      publishable: data.filter((d) => d.publishable).length,
    },
  });
}
