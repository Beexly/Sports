#!/usr/bin/env node
/**
 * Seed Stripe products and prices for Helm.
 *
 * Idempotent: if a product or price already exists with the same lookup_key,
 * it's reused. Safe to re-run; safe to run in Test mode AND in Live mode.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe-prices.mjs
 *
 * Output is the price IDs to paste back into Vercel:
 *   STRIPE_PRO_PRICE_ID=price_...
 *   STRIPE_ELITE_PRICE_ID=price_...
 *
 * Why a lookup_key matters: it lets the script (and humans in the Stripe
 * dashboard) recognize a previously-created price by stable name instead of
 * by Stripe's auto-generated price_id. Without it, re-running this script
 * would silently create duplicate prices.
 *
 * Pure Node — no external dependencies. Uses fetch + the Stripe REST API.
 */

const STRIPE_API = "https://api.stripe.com/v1";

const PLANS = [
  {
    productName: "Helm Pro",
    productLookup: "helm-pro",
    priceLookup: "helm-pro-monthly",
    unitAmount: 1900, // $19.00
    interval: "month",
    envVar: "STRIPE_PRO_PRICE_ID",
  },
  {
    productName: "Helm Elite",
    productLookup: "helm-elite",
    priceLookup: "helm-elite-monthly",
    unitAmount: 4900, // $49.00
    interval: "month",
    envVar: "STRIPE_ELITE_PRICE_ID",
  },
];

function checkKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("✗ STRIPE_SECRET_KEY is not set.");
    console.error("  Run: STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe-prices.mjs");
    process.exit(1);
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    console.error("✗ STRIPE_SECRET_KEY does not look like a Stripe secret key.");
    process.exit(1);
  }
  if (key.startsWith("sk_live_")) {
    console.warn("⚠ Live mode key detected — this will create production prices.");
  }
  return key;
}

async function stripeRequest(key, method, path, body = null) {
  const url = `${STRIPE_API}${path}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const init = { method, headers };
  if (body) init.body = new URLSearchParams(body).toString();
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe ${method} ${path} → ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`
    );
  }
  return json;
}

async function findOrCreateProduct(key, { productName, productLookup }) {
  // Search by metadata.lookup since Stripe products don't have native lookup_key.
  const search = await stripeRequest(
    key,
    "GET",
    `/products/search?query=metadata['lookup']:'${productLookup}'&limit=1`
  );
  if (search.data.length > 0) {
    return search.data[0];
  }
  return stripeRequest(key, "POST", "/products", {
    name: productName,
    "metadata[lookup]": productLookup,
  });
}

async function findOrCreatePrice(key, product, { priceLookup, unitAmount, interval }) {
  const search = await stripeRequest(
    key,
    "GET",
    `/prices/search?query=lookup_key:'${priceLookup}'&limit=1`
  );
  if (search.data.length > 0) {
    return search.data[0];
  }
  return stripeRequest(key, "POST", "/prices", {
    product: product.id,
    unit_amount: String(unitAmount),
    currency: "usd",
    "recurring[interval]": interval,
    lookup_key: priceLookup,
  });
}

async function main() {
  const key = checkKey();
  const isLive = key.startsWith("sk_live_");

  console.log(`\nSeeding Stripe ${isLive ? "LIVE" : "TEST"} mode…\n`);

  const envOut = [];

  for (const plan of PLANS) {
    process.stdout.write(`  ${plan.productName.padEnd(20, " ")}`);
    try {
      const product = await findOrCreateProduct(key, plan);
      const price = await findOrCreatePrice(key, product, plan);
      console.log(`✓  price=${price.id}`);
      envOut.push(`${plan.envVar}=${price.id}`);
    } catch (err) {
      console.log(`✗  ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\nPaste these into Vercel (or .env.production):\n");
  for (const line of envOut) console.log(`  ${line}`);
  console.log("");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
