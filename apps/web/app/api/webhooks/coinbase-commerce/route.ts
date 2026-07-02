import { NextResponse } from "next/server";
import { db } from "@sports/db";
import {
  cryptoPassPeriod,
  CRYPTO_PASS_DAYS,
  grantFromCommerceEvent,
  verifyCommerceSignature,
} from "@/lib/billing/crypto-pass";

/**
 * Coinbase Commerce webhook — the only writer for crypto passes.
 *
 * Hard rules:
 *   - HMAC signature verified on the RAW body before anything is parsed for
 *     effect; a bad signature is a 401, full stop.
 *   - Grant ONLY on charge:confirmed or charge:resolved (a delayed payment
 *     that later completes). Pending/failed/created events never unlock.
 *   - Idempotent via the APPEND-ONLY CommerceCharge ledger: the charge code is
 *     inserted BEFORE granting, so a replayed event hits the unique constraint
 *     and is acknowledged without re-granting — and because the ledger is a
 *     separate table, a second DISTINCT payment still grants and EXTENDS the
 *     pass (max(now, current end) + 365d) instead of resetting or vanishing.
 *   - The update path clears every Stripe lifecycle column it can, so a stale
 *     Stripe dunning/deletion event can no longer match this row and wipe a
 *     freshly paid pass (the Stripe webhook is also provider-guarded).
 *   - charge:delayed (funds arrived after the payment window) grants nothing
 *     by itself; it is logged loudly for manual review, and the follow-up
 *     charge:resolved grants when Commerce resolves the charge.
 */

export const dynamic = "force-dynamic";

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

  // Money arrived outside the payment window: no grant yet (Commerce will
  // follow with charge:resolved), but this must never pass silently.
  const type = (event as { type?: unknown } | null)?.type;
  if (type === "charge:delayed") {
    const code = (event as { data?: { code?: unknown } }).data?.code;
    console.error(
      `[commerce] DELAYED payment on charge ${String(code)} — funds received after the window; ` +
        "watch for charge:resolved, review manually if it does not follow.",
    );
    return NextResponse.json({ received: true, granted: false, delayed: true });
  }

  const grant = grantFromCommerceEvent(event);
  if (!grant) {
    // Signed, but not a grant-worthy event (pending/failed/etc.) — acknowledge
    // so Commerce stops retrying; nothing changes on our side.
    return NextResponse.json({ received: true, granted: false });
  }

  const now = new Date();
  const granted = await db.$transaction(async (tx) => {
    // Idempotency spine: insert the charge code FIRST. A replayed event hits
    // the unique constraint (P2002) and grants nothing.
    try {
      await tx.commerceCharge.create({
        data: { chargeCode: grant.chargeCode, userId: grant.userId, tier: grant.tier },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return false; // duplicate
      throw err;
    }

    // Extend-don't-reset: a second distinct payment stacks a full year on top
    // of whatever unexpired time remains.
    const existing = await tx.subscription.findUnique({
      where: { userId: grant.userId },
      select: { currentPeriodEnd: true },
    });
    const base =
      existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > now.getTime()
        ? existing.currentPeriodEnd
        : now;
    const end = new Date(base.getTime() + CRYPTO_PASS_DAYS * 24 * 60 * 60 * 1000);
    const { start } = cryptoPassPeriod(now);

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
        cancelAtPeriodEnd: true, // fixed term by design — no auto-renew exists
      },
      update: {
        paymentProvider: "COINBASE_COMMERCE",
        externalChargeId: grant.chargeCode,
        tier: grant.tier,
        status: "ACTIVE",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: true,
        // Sever the row from Stripe's lifecycle machinery: with these cleared,
        // a late dunning-failure or deletion event for the OLD card
        // subscription can no longer match and wipe the pass they just paid
        // for. stripeCustomerId stays (they may return to card billing later).
        stripeSubscriptionId: null,
        stripePriceId: null,
        pastDueSince: null,
        trialStart: null,
        trialEnd: null,
        canceledAt: null,
      },
    });
    return true;
  });

  if (!granted) {
    return NextResponse.json({ received: true, granted: false, duplicate: true });
  }
  return NextResponse.json({ received: true, granted: true });
}
