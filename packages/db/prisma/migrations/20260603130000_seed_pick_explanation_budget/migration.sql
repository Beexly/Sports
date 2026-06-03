-- Seed the monthly Claude API budget for the PICK_EXPLANATION surface
-- ("ask the model why" glass-box explainer). Idempotent upsert, mirroring the
-- Phase 3 seed.
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
    'claude-budget-pick-explanation',
    'PICK_EXPLANATION',
    200.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO UPDATE SET
  "monthlyBudgetUsd" = EXCLUDED."monthlyBudgetUsd",
  "alertThresholds" = EXCLUDED."alertThresholds",
  "updatedAt" = CURRENT_TIMESTAMP;
