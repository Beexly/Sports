-- Operator comp fields on users: a manually-granted access tier that
-- overrides billing and is never touched by the Stripe webhook.
ALTER TABLE "users"
  ADD COLUMN "compedTier"   "SubscriptionTier",
  ADD COLUMN "compedReason" TEXT,
  ADD COLUMN "compedBy"     TEXT,
  ADD COLUMN "compedAt"     TIMESTAMP(3);

-- Append-only audit trail for Mission Control operator actions.
CREATE TABLE "operator_audit_logs" (
  "id"         TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "action"     VARCHAR(80) NOT NULL,
  "targetType" VARCHAR(40) NOT NULL,
  "targetId"   TEXT NOT NULL,
  "summary"    VARCHAR(280) NOT NULL,
  "detail"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operator_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operator_audit_logs_createdAt_idx" ON "operator_audit_logs"("createdAt");
CREATE INDEX "operator_audit_logs_targetType_targetId_idx" ON "operator_audit_logs"("targetType", "targetId");
