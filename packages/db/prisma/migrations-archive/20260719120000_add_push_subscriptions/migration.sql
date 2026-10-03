-- Push subscriptions — the free, no-vendor Web Push channel half of the
-- Elite "real-time email & push alerts" feature (see
-- apps/web/lib/watchlist/channels/web-push-channel.ts). New model
-- PushSubscription (schema.prisma → @@map("push_subscriptions")).
--
-- Purely additive: a brand-new, empty table plus its unique key and index.
-- Written IF NOT EXISTS end to end (table, FK inline in the CREATE TABLE,
-- unique index, index) so it is byte-safe to apply anytime, including
-- re-applying against a DB where it already landed — same hardening
-- doctrine as 20260717120000_add_watchlist and
-- 20260716120000_add_odds_line_snapshots. Zero destructive statements.
--
-- `endpoint` is the push service's per-device subscription URL — globally
-- unique by construction (it IS the delivery address) — so it is both the
-- natural dedupe key and the column the app upserts/deletes by. `p256dh`/
-- `auth` are the two keys the browser's PushSubscription.toJSON() returns;
-- both are required to encrypt a payload for that endpoint (RFC 8291) and
-- are stored as opaque TEXT, never parsed/interpreted server-side.
--
-- The founder applies this; it is never run automatically from this repo.
-- Application code fails gracefully (503, not 500) when this table is
-- absent — see apps/web/lib/push/subscription-db.ts (mirrors
-- apps/web/lib/watchlist/db.ts's table-absent doctrine).

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
