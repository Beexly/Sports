/**
 * GET /api/dynasty/me — the Galaxy Dynasty tie-in seam.
 *
 * The ONE bridge between GSN and the game. Read-only, session-gated, one
 * direction (GSN → game). It returns the viewer's derived Dynasty profile from
 * their real entitlements and real settled record. It never writes a pick,
 * never mints an entitlement, and — like every gated GSN surface — fails CLOSED
 * to the anonymous FREE world on any error, so a game request can never leak
 * paid state or crash a subscription path.
 *
 * The game client only ever renders this output. See docs/product/galaxy-dynasty-tie-in.md.
 */

import { NextResponse } from "next/server";
import { getViewerDynastyProfile } from "@/lib/dynasty/load-dynasty-profile";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const profile = await getViewerDynastyProfile();
  return NextResponse.json({ success: true, profile });
}
