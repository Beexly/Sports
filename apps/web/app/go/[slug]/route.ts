/**
 * Affiliate click redirect — GET /go/[slug]
 *
 * Routes every "Visit operator" click through a server-side gate before it
 * leaves the site, so affiliate revenue is earned safely:
 *
 *   1. Click-time compliance RE-CHECK: a promo can be pulled, expire, lose its
 *      disclosure/terms, or have its operator de-listed between page render and
 *      click. We never forward a click to a promo that no longer passes
 *      `evaluatePromotionForPublish` — it falls back to /promotions instead.
 *   2. Attribution: attaches a first-party `subid` (env AFFILIATE_SUBID, default
 *      "gse") to the signed affiliate URL without mangling it, so conversions
 *      are attributable to us in the network's postbacks.
 *   3. A single observability seam for durable click tracking later.
 *
 * Subscription stays the primary model; affiliate is additive and only ever
 * lights up once an operator is flipped to APPROVED_PARTNER in the registry.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@sports/db";
import { evaluatePromotionForPublish } from "@/lib/promotions/guards";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: { readonly slug: string };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const fallback = new URL("/promotions", origin);
  const slug = context.params.slug;

  if (!slug || typeof slug !== "string") {
    return NextResponse.redirect(fallback, 302);
  }

  let promo: Awaited<ReturnType<typeof db.promotion.findUnique>>;
  try {
    promo = await db.promotion.findUnique({ where: { slug } });
  } catch {
    return NextResponse.redirect(fallback, 302);
  }
  if (!promo || !promo.affiliateUrl) {
    return NextResponse.redirect(fallback, 302);
  }

  // Compliance re-check at click time — never forward a non-publishable promo.
  const state = request.nextUrl.searchParams.get("state");
  const verdict = evaluatePromotionForPublish(promo, { state });
  if (!verdict.publishable) {
    return NextResponse.redirect(fallback, 302);
  }

  // Build the destination; attach a first-party sub-id without mangling the URL.
  let destination: URL;
  try {
    destination = new URL(promo.affiliateUrl);
  } catch {
    return NextResponse.redirect(fallback, 302);
  }
  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    return NextResponse.redirect(fallback, 302);
  }
  const subid = process.env["AFFILIATE_SUBID"] ?? "gse";
  if (!destination.searchParams.has("subid")) {
    destination.searchParams.set("subid", subid);
  }

  // Observability seam — replace with a durable PromoClick sink when wanted.
  console.info(
    `[affiliate-click] slug=${slug} operator=${promo.sportsbookKey}`,
  );

  return NextResponse.redirect(destination, 302);
}
