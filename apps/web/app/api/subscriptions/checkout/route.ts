import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  getStripePriceId,
  getOrCreateStripeCustomer,
  createCheckoutSession,
} from "@/lib/stripe";

const CheckoutSchema = z.object({
  tier: z.enum(["FANTASY", "PRO", "ELITE"]),
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense-in-depth on Stripe resource creation: 10 checkout attempts / 5 min
  // per user is far above any legitimate buyer (a retry or two) but stops a
  // looping client from minting unbounded checkout sessions/customers.
  const limit = consumeRateLimit("subscriptions-checkout", session.user.id, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await req.json();
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const { tier, interval } = parsed.data;
  const priceId = getStripePriceId(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `Pricing for ${tier} (${interval}) is not configured yet.` },
      { status: 503 }
    );
  }

  // Session.user.email is string | null. Guard explicitly (mirroring the priceId
  // check) instead of a non-null assertion, so we never hand Stripe a null email
  // when creating the customer — a missing email is a 400, not a runtime throw.
  if (!session.user.email) {
    return NextResponse.json(
      { error: "An email address is required to start checkout." },
      { status: 400 }
    );
  }

  try {
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name
    );

    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      userId: session.user.id,
      successUrl: `${appUrl}/dashboard?upgraded=true`,
      cancelUrl: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Log the detail server-side; return a generic message so internal/Stripe
    // error text never leaks to the client.
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error(`Checkout error: ${message}`);
    return NextResponse.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
