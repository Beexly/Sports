import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import {
  cryptoPassPriceUsd,
  cryptoPaymentsEnabled,
  isCryptoPassTier,
  CRYPTO_PASS_DAYS,
} from "@/lib/billing/crypto-pass";

/**
 * Create a Coinbase Commerce charge for an annual crypto pass.
 *
 * Dark-shipped: 503 until CRYPTO_PAYMENTS_ENABLED + both Commerce secrets are
 * set. Requires a signed-in user (the webhook grants by userId from charge
 * metadata). Price comes from the live pricing phase; the hosted checkout
 * handles wallets, currencies, and volatility — we never touch keys or coins.
 */

export const dynamic = "force-dynamic";

const COMMERCE_CHARGES_URL = "https://api.commerce.coinbase.com/charges";

// Per-user rate limit (in-memory token bucket, same pattern as
// api/cipher/verify): charge creation hits Coinbase's API and mints real
// payment intents — a signed-in user must not be able to spam it.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  // Opportunistic eviction: without this the in-memory Map grows unbounded over
  // a long-lived instance (one entry per distinct user, forever). Prune expired
  // windows when the map gets large. (Per-instance limiter; a shared store would
  // make it global — noted in the go-live checklist.)
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfterSec: 0 };
  }
  if (b.count >= MAX_ATTEMPTS) {
    return { limited: true, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { limited: false, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  if (!cryptoPaymentsEnabled()) {
    return NextResponse.json(
      { error: "Crypto payments are not enabled." },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const limit = rateLimited(userId);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = (await request.json().catch(() => null)) as { tier?: unknown } | null;
  const tier = body?.tier;
  if (!isCryptoPassTier(tier)) {
    return NextResponse.json(
      { error: "tier must be PRO or ELITE (annual crypto passes only)." },
      { status: 400 },
    );
  }

  // Double-buy guard, in both directions:
  //   - Stripe rows: ACTIVE, TRIALING, or PAST_DUE (dunning may still recover)
  //     card subscriptions block a crypto purchase — a pass on top would
  //     double-charge them, and a dying card sub interleaving with a fresh
  //     pass is exactly the clobber scenario the webhooks guard against.
  //   - Crypto rows: an unexpired pass blocks a SECOND pass until the final
  //     30 days, when the renewal window opens (the webhook extends from the
  //     current end, so renewing early never loses days).
  const existing = await db.subscription
    .findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, tier: true, paymentProvider: true },
    })
    .catch(() => null);
  if (existing && existing.tier !== "FREE") {
    const RENEWAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
    const periodEndMs = existing.currentPeriodEnd?.getTime() ?? 0;
    if (existing.paymentProvider === "COINBASE_COMMERCE") {
      if (periodEndMs > Date.now() + RENEWAL_WINDOW_MS) {
        return NextResponse.json(
          {
            error:
              "Your crypto pass is active. Renewal opens in its final 30 days, and renewing then adds a full year on top.",
          },
          { status: 409 },
        );
      }
    } else if (["ACTIVE", "TRIALING", "PAST_DUE"].includes(existing.status)) {
      return NextResponse.json(
        {
          error:
            "You already have a card subscription. Manage it from your dashboard before buying a crypto pass.",
        },
        { status: 409 },
      );
    }
  }

  const usd = cryptoPassPriceUsd(tier);
  const res = await fetch(COMMERCE_CHARGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-CC-Api-Key": process.env["COINBASE_COMMERCE_API_KEY"]!,
      "X-CC-Version": "2018-03-22",
    },
    body: JSON.stringify({
      name: `Galaxy Sports Edge ${tier} — annual pass`,
      description: `${CRYPTO_PASS_DAYS}-day ${tier} access. Fixed term, no auto-renew.`,
      pricing_type: "fixed_price",
      local_price: { amount: usd.toFixed(2), currency: "USD" },
      metadata: { userId, tier },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json(
      { error: "Could not create the charge. Try again shortly." },
      { status: 502 },
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | { data?: { hosted_url?: string; code?: string } }
    | null;
  const hostedUrl = payload?.data?.hosted_url;
  if (!hostedUrl) {
    return NextResponse.json(
      { error: "Charge created but no checkout URL returned." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: hostedUrl, code: payload?.data?.code ?? null });
}
