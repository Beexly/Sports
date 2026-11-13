import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";
import {
  SEASON_MEMBERSHIP_SLUG,
  MEMBERSHIP_PLANS,
  type MembershipPlanId,
  getSingleSlateOffer,
  isSingleSlateOfferSlug,
  resolveWhopCheckoutUrl,
  singleSlateCheckoutAvailability,
  membershipCheckoutAvailability,
} from "@/lib/packages/two-door-offers";
import { getStage5GateStatus } from "@/lib/packages/stage5-gate";

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

  // Read-only storefront status: Stage-5 gate + Whop configuration booleans.
  // Never exposes checkout URLs or keys; used to render honest disabled states.
  if (searchParams.get("action") === "status") {
    const gate = await getStage5GateStatus();
    return NextResponse.json(
      {
        checkoutEnabled: gate.checkoutEnabled,
        officialPlayCount: gate.officialPlayCount,
        reason: gate.reason,
        evaluatedAt: gate.evaluatedAt,
        singleSlateOffers: singleSlateCheckoutAvailability(),
        membershipPlans: membershipCheckoutAvailability(),
      },
      { headers: CORS_HEADERS },
    );
  }

  const packageSlug = searchParams.get("packageSlug") || searchParams.get("package") || searchParams.get("slug") || "";
  const creditBack = searchParams.get("creditBack") === "true" || searchParams.get("creditBack") === "1";
  const returnToStorefront = searchParams.get("returnToStorefront") === "true" || searchParams.get("returnToStorefront") === "1";
  const email = searchParams.get("email") || undefined;

  const form = new URLSearchParams();
  form.set("packageSlug", packageSlug);
  form.set("creditBack", String(creditBack));
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
    let creditBack = false;
    let email: string | undefined;
    let returnToStorefront = false;
    let plan: string | undefined;

    if (isFormSubmit) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        packageSlug = String(formData.get("packageSlug") || "");
        const gVal = String(formData.get("creditBack") || "false");
        creditBack = gVal === "true" || gVal === "1";
        const rVal = String(formData.get("returnToStorefront") || "false");
        returnToStorefront = rVal === "true" || rVal === "1";
        const eVal = formData.get("email");
        email = typeof eVal === "string" && eVal.trim() ? eVal.trim() : undefined;
        const pVal = formData.get("plan");
        plan = typeof pVal === "string" && pVal.trim() ? pVal.trim() : undefined;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      packageSlug = body.packageSlug;
      creditBack = Boolean(body.creditBack);
      returnToStorefront = Boolean(body.returnToStorefront);
      email = typeof body.email === "string" ? body.email : undefined;
      plan = typeof body.plan === "string" ? body.plan : undefined;
    }

    if (!packageSlug || typeof packageSlug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'packageSlug'" },
        { status: 400 },
      );
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.galaxysportsedge.com";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = req.headers.get("origin") || `${proto}://${host}`;

    // ── New two-door offers: Stage-5 gate + Whop only. Never Stripe, never a
    //    mock success. Legacy slugs below keep the existing Stripe path. ──
    if (packageSlug === SEASON_MEMBERSHIP_SLUG) {
      return handleMembershipCheckout({ plan, isFormSubmit, origin });
    }
    if (isSingleSlateOfferSlug(packageSlug)) {
      return handleSingleSlateCheckout({ packageSlug, creditBack, isFormSubmit, origin });
    }

    const pkg = getPackageBySlug(packageSlug);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package with slug '${packageSlug}' not found in catalog.` },
        { status: 404 },
      );
    }

    const payload = buildStripePackageCheckoutPayload(
      pkg,
      Boolean(creditBack),
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

      // Always pass inline `price_data` from `buildStripePackageCheckoutPayload`
      // so Stripe Checkout renders the exact active Week 10 pack title, description,
      // and unit amount rather than stale prior-week product metadata on a reused Price ID.
      const primaryItem = payload.line_items[0];
      if (pkg.stripeProductId && primaryItem) {
        void stripe.products
          .update(pkg.stripeProductId, {
            name: primaryItem.price_data.product_data.name,
            description: primaryItem.price_data.product_data.description.slice(0, 450),
          })
          .catch(() => null);
      }
      void stripe.accounts
        .retrieve()
        .then((acct) => {
          if (acct?.id) {
            return stripe.accounts.update(acct.id, {
              business_profile: { name: "Galaxy Sports Edge" },
            });
          }
          return null;
        })
        .catch(() => null);

      const stripeSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: payload.line_items.map((li) => ({
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

// ---------------------------------------------------------------------------
// Two-door offers — Stage-5 gated, Whop-only checkout
// ---------------------------------------------------------------------------

const WHOP_NOT_CONFIGURED_REASON =
  "Checkout for this offer is not open yet: our payment provider is still being set up. Nothing has been charged, and this page will open for purchase as soon as checkout is ready.";

interface WhopCheckoutContext {
  readonly isFormSubmit: boolean;
  readonly origin: string;
}

/**
 * Shared fail-closed responder. Enabled only when the Stage-5 gate reports at
 * least one official play AND a real Whop checkout link is configured.
 */
async function respondWhopCheckout(
  ctx: WhopCheckoutContext & {
    offerSlug: string;
    tier: string;
    envKey: string;
    anchor: string;
  },
): Promise<NextResponse> {
  const gate = await getStage5GateStatus();
  if (!gate.checkoutEnabled) {
    if (ctx.isFormSubmit) {
      return NextResponse.redirect(
        `${ctx.origin}/packages?checkout=closed#${ctx.anchor}`,
        303,
      );
    }
    return NextResponse.json(
      {
        checkoutEnabled: false,
        officialPlayCount: gate.officialPlayCount,
        reason: gate.reason,
      },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  const url = resolveWhopCheckoutUrl(ctx.envKey);
  if (!url) {
    if (ctx.isFormSubmit) {
      return NextResponse.redirect(
        `${ctx.origin}/packages?checkout=unavailable#${ctx.anchor}`,
        303,
      );
    }
    return NextResponse.json(
      {
        checkoutEnabled: false,
        officialPlayCount: gate.officialPlayCount,
        reason: "whop_not_configured",
        message: WHOP_NOT_CONFIGURED_REASON,
      },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  if (ctx.isFormSubmit) {
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json(
    {
      checkoutEnabled: true,
      provider: "whop",
      url,
      offerSlug: ctx.offerSlug,
      tier: ctx.tier,
      officialPlayCount: gate.officialPlayCount,
    },
    { headers: CORS_HEADERS },
  );
}

/** Door 1 — Season Membership (founding monthly / standard monthly / rest-of-season). */
async function handleMembershipCheckout(
  ctx: WhopCheckoutContext & { plan?: string },
): Promise<NextResponse> {
  const planId = (ctx.plan ?? "founding-monthly") as MembershipPlanId;
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json(
      { error: `Unknown membership plan '${ctx.plan}'.` },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  return respondWhopCheckout({
    ...ctx,
    offerSlug: SEASON_MEMBERSHIP_SLUG,
    tier: plan.id,
    envKey: plan.whopCheckoutEnv,
    anchor: "season-membership",
  });
}

/** Door 2 — Single-Slate Packs (standard or credit-back tier). */
async function handleSingleSlateCheckout(
  ctx: WhopCheckoutContext & { packageSlug: string; creditBack: boolean },
): Promise<NextResponse> {
  const offer = getSingleSlateOffer(ctx.packageSlug);
  if (!offer) {
    return NextResponse.json(
      { error: `Package with slug '${ctx.packageSlug}' not found in catalog.` },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const tier = ctx.creditBack ? "credit-back" : "standard";
  const envKey = ctx.creditBack
    ? offer.whopCheckoutEnv.creditBack
    : offer.whopCheckoutEnv.standard;
  return respondWhopCheckout({
    ...ctx,
    offerSlug: offer.slug,
    tier,
    envKey,
    anchor: offer.slug,
  });
}
