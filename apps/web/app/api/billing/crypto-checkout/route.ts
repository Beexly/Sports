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

  const body = (await request.json().catch(() => null)) as { tier?: unknown } | null;
  const tier = body?.tier;
  if (!isCryptoPassTier(tier)) {
    return NextResponse.json(
      { error: "tier must be PRO or ELITE (annual crypto passes only)." },
      { status: 400 },
    );
  }

  // An active card subscription already covers this user; a crypto pass on
  // top would double-charge them for nothing.
  const existing = await db.subscription
    .findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true, tier: true } })
    .catch(() => null);
  if (
    existing &&
    existing.status === "ACTIVE" &&
    existing.tier !== "FREE" &&
    existing.currentPeriodEnd &&
    existing.currentPeriodEnd.getTime() > Date.now()
  ) {
    return NextResponse.json(
      { error: "You already have an active subscription." },
      { status: 409 },
    );
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
