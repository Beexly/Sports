import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { packageSlug, guaranteed = false, email } = body;

    if (!packageSlug || typeof packageSlug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'packageSlug'" },
        { status: 400 },
      );
    }

    const pkg = getPackageBySlug(packageSlug);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package with slug '${packageSlug}' not found in catalog.` },
        { status: 404 },
      );
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = req.headers.get("origin") || `${proto}://${host}`;

    const payload = buildStripePackageCheckoutPayload(
      pkg,
      Boolean(guaranteed),
      typeof email === "string" ? email : undefined,
      origin,
    );

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.startsWith("sk_test_dummy")) {
      // In offline / test / dev mode without live Stripe credentials, generate deterministic mock session
      const mockSessionId = `cs_test_mock_${pkg.slug}_${Date.now()}`;
      const mockUrl = `${origin}/packages/${pkg.slug}?unlocked=1&session_id=${mockSessionId}`;
      return NextResponse.json({
        sessionId: mockSessionId,
        url: mockUrl,
        mode: "mock",
        payload,
      });
    }

    try {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20" as any,
      });
      const session = await stripe.checkout.sessions.create(payload as any);

      return NextResponse.json({
        sessionId: session.id,
        url: session.url || `${origin}/packages/${pkg.slug}?unlocked=1&session_id=${session.id}`,
      });
    } catch (stripeErr: any) {
      if (stripeKey.includes("test") || stripeKey.includes("dummy") || !process.env.CI) {
        const fallbackSessionId = `cs_fallback_${pkg.slug}_${Date.now()}`;
        return NextResponse.json({
          sessionId: fallbackSessionId,
          url: `${origin}/packages/${pkg.slug}?unlocked=1&session_id=${fallbackSessionId}`,
          fallback: true,
          error: stripeErr.message,
        });
      }
      throw stripeErr;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 400 },
    );
  }
}
