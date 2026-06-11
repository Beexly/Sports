import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState, redactBoardConfidence } from "@/lib/board/state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadBoardState();

  // Confidence is a PRO+ metric. The board itself is public, but the
  // numeric confidence must never reach a viewer without the
  // canSeeConfidence entitlement (server-side paywall rule #3).
  const session = await auth();
  const canSeeConfidence = session?.user?.id
    ? (await getUserEntitlements(session.user.id)).canSeeConfidence
    : false;

  const safePayload = canSeeConfidence ? payload : redactBoardConfidence(payload);
  return NextResponse.json({ success: true, ...safePayload });
}
