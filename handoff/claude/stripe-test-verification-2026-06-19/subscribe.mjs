// Controlled TEST subscribe cycle (Stripe REST API + prod DB reads).
// Creates a throwaway user + Stripe customer, subscribes to a given price with
// metadata.userId, lets the production webhook fire, then reads the DB to confirm
// entitlement. No session forging, no live app endpoints. Cleanup is separate.
import { loadEnv, getDb } from "./_db.mjs";
import { loadKey, stripeReq } from "./_lib.mjs";

loadEnv();
const PRICE = process.argv[2];
const TS = process.argv[3] || String(Date.now());
if (!PRICE) { console.log("usage: subscribe.mjs <priceId> [ts]"); process.exit(1); }

const email = `test+launch-audit-${TS}@galaxysportsedge.com`;
const key = loadKey();
const db = getDb();
const log = (label, obj) => console.log(`[${new Date().toISOString()}] ${label}: ${typeof obj === "string" ? obj : JSON.stringify(obj)}`);

// 1. test user
const user = await db.user.upsert({
  where: { email },
  create: { email, name: "Launch Audit Bot", role: "USER" },
  update: {},
});
log("USER", { id: user.id, email });

// 2. Stripe customer
const cust = await stripeReq(key, "POST", "/customers", { email, name: "Launch Audit Bot", "metadata[userId]": user.id, "metadata[purpose]": "stripe-test-verification" });
if (cust.status === 401) { log("STOP_401", cust.json); await db.$disconnect(); process.exit(3); }
const customerId = cust.json.id;
log("CUSTOMER", { id: customerId, status: cust.status });

// 3. attach test PaymentMethod (pm_card_visa = 4242 4242 4242 4242)
const attach = await stripeReq(key, "POST", `/payment_methods/pm_card_visa/attach`, { customer: customerId });
log("PM_ATTACH", { id: attach.json.id, status: attach.status, card_last4: attach.json.card?.last4, exp: `${attach.json.card?.exp_month}/${attach.json.card?.exp_year}` });
// set as default
await stripeReq(key, "POST", `/customers/${customerId}`, { "invoice_settings[default_payment_method]": attach.json.id });

// 4. create subscription (charges immediately), metadata.userId for webhook sync
const sub = await stripeReq(key, "POST", "/subscriptions", {
  customer: customerId,
  "items[0][price]": PRICE,
  "metadata[userId]": user.id,
  default_payment_method: attach.json.id,
  payment_behavior: "error_if_incomplete",
  "expand[]": "latest_invoice",
});
log("SUBSCRIBE", { status: sub.status, sub_id: sub.json.id, sub_status: sub.json.status, price: sub.json.items?.data?.[0]?.price?.id, invoice_id: sub.json.latest_invoice?.id, invoice_status: sub.json.latest_invoice?.status, invoice_paid: sub.json.latest_invoice?.paid, amount: sub.json.latest_invoice?.amount_paid });
const subId = sub.json.id;

if (sub.status >= 400) { log("STOP_SUBSCRIBE_FAILED", sub.json); console.log("RESULT_JSON", JSON.stringify({ userId: user.id, email, customerId, subId: null, priceTested: PRICE })); await db.$disconnect(); process.exit(4); }

// 5. poll DB for webhook side-effects (up to 60s)
let result = { webhookEvents: [], tier: null, subRow: null };
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const evs = await db.webhookEvent.findMany({ orderBy: { processedAt: "desc" }, take: 10, select: { type: true, stripeEventId: true, processedAt: true } });
  const subRow = await db.subscription.findUnique({ where: { userId: user.id }, select: { tier: true, status: true, stripeSubscriptionId: true, stripePriceId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } });
  result = { webhookEvents: evs, subRow };
  const got = subRow?.tier;
  if (subRow && got && got !== "FREE") { log("DB_SYNCED", { elapsed_s: (i + 1) * 2, subRow, webhookCount: evs.length }); break; }
  if (i % 3 === 0) log("POLL", { elapsed_s: (i + 1) * 2, tier: got ?? "(no row)", webhookCount: evs.length });
}

log("FINAL_WEBHOOK_EVENTS", result.webhookEvents);
log("FINAL_SUB_ROW", result.subRow);
console.log("RESULT_JSON", JSON.stringify({ userId: user.id, email, customerId, subId, priceTested: PRICE }));
await db.$disconnect();
