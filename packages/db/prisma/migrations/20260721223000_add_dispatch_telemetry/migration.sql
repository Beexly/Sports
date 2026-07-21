-- LlmDispatchRecord telemetry (lib/claude-api/cost-policy.ts). Nullable + additive:
-- existing rows stay valid (null = recorded before this call site was wired to the
-- dispatcher's onDispatch hook), no backfill, no rewrite of immutable history.
-- billingPool duplicates what credit-pool.ts already derives from modelName, but
-- persisting it lets the "blocked" state (a credits-only call that never reached
-- any model) show up in the ledger, which the derived-from-modelName read cannot
-- represent — there is no modelName for a blocked call.
ALTER TABLE "claude_api_call_records" ADD COLUMN IF NOT EXISTS "costMode" TEXT;
ALTER TABLE "claude_api_call_records" ADD COLUMN IF NOT EXISTS "providerRequested" TEXT;
ALTER TABLE "claude_api_call_records" ADD COLUMN IF NOT EXISTS "providerUsed" TEXT;
ALTER TABLE "claude_api_call_records" ADD COLUMN IF NOT EXISTS "billingPool" TEXT;
ALTER TABLE "claude_api_call_records" ADD COLUMN IF NOT EXISTS "fallbackReason" TEXT;

CREATE INDEX IF NOT EXISTS "claude_api_call_records_providerUsed_idx" ON "claude_api_call_records"("providerUsed");
