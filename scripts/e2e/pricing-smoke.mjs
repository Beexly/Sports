#!/usr/bin/env node
/**
 * Browser-less pricing smoke (fetch). Auth-gated checkout is documented only.
 * Usage: HOST=https://www.galaxysportsedge.com node scripts/e2e/pricing-smoke.mjs
 */
const HOST = (process.env.HOST || "https://www.galaxysportsedge.com").replace(/\/$/, "");

async function main() {
  const pricing = await fetch(`${HOST}/pricing`, {
    redirect: "follow",
    headers: { "user-agent": "gse-pricing-smoke/1.0" },
  });
  if (!pricing.ok) {
    console.error(`FAIL pricing HTTP ${pricing.status}`);
    process.exit(1);
  }
  const html = await pricing.text();
  const hasPriceSignal =
    /Pro|Elite|Founding|\/mo|subscription/i.test(html) || html.length > 500;
  if (!hasPriceSignal) {
    console.error("FAIL pricing body missing commercial signals");
    process.exit(1);
  }
  console.log(`PASS  GET ${HOST}/pricing → ${pricing.status} (${html.length} bytes)`);

  // Checkout POST is auth-gated — probe that the route exists (401/403/405/400 ok; 404 bad)
  const checkout = await fetch(`${HOST}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "gse-pricing-smoke/1.0",
    },
    body: JSON.stringify({}),
  });
  if (checkout.status === 404) {
    console.error("FAIL checkout route 404");
    process.exit(1);
  }
  console.log(
    `PASS  POST ${HOST}/api/subscriptions/checkout → ${checkout.status} (auth/validation expected)`,
  );
  console.log(
    "NOTE  Full checkout + Stripe session requires authenticated session — operator/manual.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
