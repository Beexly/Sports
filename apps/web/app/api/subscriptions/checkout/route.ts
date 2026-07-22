import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  getStripePriceId,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  retrieveOpenCheckoutSessionUrl,
} from "@/lib/stripe";
import {
  CheckoutIntentConflictError,
  computeRequestFingerprint,
  currentCommercialTermsVersion,
  getOrCreateCheckoutAttempt,
  isValidClientIntentId,
  type CheckoutAttemptDb,
} from "@/lib/billing/checkout-attempt";

const CheckoutSchema = z.object({
  tier: z.enum(["FANTASY", "PRO", "ELITE"]),
  interval: z.enum(["month", "year"]).default("month"),
  // Optional per-visit intent hint from the client (crypto.randomUUID).
  // Validated separately below so a malformed value gets a TYPED 400 instead
  // of the generic invalid-tier message. All idempotency guarantees live
  // server-side in the CheckoutAttempt row — this is only a correlation hint.
  clientIntentId: z.string().optional(),
});

// Checkout charges USD only today (pricing-phases amounts are USD).
const CHECKOUT_CURRENCY = "usd";

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
  const clientIntentId = parsed.data.clientIntentId ?? null;
  if (clientIntentId !== null && !isValidClientIntentId(clientIntentId)) {
    return NextResponse.json(
      {
        error: "clientIntentId must be a UUID.",
        code: "invalid_client_intent_id",
      },
      { status: 400 },
    );
  }

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

  // Double-billing guard: a user with a live paid subscription must change plans
  // through the billing portal, not a fresh checkout — a second checkout would
  // create a SECOND active Stripe subscription and bill them twice. Fail closed
  // toward allowing checkout only on a lookup error (never block a genuine buyer).
  const existingSub = await db.subscription
    .findUnique({
      where: { userId: session.user.id },
      select: { status: true, tier: true },
    })
    .catch(() => null);
  const hasLivePaidSub =
    existingSub != null &&
    (existingSub.status === "ACTIVE" || existingSub.status === "TRIALING" || existingSub.status === "PAST_DUE") &&
    existingSub.tier !== "FREE";
  if (hasLivePaidSub) {
    return NextResponse.json(
      {
        error: "You already have an active subscription. Manage or change your plan from the billing portal.",
        code: "already_subscribed",
      },
      { status: 409 }
    );
  }

  try {
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name
    );

    // Durable attempt: the server-side source of truth for this checkout's
    // idempotency (see lib/billing/checkout-attempt.ts). Race-safe via the
    // (userId, clientIntentId) unique constraint; a same-intent retry with a
    // CHANGED fingerprint is a hard 409, never a silent key reuse.
    const requestFingerprint = computeRequestFingerprint({
      userId: session.user.id,
      tier,
      interval,
      priceId,
      currency: CHECKOUT_CURRENCY,
      termsVersion: currentCommercialTermsVersion(),
    });

    let attemptResult;
    try {
      attemptResult = await getOrCreateCheckoutAttempt(db as unknown as CheckoutAttemptDb, {
        userId: session.user.id,
        clientIntentId,
        customerId,
        tier,
        interval,
        priceId,
        currency: CHECKOUT_CURRENCY,
        requestFingerprint,
      });
    } catch (err) {
      if (err instanceof CheckoutIntentConflictError) {
        return NextResponse.json(
          { error: err.message, code: "checkout_intent_conflict" },
          { status: 409 },
        );
      }
      throw err;
    }
    const { attempt, reused } = attemptResult;

    // The intent already completed (webhook reconciled a paid checkout) —
    // never open a new session for it. The double-billing guard above usually
    // catches this first once the subscription row syncs; this closes the
    // window between completion and sync.
    if (attempt.status === "COMPLETED") {
      return NextResponse.json(
        {
          error: "This checkout was already completed. Manage your plan from the billing portal.",
          code: "checkout_attempt_completed",
        },
        { status: 409 },
      );
    }

    // True idempotent retry (including unknown-network-outcome retries): the
    // attempt already has a session — hand back the SAME session URL while it
    // is still open. If retrieval fails, fall through to the idempotent
    // create: the attempt-derived Stripe idempotency key replays the original
    // session within Stripe's window anyway.
    if (reused && attempt.status === "SESSION_CREATED" && attempt.stripeSessionId) {
      const existingUrl = await retrieveOpenCheckoutSessionUrl(attempt.stripeSessionId);
      if (existingUrl) {
        return NextResponse.json({ url: existingUrl });
      }
    }

    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    let checkoutSession;
    try {
      checkoutSession = await createCheckoutSession({
        customerId,
        priceId,
        userId: session.user.id,
        attemptId: attempt.id,
        successUrl: `${appUrl}/dashboard?upgraded=true`,
        cancelUrl: `${appUrl}/pricing`,
      });
    } catch (err) {
      // Record the failure on the attempt (best-effort — never mask the real
      // error) so a retry mints a FRESH attempt + fresh Stripe key instead of
      // replaying a possibly-cached error response.
      await db.checkoutAttempt
        .updateMany({
          where: { id: attempt.id, status: { in: ["CREATED", "SESSION_CREATED"] } },
          data: { status: "FAILED", lastErrorKind: "stripe_session_create_failed" },
        })
        .catch(() => undefined);
      throw err;
    }

    // Bind the session to the attempt for webhook reconciliation and for the
    // same-URL idempotent-retry path above. Guarded to non-terminal states so
    // a webhook that already marked the attempt COMPLETED is never regressed.
    await db.checkoutAttempt
      .updateMany({
        where: { id: attempt.id, status: { in: ["CREATED", "SESSION_CREATED"] } },
        data: { status: "SESSION_CREATED", stripeSessionId: checkoutSession.id, customerId },
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(`[checkout] failed to bind session ${checkoutSession.id} to attempt ${attempt.id}: ${message}`);
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
