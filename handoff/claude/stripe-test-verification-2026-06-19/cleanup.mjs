// Tear down everything the verification created: 3 Stripe test customers
// (deletion cancels their subscriptions) and all test DB rows.
import { getDb } from "./_db.mjs";
import { loadKey, stripeReq } from "./_lib.mjs";

const key = loadKey();
const db = getDb();
const customers = ["cus_UjflbQt0zvmQKe", "cus_UjfntwBN0qBjCN", "cus_UjfpQTPXUvG0hh"];

for (const c of customers) {
  const del = await stripeReq(key, "DELETE", `/customers/${c}`);
  console.log("DELETE_CUSTOMER", c, del.status, JSON.stringify(del.json?.deleted ?? del.json?.error?.message ?? del.json));
}

// allow deletion webhooks to land, then purge DB
await new Promise(r => setTimeout(r, 8000));

// Surgical: only delete webhook_events whose payload references one of OUR test
// customers or subscriptions. Never a blanket wipe.
const mine = new Set([...customers, "sub_1TkCPeBVaxqE8bKVcmqR16PV", "sub_1TkCRZBVaxqE8bKVkMhf9O5w", "sub_1TkCTTBVaxqE8bKVu9IcFSe6"]);
const all = await db.webhookEvent.findMany({ select: { id: true, payload: true } });
const toDelete = all.filter((e) => {
  const s = JSON.stringify(e.payload);
  for (const id of mine) if (s.includes(id)) return true;
  return false;
}).map((e) => e.id);
const we = await db.webhookEvent.deleteMany({ where: { id: { in: toDelete } } });
console.log("DELETED_WEBHOOK_EVENTS", we.count, "of", all.length, "total");
const subs = await db.subscription.deleteMany({ where: { user: { email: { startsWith: "test+launch-audit-" } } } });
console.log("DELETED_SUBSCRIPTIONS", subs.count);
const users = await db.user.deleteMany({ where: { email: { startsWith: "test+launch-audit-" } } });
console.log("DELETED_USERS", users.count);

console.log("POST_CLEANUP_COUNTS", JSON.stringify({ users: await db.user.count(), subs: await db.subscription.count(), webhookEvents: await db.webhookEvent.count() }));
await db.$disconnect();
