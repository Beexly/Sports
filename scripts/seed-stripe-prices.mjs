#!/usr/bin/env node
/**
 * Seed Stripe products and prices for Galaxy Sports Edge.
 *
 * Idempotent: if a product or price already exists with the same lookup_key,
 * it's reused. Safe to re-run; safe to run in Test mode AND in Live mode
 * (each mode keeps its own catalog).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe-prices.mjs
 *
 * Output is the four price IDs to paste into Vercel / .env.production:
 *   STRIPE_PRO_MONTHLY_PRICE_ID=price_...
 *   STRIPE_PRO_ANNUAL_PRICE_ID=price_...
 *   STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
 *   STRIPE_ELITE_ANNUAL_PRICE_ID=price_...
 *
 * Amounts MUST match the FOUNDING phase in
 * apps/web/lib/pricing/pricing-phases.ts (the single source of truth the
 * public pricing page renders from). The page never charges; Stripe does —
 * so if these drift from the page, customers see one price and pay another.
 *
 * Pure Node — no external dependencies. Uses fetch + the Stripe REST API.
 */

const STRIPE_API = "https://api.stripe.com/v1";

// Founding phase, monthly + annual. Keep in lockstep with pricing-phases.ts.
const CATALOG = [
  {
    productName: "Galaxy Sports Edge Pro",
    productLookup: "gse-pro",
    tier: "PRO",
    prices: [
      { priceLookup: "gse-pro-monthly", unitAmount: 1499, interval: "month", envVar: "STRIPE_PRO_MONTHLY_PRICE_ID" }, // $14.99/mo
      { priceLookup: "gse-pro-annual", unitAmount: 9900, interval: "year", envVar: "STRIPE_PRO_ANNUAL_PRICE_ID" }, // $99/yr
    ],
  },
  {
    productName: "Galaxy Sports Edge Elite",
    productLookup: "gse-elite",
    tier: "ELITE",
    prices: [
      { priceLookup: "gse-elite-monthly", unitAmount: 2499, interval: "month", envVar: "STRIPE_ELITE_MONTHLY_PRICE_ID" }, // $24.99/mo
      { priceLookup: "gse-elite-annual", unitAmount: 17900, interval: "year", envVar: "STRIPE_ELITE_ANNUAL_PRICE_ID" }, // $179/yr
    ],
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

async function findOrCreateProduct(key, { productName, productLookup, tier }) {
  // Search by metadata.lookup since Stripe products don't have a native lookup_key.
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
    "metadata[tier]": tier,
  });
}

async function findOrCreatePrice(key, product, tier, { priceLookup, unitAmount, interval }) {
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
    "metadata[tier]": tier, // webhook maps by env price-id; tier metadata is a durable backstop
  });
}

async function main() {
  const key = checkKey();
  const isLive = key.startsWith("sk_live_");

  console.log(`\nSeeding Stripe ${isLive ? "LIVE" : "TEST"} mode…\n`);

  const envOut = [];

  for (const product of CATALOG) {
    const created = await findOrCreateProduct(key, product);
    for (const price of product.prices) {
      process.stdout.write(`  ${price.priceLookup.padEnd(20, " ")}`);
      try {
        const p = await findOrCreatePrice(key, created, product.tier, price);
        console.log(`✓  price=${p.id}`);
        envOut.push(`${price.envVar}=${p.id}`);
      } catch (err) {
        console.log(`✗  ${err.message}`);
        process.exit(1);
      }
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
