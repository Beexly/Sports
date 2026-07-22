import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, DurableWriteStoreUnavailableError, requireDurableWriteStore } from "@sports/db";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  getStripePriceId,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  retrieveOpenCheckoutSessionUrl,
} from "@/lib/stripe";
import {
  CheckoutAttemptPersistenceError,
  CheckoutIntentConflictError,
  bindCheckoutSessionToAttempt,
  claimCheckoutAttemptForStripeRequest,
  computeRequestFingerprint,
  currentCheckoutCommercialParams,
  getOrCreateCheckoutAttempt,
  isValidClientIntentId,
  recordCheckoutAttemptOutcome,
  type CheckoutAttemptDb,
} from "@/lib/billing/checkout-attempt";
import {
  classifyStripeSessionCreateError,
  transitionForOutcome,
} from "@/lib/billing/stripe-outcome";

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

  // DURABLE DATABASE IS A HARD PRECONDITION FOR STRIPE SIDE EFFECTS
  // (directive 5.2). The stub Prisma client no-ops writes while pretending
  // success — a checkout on top of it would create real Stripe state with no
  // durable local record. Fail closed with a typed 503 BEFORE any Stripe
  // customer/session creation; the guard records the ops incident.
  try {
    requireDurableWriteStore("stripe-checkout");
  } catch (err) {
    if (err instanceof DurableWriteStoreUnavailableError) {
      return NextResponse.json(
        {
          error: "Checkout is temporarily unavailable. Please try again shortly.",
          code: "durable_write_store_unavailable",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  // Double-billing guard: a user with a live paid subscription must change plans
  // through the billing portal, not a fresh checkout — a second checkout would
  // create a SECOND active Stripe subscription and bill them twice.
  //
  // FAIL CLOSED (directive 5.2): a lookup error is a 503 with NO Stripe side
  // effect — never "assume no subscription and proceed" (that is fail-open
  // double-billing behavior). The contract:
  //   lookup success + no live subscription → continue
  //   lookup success + live subscription    → 409 / billing portal
  //   lookup failure                        → 503 / no Stripe side effect
  let existingSub: { status: string; tier: string } | null;
  try {
    existingSub = await db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true, tier: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // Ops incident record — structured, secret-free.
    console.error(
      `[INCIDENT][checkout] subscription lookup failed for user ${session.user.id} — ` +
        `failing closed with 503, no Stripe side effect: ${message}`,
    );
    return NextResponse.json(
      {
        error: "Checkout is temporarily unavailable. Please try again shortly.",
        code: "subscription_lookup_unavailable",
      },
      { status: 503 },
    );
  }
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
    // (userId, activeClientIntentId) unique constraint; a same-intent retry
    // with a CHANGED fingerprint is a hard 409, never a silent key reuse.
    // The fingerprint covers the FULL canonical commercial request (5.5).
    const requestFingerprint = computeRequestFingerprint(
      currentCheckoutCommercialParams({
        userId: session.user.id,
        tier,
        interval,
        priceId,
        currency: CHECKOUT_CURRENCY,
      }),
    );

    let attemptResult;
    try {
      attemptResult = await getOrCreateCheckoutAttempt(db as unknown as CheckoutAttemptDb, {
        userId: session.user.id,
        clientIntentId,
        subjectEmail: session.user.email,
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
      if (err instanceof CheckoutAttemptPersistenceError) {
        // The store pretended to write (stub/no-op) — refuse to continue
        // toward Stripe (defense-in-depth behind requireDurableWriteStore).
        console.error(
          `[INCIDENT][checkout] non-durable attempt write detected for user ${session.user.id} — failing closed`,
        );
        return NextResponse.json(
          {
            error: "Checkout is temporarily unavailable. Please try again shortly.",
            code: "durable_write_store_unavailable",
          },
          { status: 503 },
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

    // Another request currently holds the claim and is talking to Stripe.
    // Do NOT race it with the same idempotency key — tell the client to retry
    // in a moment (by which time the winner has bound the session and the
    // retry gets the SAME session URL). A crashed claimant is recovered by
    // the repair job, never by racing.
    if (attempt.status === "REQUEST_IN_FLIGHT") {
      return NextResponse.json(
        {
          error: "This checkout is already being started. Please retry in a moment.",
          code: "checkout_attempt_in_progress",
        },
        { status: 409, headers: { "Retry-After": "2" } },
      );
    }

    // True idempotent retry (including unknown-network-outcome retries): the
    // attempt already has a session — hand back the SAME session URL while it
    // is still open. If retrieval fails, fall through to the idempotent
    // create: the attempt's persisted Stripe idempotency key replays the
    // original session within Stripe's window anyway.
    if (reused && attempt.status === "SESSION_CREATED" && attempt.stripeSessionId) {
      const existingUrl = await retrieveOpenCheckoutSessionUrl(attempt.stripeSessionId);
      if (existingUrl) {
        return NextResponse.json({ url: existingUrl });
      }
    }

    // Claim the exclusive right to talk to Stripe for this attempt
    // (CREATED/AMBIGUOUS/SESSION_CREATED → REQUEST_IN_FLIGHT). Under N
    // concurrent same-intent requests exactly ONE wins; the rest 409 above or
    // here and retry into the bound-session path. An AMBIGUOUS attempt is
    // retried HERE with the SAME attempt and SAME idempotency key — a fresh
    // attempt is only minted after reconciliation proves the original absent.
    const claimed = await claimCheckoutAttemptForStripeRequest(
      db as unknown as CheckoutAttemptDb,
      attempt.id,
    );
    if (!claimed) {
      return NextResponse.json(
        {
          error: "This checkout is already being started. Please retry in a moment.",
          code: "checkout_attempt_in_progress",
        },
        { status: 409, headers: { "Retry-After": "2" } },
      );
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
      // Outcome classification (directive 5.3): "Stripe threw" is not one
      // fact. DEFINITIVE/CONFIGURATION failures are terminal (FAILED, active
      // key released → a retry mints a fresh attempt + key). AMBIGUOUS keeps
      // the attempt AND key (only reconciliation may release them);
      // RETRIABLE returns the attempt to CREATED for a same-key retry.
      const outcomeClass = classifyStripeSessionCreateError(err);
      const transition = transitionForOutcome(outcomeClass);
      await recordCheckoutAttemptOutcome(db as unknown as CheckoutAttemptDb, attempt.id, {
        status: transition.status,
        releasesActiveKey: transition.releasesActiveKey,
        outcomeClass,
        errorKind: "stripe_session_create_failed",
      }).catch((recordErr: unknown) => {
        // Never mask the Stripe outcome with a bookkeeping error; the repair
        // job resolves a stale REQUEST_IN_FLIGHT row durably.
        const message = recordErr instanceof Error ? recordErr.message : "unknown";
        console.error(
          `[checkout] failed to record ${outcomeClass} outcome on attempt ${attempt.id} ` +
            `(repair job will reconcile): ${message}`,
        );
      });

      const message = err instanceof Error ? err.message : "unknown";
      console.error(`[checkout] stripe session create ${outcomeClass} for attempt ${attempt.id}: ${message}`);
      return NextResponse.json(
        {
          error:
            outcomeClass === "AMBIGUOUS_NETWORK_OUTCOME"
              ? "We could not confirm your checkout with the payment provider. It is safe to retry — you will never be double-charged."
              : "Checkout could not be started. Please try again shortly.",
          code: transition.errorCode,
        },
        { status: transition.httpStatus },
      );
    }

    // Bind the session to the attempt for webhook reconciliation and for the
    // same-URL idempotent-retry path above (REQUEST_IN_FLIGHT →
    // SESSION_CREATED, so a webhook that already advanced the attempt is
    // never regressed). A bind failure is NOT fatal to the buyer — the
    // session is real and payable — and is DURABLY reconciled by the repair
    // job, which finds the stale REQUEST_IN_FLIGHT row and re-binds it via
    // the attempt id stamped in the session metadata (directive 5.6).
    try {
      const bound = await bindCheckoutSessionToAttempt(
        db as unknown as CheckoutAttemptDb,
        attempt.id,
        checkoutSession.id,
        customerId,
      );
      if (!bound) {
        console.warn(
          `[checkout] session ${checkoutSession.id} not bound to attempt ${attempt.id} ` +
            `(state advanced concurrently) — repair/webhook reconciliation owns it`,
        );
      }
    } catch (bindErr) {
      const message = bindErr instanceof Error ? bindErr.message : "unknown";
      console.error(
        `[INCIDENT][checkout] failed to bind session ${checkoutSession.id} to attempt ` +
          `${attempt.id} — repair job will reconcile: ${message}`,
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Log the detail server-side; return a generic message so internal/Stripe
    // error text never leaks to the client.
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error(`Checkout error: ${message}`);
    return NextResponse.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
