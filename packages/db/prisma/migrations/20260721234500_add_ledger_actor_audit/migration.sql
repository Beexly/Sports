-- Actor audit trail for the Agent Council ledger write paths (logHandoff,
-- logSubagentRun, reviewSubagentRun) now that those server actions require
-- an authenticated admin session. Nullable + additive: rows written before
-- this column existed (or before auth was enforced) have no value here,
-- not a fabricated one.
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_user_id" TEXT;
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;

ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_user_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_user_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_email" TEXT;
