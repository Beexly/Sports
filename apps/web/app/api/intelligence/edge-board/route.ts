import { NextResponse } from "next/server";
import { loadEdgeBoard } from "@/lib/intelligence/edge-board";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

/**
 * The Edge Board as an engine payload.
 *
 * Same shape as its 11 siblings: a PREMIUM-gated, read-only GET that delegates
 * to the canonical loader and reports `success` by whether the board has a live
 * source. `loadEdgeBoard` already isolates per-source failure (one dead dataset
 * becomes a source-error row, not a dead board), and returns `status:
 * "source-error"` only when ALL five sources fail.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/edge-board");
  if (denied) return denied;
  const data = await loadEdgeBoard();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
