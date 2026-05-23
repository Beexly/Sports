-- Phase 3: seed initial per-surface Claude API monthly budgets.
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
    'claude-budget-blog-generation',
    'BLOG_GENERATION',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-studio-generation',
    'STUDIO_GENERATION',
    500.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-model-journal-draft',
    'MODEL_JOURNAL_DRAFT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-model-court-answer',
    'MODEL_COURT_ANSWER',
    2000.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-calibration-weekly-insight',
    'CALIBRATION_WEEKLY_INSIGHT',
    50.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-pre-mortem-summary',
    'PRE_MORTEM_SUMMARY',
    0.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'claude-budget-other',
    'OTHER',
    100.00,
    '{"yellow":0.5,"orange":0.8,"red":1,"hardCap":1.5}'::jsonb,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("surface") DO UPDATE SET
  "monthlyBudgetUsd" = EXCLUDED."monthlyBudgetUsd",
  "alertThresholds" = EXCLUDED."alertThresholds",
  "updatedAt" = CURRENT_TIMESTAMP;
