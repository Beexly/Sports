import { NextResponse } from "next/server";
import { db, Prisma } from "@sports/db";
import { stripe } from "@/lib/stripe";
import {
  cryptoPassPeriod,
  CRYPTO_PASS_DAYS,
  grantFromCommerceEvent,
  verifyCommerceSignature,
} from "@/lib/billing/crypto-pass";

/**
 * Coinbase Commerce webhook — the only writer for crypto passes.
 *
 * Hard rules (each earned by an adversarial finding):
 *   - HMAC verified on the RAW body first; a bad signature is a 401.
 *   - Grant ONLY on charge:confirmed. charge:delayed and charge:resolved are
 *     NOT auto-granted: charge:resolved fires for merchant-resolved UNDER/OVER
 *     payments too, so auto-granting it would unlock a tier for a partial
 *     payment. Both route to a LOUD manual-review log instead.
 *   - A confirmed charge whose metadata is missing (money in, cannot map to a
 *     user) is logged LOUDLY, never swallowed silently.
 *   - Idempotent via the append-only CommerceCharge ledger (insert-before-
 *     grant); a replay hits the unique constraint and grants nothing.
 *   - Extend-don't-reset is done under a SERIALIZABLE transaction with retry,
 *     so two distinct concurrent payments each add a year (no lost-update).
 *   - When a grant lands on a row that still points at a LIVE Stripe
 *     subscription, that subscription is CANCELLED at Stripe — otherwise the
 *     card keeps billing forever after the crypto rail takes over.
 */

export const dynamic = "force-dynamic";

function chargeCodeOf(event: unknown): string {
  const c = (event as { data?: { code?: unknown } } | null)?.data?.code;
  return typeof c === "string" ? c : "unknown";
}

export async function POST(request: Request) {
  const secret = process.env["COINBASE_COMMERCE_WEBHOOK_SECRET"];
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-cc-webhook-signature");
  if (!verifyCommerceSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: unknown;
  try {
    event = (JSON.parse(rawBody) as { event?: unknown }).event ?? null;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const type = (event as { type?: unknown } | null)?.type;

  // Money that landed but is NOT a clean confirmed payment: never auto-grant,
  // never silent. A human confirms full payment and grants manually.
  if (type === "charge:delayed" || type === "charge:resolved") {
    console.error(
      `[commerce] MANUAL REVIEW — ${String(type)} on charge ${chargeCodeOf(event)}: ` +
        "funds may be delayed, partial, or over-paid. Confirm full payment before granting.",
    );
    return NextResponse.json({ received: true, granted: false, review: true });
  }

  const grant = grantFromCommerceEvent(event);
  if (!grant) {
    // A confirmed charge that cannot be mapped to a user (missing metadata) is
    // money in with no owner — that must be loud, not a silent 200.
    if (type === "charge:confirmed") {
      console.error(
        `[commerce] MANUAL REVIEW — confirmed charge ${chargeCodeOf(event)} has missing/invalid ` +
          "metadata (userId/tier); payment received but cannot grant. Reconcile manually.",
      );
    }
    return NextResponse.json({ received: true, granted: false });
  }

  const now = new Date();
  const { start } = cryptoPassPeriod(now);

  // Grant under SERIALIZABLE isolation with a small retry, so two concurrent
  // distinct payments cannot both read the same base period and lose a year.
  let result: { granted: boolean; priorStripeSubId: string | null } = {
    granted: false,
    priorStripeSubId: null,
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      result = await db.$transaction(
        async (tx) => {
          try {
            await tx.commerceCharge.create({
              data: { chargeCode: grant.chargeCode, userId: grant.userId, tier: grant.tier },
            });
          } catch (err) {
            if ((err as { code?: string }).code === "P2002") {
              return { granted: false, priorStripeSubId: null }; // replay: no-op
            }
            throw err;
          }

          const existing = await tx.subscription.findUnique({
            where: { userId: grant.userId },
            select: { currentPeriodEnd: true, stripeSubscriptionId: true, paymentProvider: true },
          });
          const base =
            existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > now.getTime()
              ? existing.currentPeriodEnd
              : now;
          const end = new Date(base.getTime() + CRYPTO_PASS_DAYS * 24 * 60 * 60 * 1000);
          // A LIVE Stripe sub still attached to this row must be cancelled once
          // the crypto rail takes over (done after commit, best-effort).
          const priorStripeSubId =
            existing?.paymentProvider === "STRIPE" ? existing.stripeSubscriptionId ?? null : null;

          await tx.subscription.upsert({
            where: { userId: grant.userId },
            create: {
              userId: grant.userId,
              paymentProvider: "COINBASE_COMMERCE",
              externalChargeId: grant.chargeCode,
              tier: grant.tier,
              status: "ACTIVE",
              currentPeriodStart: start,
              currentPeriodEnd: end,
              cancelAtPeriodEnd: true,
            },
            update: {
              paymentProvider: "COINBASE_COMMERCE",
              externalChargeId: grant.chargeCode,
              tier: grant.tier,
              status: "ACTIVE",
              currentPeriodStart: start,
              currentPeriodEnd: end,
              cancelAtPeriodEnd: true,
              stripeSubscriptionId: null,
              stripePriceId: null,
              pastDueSince: null,
              trialStart: null,
              trialEnd: null,
              canceledAt: null,
            },
          });
          return { granted: true, priorStripeSubId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (err) {
      // Serialization failure: retry reads the freshly-committed period.
      if ((err as { code?: string }).code === "P2034" && attempt < 3) continue;
      throw err;
    }
  }

  // Stop the orphaned card rail: cancel the Stripe subscription the crypto pass
  // just replaced, so the customer is never double-billed. Best-effort but
  // LOUD on failure — a silent failure here is exactly the double-bill bug.
  if (result.granted && result.priorStripeSubId) {
    try {
      await stripe.subscriptions.cancel(result.priorStripeSubId);
      console.warn(
        `[commerce] cancelled Stripe sub ${result.priorStripeSubId} for user ${grant.userId} ` +
          "(replaced by crypto pass).",
      );
    } catch (err) {
      console.error(
        `[commerce] URGENT — failed to cancel Stripe sub ${result.priorStripeSubId} for user ` +
          `${grant.userId} after crypto grant; customer may be double-billed. Cancel manually. ` +
          `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json({
    received: true,
    granted: result.granted,
    duplicate: !result.granted,
  });
}
