#!/usr/bin/env node
/**
 * Create Stripe Payment Links for Founding tiers via lookup_key.
 *
 * Usage (founder machine with STRIPE_SECRET_KEY):
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/ops/create-founding-payment-link.mjs
 *   STRIPE_SECRET_KEY=... node scripts/ops/create-founding-payment-link.mjs --tier FANTASY --interval month
 *
 * Does NOT charge anyone. Prints URLs for you to open once for a sticky paid seat.
 * Prefer lookup_key so missing Vercel price envs still work after money-path PR.
 */
import Stripe from "stripe";

const KEYS = {
  FANTASY: { month: "gse-fantasy-monthly", year: "gse-fantasy-annual" },
  PRO: { month: "gse-pro-monthly", year: "gse-pro-annual" },
  ELITE: { month: "gse-elite-monthly", year: "gse-elite-annual" },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("STRIPE_SECRET_KEY missing — abort (no secrets invented)");
  process.exit(1);
}

const tier = String(arg("tier", "FANTASY")).toUpperCase();
const interval = String(arg("interval", "month"));
const lookup = KEYS[tier]?.[interval];
if (!lookup) {
  console.error("Unknown tier/interval. tier=FANTASY|PRO|ELITE interval=month|year");
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

const listed = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
const price = listed.data[0];
if (!price) {
  console.error(
    `No active price with lookup_key=${lookup}. Set the lookup_key on the Stripe Price, then re-run.`,
  );
  process.exit(2);
}

const link = await stripe.paymentLinks.create({
  line_items: [{ price: price.id, quantity: 1 }],
  after_completion: {
    type: "redirect",
    redirect: { url: "https://www.galaxysportsedge.com/pricing?paid=1" },
  },
  metadata: { gse_tier: tier, gse_interval: interval, gse_lookup_key: lookup },
  allow_promotion_codes: true,
});

console.log(JSON.stringify({
  ok: true,
  tier,
  interval,
  lookup_key: lookup,
  price_id: price.id,
  payment_link: link.url,
  note: "Open the payment_link once yourself for the sticky paid seat. Agent never charges your card.",
}, null, 2));
