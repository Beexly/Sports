/**
 * GET /api/gse/v1/partners/compliance — anti-affiliate doctrine surface.
 * Sportsbook affiliate funnels permanently BLOCKED. Stripe-only revenue spine.
 */
import { NextResponse } from "next/server";
import {
  assessPartner,
  partnerStackSnapshot,
  DEFAULT_PARTNERS,
  allowedRevenueStreams,
  BLOCKED_PARTNER_KINDS,
} from "@sports/partner-stack";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const assessments = DEFAULT_PARTNERS.map((p) => ({
    id: p.id,
    kind: p.kind,
    status: p.status,
    gate: assessPartner(p),
  }));
  const blocked = assessments.filter((a) => !a.gate.ok);
  const allowed = assessments.filter((a) => a.gate.ok);

  return NextResponse.json(
    {
      surface: "partners.compliance.v1",
      sportsbookAffiliates: "PERMANENT_BLOCK",
      blockedKinds: BLOCKED_PARTNER_KINDS,
      allowedRevenue: allowedRevenueStreams(),
      snapshot: partnerStackSnapshot(),
      partners: { allowed: allowed.length, blocked: blocked.length, assessments },
      doctrine:
        "Honesty not volume. Stripe subscriptions only. No sportsbook CPA/revshare funnel.",
    },
    {
      headers: {
        "X-GSE-API": "stats.v1",
        "X-GSE-AFFILIATE": "blocked",
      },
    },
  );
}
