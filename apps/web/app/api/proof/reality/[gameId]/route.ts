import { NextResponse } from "next/server";
import { loadRealityReceipt } from "@/lib/reality-receipt/load";

/**
 * GET /api/proof/reality/[gameId] — Reality Receipt v0 (W003).
 *
 * Composes the W001 evidence-envelope digest, the pick-proof hash-chain
 * receipt's live tamper check, and the W-OTS Bitcoin-anchor status into one
 * reproducible object. Public, unauthenticated, FREE-tier-only by
 * construction (see lib/reality-receipt/load.ts) — never accepts viewer
 * context, so a kicked-off/settled PRO or ELITE pick can never open here.
 *
 * Honesty mapping: no such game -> 404; game exists but carries no recorded
 * decision (publish or pass) yet -> 404 with that reason; DB outage -> 503,
 * never a false "not found".
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
): Promise<NextResponse> {
  const { gameId } = await params;
  const id = decodeURIComponent(gameId ?? "").trim();
  if (!id) {
    return NextResponse.json({ found: false, error: "gameId required" }, { status: 400 });
  }

  const result = await loadRealityReceipt(id);

  if (!result.ok) {
    if (result.reason === "UNAVAILABLE") {
      return NextResponse.json(
        { found: false, error: "The reality-receipt store is temporarily unavailable. This is not a verdict; try again shortly." },
        { status: 503 },
      );
    }
    if (result.reason === "NO_DECISION") {
      return NextResponse.json(
        { found: false, reason: "This game has no recorded decision (publish or pass) yet." },
        { status: 404 },
      );
    }
    return NextResponse.json({ found: false, reason: "No such game." }, { status: 404 });
  }

  return NextResponse.json(
    {
      found: true,
      receipt: result.receipt,
      image: `/api/proof/reality/${encodeURIComponent(id)}/image`,
    },
    { status: 200, headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
  );
}
