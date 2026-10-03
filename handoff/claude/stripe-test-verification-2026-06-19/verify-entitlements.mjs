// Mirror apps/web/lib/entitlements.ts getUserEntitlements() query + the
// packages/types getEntitlements() mapping, against the prod DB, for the test users.
import { getDb } from "./_db.mjs";
const db = getDb();

const PAST_DUE_GRACE_DAYS = 7;
const graceCutoff = new Date(Date.now() - PAST_DUE_GRACE_DAYS * 864e5);

function getEntitlements(tier) {
  const isPro = tier === "PRO" || tier === "ELITE";
  return { tier, canSeePremiumPicks: isPro, canSeeConfidence: isPro, canSeeLineMovement: isPro, dailyPickLimit: tier === "FREE" ? 2 : null, canGetAlerts: tier === "ELITE" };
}

const users = await db.user.findMany({ where: { email: { startsWith: "test+launch-audit-" } }, select: { id: true, email: true } });
for (const u of users) {
  const sub = await db.subscription.findFirst({
    where: { userId: u.id, OR: [{ status: { in: ["ACTIVE", "TRIALING"] } }, { status: "PAST_DUE", pastDueSince: { gte: graceCutoff } }] },
    select: { tier: true, status: true, stripePriceId: true },
  });
  const tier = sub?.tier ?? "FREE";
  console.log(JSON.stringify({ email: u.email, price: sub?.stripePriceId, db_tier: sub?.tier, resolved: getEntitlements(tier) }));
}
await db.$disconnect();
