-- Trusted Actor Model (Phase 1A) — additive actor audit columns.
--
-- Every column is nullable and defaulted-absent: rows written before the
-- trusted-actor boundary existed keep their existing values, and no identity
-- is fabricated for them. CI applies the schema with `prisma db push`; this
-- file mirrors that additive change for environments that run migrations.
-- IF NOT EXISTS keeps the statements idempotent against a db:push'd database.

-- Agent Council ledgers -------------------------------------------------------
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_subject_id" TEXT;
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_type" TEXT;
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "policy_version" TEXT;

ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_subject_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_type" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_subject_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_type" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_email" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "policy_version" TEXT;

-- Community moderation --------------------------------------------------------
ALTER TABLE "moderation_reports" ADD COLUMN IF NOT EXISTS "reporterActorType" TEXT;

ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "actorType" TEXT;
ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "actorEmail" TEXT;
ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;

ALTER TABLE "moderation_appeals" ADD COLUMN IF NOT EXISTS "reviewerType" TEXT;
ALTER TABLE "moderation_appeals" ADD COLUMN IF NOT EXISTS "reviewerEmail" TEXT;
ALTER TABLE "moderation_appeals" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
