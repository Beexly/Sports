import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const packageSlug = searchParams.get("packageSlug") || searchParams.get("package") || searchParams.get("slug") || "";
  const guaranteed = searchParams.get("guaranteed") === "true" || searchParams.get("guaranteed") === "1";
  const returnToStorefront = searchParams.get("returnToStorefront") === "true" || searchParams.get("returnToStorefront") === "1";
  const email = searchParams.get("email") || undefined;

  const form = new URLSearchParams();
  form.set("packageSlug", packageSlug);
  form.set("guaranteed", String(guaranteed));
  form.set("returnToStorefront", String(returnToStorefront));
  if (email) form.set("email", email);

  const postReq = new Request(req.url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      host: req.headers.get("host") || "www.galaxysportsedge.com",
      "x-forwarded-host": req.headers.get("x-forwarded-host") || "www.galaxysportsedge.com",
      "x-forwarded-proto": req.headers.get("x-forwarded-proto") || "https",
    },
    body: form.toString(),
  });
  return POST(postReq);
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormSubmit =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let packageSlug: string | undefined;
    let guaranteed = false;
    let email: string | undefined;
    let returnToStorefront = false;

    if (isFormSubmit) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        packageSlug = String(formData.get("packageSlug") || "");
        const gVal = String(formData.get("guaranteed") || "false");
        guaranteed = gVal === "true" || gVal === "1";
        const rVal = String(formData.get("returnToStorefront") || "false");
        returnToStorefront = rVal === "true" || rVal === "1";
        const eVal = formData.get("email");
        email = typeof eVal === "string" && eVal.trim() ? eVal.trim() : undefined;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      packageSlug = body.packageSlug;
      guaranteed = Boolean(body.guaranteed);
      returnToStorefront = Boolean(body.returnToStorefront);
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
      returnToStorefront,
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
      const mockUrl = returnToStorefront
        ? `${origin}/packages?unlocked=1&package=${pkg.slug}&session_id=${mockSessionId}#${pkg.slug}`
        : `${origin}/packages/${pkg.slug}?session_id=${mockSessionId}`;
      if (isFormSubmit) {
        return NextResponse.redirect(mockUrl, 303);
      }
      return NextResponse.json({
        sessionId: mockSessionId,
        url: mockUrl,
        stripeProductId: pkg.stripeProductId,
        stripePriceId: pkg.stripePriceId,
        mode: "mock",
        payload,
      });
    }

    try {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20",
      });

      // Use the live pre-created Stripe Price ID. The DFS pack has its own
      // 3999-cent price, so it no longer borrows the Sunday $39 price.
      const stripeSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items:
          pkg.stripePriceId && !guaranteed
            ? [{ price: pkg.stripePriceId, quantity: 1 }]
            : payload.line_items.map((li) => ({
                price_data: li.price_data,
                quantity: li.quantity,
              })),
        metadata: payload.metadata,
        success_url: payload.success_url,
        cancel_url: payload.cancel_url,
        ...(payload.customer_email ? { customer_email: payload.customer_email } : {}),
      };

      const session = await stripe.checkout.sessions.create(stripeSessionCreateParams);
      const targetUrl =
        session.url ||
        (returnToStorefront
          ? `${origin}/packages?unlocked=1&package=${pkg.slug}&session_id=${session.id}#${pkg.slug}`
          : `${origin}/packages/${pkg.slug}?session_id=${session.id}`);

      if (isFormSubmit) {
        return NextResponse.redirect(targetUrl, 303);
      }
      return NextResponse.json(
        {
          sessionId: session.id,
          url: targetUrl,
          stripeProductId: pkg.stripeProductId,
          stripePriceId: pkg.stripePriceId,
        },
        { headers: CORS_HEADERS },
      );
    } catch (stripeErr) {
      if (!isProd && (stripeKey.includes("test") || stripeKey.includes("dummy") || !process.env.CI)) {
        const fallbackSessionId = `cs_test_mock_${pkg.slug}_${Date.now()}`;
        const fallbackUrl = returnToStorefront
          ? `${origin}/packages?unlocked=1&package=${pkg.slug}&session_id=${fallbackSessionId}#${pkg.slug}`
          : `${origin}/packages/${pkg.slug}?session_id=${fallbackSessionId}`;
        if (isFormSubmit) {
          return NextResponse.redirect(fallbackUrl, 303);
        }
        return NextResponse.json({
          sessionId: fallbackSessionId,
          url: fallbackUrl,
          stripeProductId: pkg.stripeProductId,
          stripePriceId: pkg.stripePriceId,
          fallback: true,
          error: stripeErr instanceof Error ? stripeErr.message : "Stripe checkout failed",
        });
      }
      throw stripeErr;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 400 },
    );
  }
}
