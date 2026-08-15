import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState, redactBoardConfidence } from "@/lib/board/state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;

  // loadBoardState applies the tier gate server-side (no frontend-only paywall).
  // Without canSeePremiumPicks, premium picks are tier-filtered out of the
  // DB query and the `market` field on every row is redacted to ALL_MARKETS.
  const payload = await loadBoardState(new Date(), viewerEntitlements);

  // Confidence is a PRO+ metric. The board itself is public, but the
  // numeric confidence must never reach a viewer without the
  // canSeeConfidence entitlement (server-side paywall rule #3).
  const canSeeConfidence = viewerEntitlements?.canSeeConfidence ?? false;

  const safePayload = canSeeConfidence ? payload : redactBoardConfidence(payload);
  return NextResponse.json({ success: true, ...safePayload });
}
