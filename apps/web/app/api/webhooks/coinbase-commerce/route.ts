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
          // Read the row FIRST so we know what Stripe sub (if any) this grant
          // replaces, and can record it durably in the ledger below.
          const existing = await tx.subscription.findUnique({
            where: { userId: grant.userId },
            select: { currentPeriodEnd: true, stripeSubscriptionId: true, paymentProvider: true },
          });
          const priorStripeSubId =
            existing?.paymentProvider === "STRIPE" ? existing.stripeSubscriptionId ?? null : null;

          try {
            await tx.commerceCharge.create({
              data: {
                chargeCode: grant.chargeCode,
                userId: grant.userId,
                tier: grant.tier,
                // Durable so a replay after a crash-before-cancel can recover it.
                stripeSubToCancel: priorStripeSubId,
              },
            });
          } catch (err) {
            if ((err as { code?: string }).code === "P2002") {
              // Replay: grant nothing, but recover the sub-to-cancel from the
              // original ledger row so a crash-orphaned Stripe sub still gets
              // cancelled below (the cancel is idempotent).
              const prior = await tx.commerceCharge.findUnique({
                where: { chargeCode: grant.chargeCode },
                select: { stripeSubToCancel: true },
              });
              return { granted: false, priorStripeSubId: prior?.stripeSubToCancel ?? null };
            }
            throw err;
          }

          const base =
            existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > now.getTime()
              ? existing.currentPeriodEnd
              : now;
          const end = new Date(base.getTime() + CRYPTO_PASS_DAYS * 24 * 60 * 60 * 1000);

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
  // replaced, so the customer is never double-billed. This runs whenever a
  // sub-to-cancel is known — including on a REPLAY that recovered it from the
  // ledger, which is how a crash between commit and cancel is repaired.
  if (result.priorStripeSubId) {
    try {
      await stripe.subscriptions.cancel(result.priorStripeSubId);
      console.warn(
        `[commerce] cancelled Stripe sub ${result.priorStripeSubId} for user ${grant.userId} ` +
          "(replaced by crypto pass).",
      );
    } catch (err) {
      // Already cancelled / gone is the desired end state, not an incident —
      // don't cry wolf and bury the genuine failures.
      const code = (err as { code?: string }).code;
      if (code === "resource_missing") {
        console.warn(
          `[commerce] Stripe sub ${result.priorStripeSubId} already gone for user ${grant.userId} ` +
            "(nothing to cancel).",
        );
      } else {
        console.error(
          `[commerce] URGENT — failed to cancel Stripe sub ${result.priorStripeSubId} for user ` +
            `${grant.userId} after crypto grant; customer may be double-billed. Cancel manually. ` +
            `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return NextResponse.json({
    received: true,
    granted: result.granted,
    duplicate: !result.granted,
  });
}
