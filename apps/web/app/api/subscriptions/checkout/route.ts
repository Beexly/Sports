import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  STRIPE_PRICE_IDS,
  getOrCreateStripeCustomer,
  createCheckoutSession,
} from "@/lib/stripe";

const CheckoutSchema = z.object({
  tier: z.enum(["PRO", "ELITE"]),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.email) {
    return NextResponse.json(
      { error: "Your account has no email address on file. Please contact support." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const { tier } = parsed.data;
  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    console.error(`[checkout] Price ID not configured for tier ${tier}`);
    return NextResponse.json(
      { error: "This plan is not available right now. Please try again later." },
      { status: 503 }
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[checkout] ${message}`);
    // Don't leak Stripe internal details to the client
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again." },
      { status: 500 }
    );
  }
}
