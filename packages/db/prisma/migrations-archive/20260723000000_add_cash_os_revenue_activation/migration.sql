-- Cash OS (R1, Commercial Operating Layer) — additive, business
-- instrumentation only. Two new tables, IF NOT EXISTS-guarded, same re-apply
-- doctrine as the migrations before it in this directory (safe to run twice
-- against a database that already has these tables). Unrelated to the
-- SRQC/formal work in the same schema file.

-- CreateTable
CREATE TABLE IF NOT EXISTS "revenue_event" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "userId" TEXT,
    "meta" JSONB,

    CONSTRAINT "revenue_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "revenue_event_at_kind_idx" ON "revenue_event"("at", "kind");

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_activation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "surface" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_activation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_activation_userId_day_surface_key" ON "product_activation"("userId", "day", "surface");
