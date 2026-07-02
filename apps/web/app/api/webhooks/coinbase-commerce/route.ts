import { NextResponse } from "next/server";
import { db } from "@sports/db";
import {
  cryptoPassPeriod,
  grantFromCommerceEvent,
  verifyCommerceSignature,
} from "@/lib/billing/crypto-pass";

/**
 * Coinbase Commerce webhook — the only writer for crypto passes.
 *
 * Hard rules, mirrored from the spec:
 *   - HMAC signature verified on the RAW body before anything is parsed for
 *     effect; a bad signature is a 401, full stop.
 *   - Grant ONLY on charge:confirmed (grantFromCommerceEvent enforces it):
 *     pending/failed/underpaid events never unlock a tier.
 *   - Idempotent by externalChargeId (unique column): a replayed confirmed
 *     event acknowledges 200 without extending anything.
 *   - Fixed-term: periodEnd = now + 365d, cancelAtPeriodEnd = true. There is
 *     no auto-renew to cancel; the flag makes downstream banners treat the
 *     pass as ending unless deliberately renewed.
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

  const grant = grantFromCommerceEvent(event);
  if (!grant) {
    // Signed, but not a grant-worthy event (pending/failed/etc.) — acknowledge
    // so Commerce stops retrying; nothing changes on our side.
    return NextResponse.json({ received: true, granted: false });
  }

  // Idempotency: this exact charge already granted a pass.
  const already = await db.subscription
    .findFirst({ where: { externalChargeId: grant.chargeCode }, select: { id: true } })
    .catch(() => null);
  if (already) {
    return NextResponse.json({ received: true, granted: false, duplicate: true });
  }

  const { start, end } = cryptoPassPeriod(new Date());
  await db.subscription.upsert({
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
    },
  });

  return NextResponse.json({ received: true, granted: true });
}
