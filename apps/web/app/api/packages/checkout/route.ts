import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormSubmit =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let packageSlug: string | undefined;
    let guaranteed = false;
    let email: string | undefined;

    if (isFormSubmit) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        packageSlug = String(formData.get("packageSlug") || "");
        const gVal = String(formData.get("guaranteed") || "false");
        guaranteed = gVal === "true" || gVal === "1";
        const eVal = formData.get("email");
        email = typeof eVal === "string" && eVal.trim() ? eVal.trim() : undefined;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      packageSlug = body.packageSlug;
      guaranteed = Boolean(body.guaranteed);
      email = typeof body.email === "string" ? body.email : undefined;
    }

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

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.galaxysportsedge.com";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = req.headers.get("origin") || `${proto}://${host}`;

    const payload = buildStripePackageCheckoutPayload(
      pkg,
      Boolean(guaranteed),
      typeof email === "string" ? email : undefined,
      origin,
    );

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isProd = process.env.NODE_ENV === "production";

    if (!stripeKey || stripeKey.startsWith("sk_test_dummy")) {
      if (isProd) {
        return NextResponse.json(
          { error: "Live Stripe checkout is initializing. Please try again momentarily or unlock via Whop." },
          { status: 503 },
        );
      }
      // In offline / test / dev mode without live Stripe credentials, generate deterministic mock session
      const mockSessionId = `cs_test_mock_${pkg.slug}_${Date.now()}`;
      const mockUrl = `${origin}/packages/${pkg.slug}?session_id=${mockSessionId}`;
      if (isFormSubmit) {
        return NextResponse.redirect(mockUrl, 303);
      }
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
      const targetUrl = session.url || `${origin}/packages/${pkg.slug}?session_id=${session.id}`;

      if (isFormSubmit) {
        return NextResponse.redirect(targetUrl, 303);
      }
      return NextResponse.json({
        sessionId: session.id,
        url: targetUrl,
      });
    } catch (stripeErr: any) {
      if (!isProd && (stripeKey.includes("test") || stripeKey.includes("dummy") || !process.env.CI)) {
        const fallbackSessionId = `cs_test_mock_${pkg.slug}_${Date.now()}`;
        const fallbackUrl = `${origin}/packages/${pkg.slug}?session_id=${fallbackSessionId}`;
        if (isFormSubmit) {
          return NextResponse.redirect(fallbackUrl, 303);
        }
        return NextResponse.json({
          sessionId: fallbackSessionId,
          url: fallbackUrl,
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
