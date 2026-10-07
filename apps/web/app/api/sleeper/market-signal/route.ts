import { NextResponse } from "next/server";
import { loadSleeperMarketSignal } from "@/lib/sleeper/market-signal";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

/**
 * Player Lab "Market" view JSON (live Sleeper add/drop crowd signal).
 *
 * Premium floor, matching every sibling Player Lab view: the other eleven
 * `jsonHref`s on that surface (`/api/nflverse/*`) all sit behind
 * requirePremiumApiRateLimited, so leaving this one ungated let the Market tab's
 * data be pulled directly without a subscription. It is market/consensus data of
 * the same grade as the other premium analytics surfaces.
 *
 * Order matters: the entitlement gate runs FIRST and the rate limit only after,
 * so a 429 can never mask the paywall and only an already-entitled caller is
 * ever limited.
 */
export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("sleeper/market-signal");
  if (denied) return denied;
  const data = await loadSleeperMarketSignal();
  return NextResponse.json({ success: true, data });
}
