import { loadKey, stripeReq, maskKey } from "./_lib.mjs";

const key = loadKey();
console.log("KEY_PREFIX:", maskKey(key));
if (key.startsWith("sk_live_")) {
  console.log("STOP: LIVE key detected in .env.production.local");
  process.exit(2);
}

// account
const acct = await stripeReq(key, "GET", "/account");
if (acct.status === 401) { console.log("STOP_401: secret rejected"); process.exit(3); }
console.log("ACCOUNT:", JSON.stringify({ id: acct.json.id, name: acct.json.settings?.dashboard?.display_name, livemode: acct.json.charges_enabled }));

const products = await stripeReq(key, "GET", "/products?active=true&limit=20");
const prices = await stripeReq(key, "GET", "/prices?active=true&limit=50&expand[]=data.product");
const hooks = await stripeReq(key, "GET", "/webhook_endpoints?limit=20");

console.log("\n=== PRODUCTS ===");
for (const p of products.json.data ?? []) {
  console.log(JSON.stringify({ id: p.id, name: p.name, metadata: p.metadata }));
}

console.log("\n=== PRICES ===");
for (const pr of prices.json.data ?? []) {
  console.log(JSON.stringify({
    id: pr.id,
    product: typeof pr.product === "object" ? pr.product.name : pr.product,
    product_id: typeof pr.product === "object" ? pr.product.id : pr.product,
    unit_amount: pr.unit_amount,
    dollars: pr.unit_amount != null ? (pr.unit_amount / 100).toFixed(2) : null,
    currency: pr.currency,
    interval: pr.recurring?.interval ?? null,
    type: pr.type,
    lookup_key: pr.lookup_key,
    metadata: pr.metadata,
  }));
}

console.log("\n=== WEBHOOKS ===");
for (const h of hooks.json.data ?? []) {
  console.log(JSON.stringify({
    id: h.id,
    url: h.url,
    status: h.status,
    api_version: h.api_version,
    secret_format: h.secret ? (h.secret.startsWith("whsec_") ? "whsec_..." : "OTHER") : "(not returned on list)",
    enabled_events: h.enabled_events,
  }, null, 2));
}
