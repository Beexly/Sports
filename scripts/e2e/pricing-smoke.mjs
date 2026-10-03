#!/usr/bin/env node
/**
 * Browser-less pricing smoke (fetch). Auth-gated checkout is documented only.
 * Usage: HOST=https://www.galaxysportsedge.com node scripts/e2e/pricing-smoke.mjs
 */
const rawHost = (process.env.HOST || process.env.SMOKE_HOST || "https://www.galaxysportsedge.com").trim();
const HOST = (
  !rawHost ||
  rawHost === "0.0.0.0" ||
  rawHost.startsWith("0.0.0.0") ||
  !/^https?:\/\//i.test(rawHost)
    ? "https://www.galaxysportsedge.com"
    : rawHost
).replace(/\/$/, "");

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
  // Require an actual dollar-formatted price string alongside a tier name —
  // not just a fallback on raw body length, which is true for nearly any
  // real Next.js page and would pass even if every price string vanished.
  const hasPriceSignal =
    (/\$\d+(?:\.\d{2})?/.test(html) &&
      /(?:\/\s*(?:mo|yr)|per month|\/month|monthly|Founding)/i.test(html)) &&
    /Pro|Elite|Fantasy|Founding/i.test(html);
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
