-- Seed the monthly Claude API budget for the LOSS_AUTOPSY_DRAFT surface
-- (operator-triggered, grounded loss-autopsy drafts — DRAFT only, never
-- auto-published). Idempotent upsert, mirroring the Phase 3 seed.
INSERT INTO "claude_api_budgets" (
  "id",
  "surface",
  "monthlyBudgetUsd",
  "alertThresholds",
  "overrideActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'claude-budget-loss-autopsy-draft',
    'LOSS_AUTOPSY_DRAFT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO UPDATE SET
  "monthlyBudgetUsd" = EXCLUDED."monthlyBudgetUsd",
  "alertThresholds" = EXCLUDED."alertThresholds",
  "updatedAt" = CURRENT_TIMESTAMP;
