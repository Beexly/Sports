# TEST_GAP_MAP.md

Revenue-core source files vs. test coverage (billing/Stripe/entitlements/
scraping/claude-api). Sorted by test mentions ascending, line count
descending — biggest untested files first.

> A mention is a weak signal: a test file naming a module is not proof it
> covers it; zero mentions is proof nothing does.

| File | Lines | Mentions | Test files (≤3) |
|---|---:|---:|---|
| apps/web/lib/scraping/extraction-modes.ts | 166 | 0 | — |
| apps/web/lib/claude-api/jynx-complete.ts | 41 | 0 | — |
| apps/web/lib/billing/reconcile-entitlements.ts | 621 | 1 | apps/web/__tests__/reconcile-entitlements.test.ts |
| apps/web/lib/scraping/sports-data-candidates.ts | 547 | 1 | apps/web/__tests__/sports-data-candidates.test.ts |
| apps/web/lib/claude-api/response-cache.ts | 238 | 1 | apps/web/__tests__/response-cache.test.ts |
| apps/web/lib/scraping/data-rules.ts | 208 | 1 | apps/web/__tests__/scraping-clearance.test.ts |
| apps/web/lib/billing/price-ids.ts | 197 | 1 | apps/web/lib/billing/price-ids.test.ts |
| apps/web/lib/claude-api/open-weight-catalog.ts | 182 | 1 | apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/scraping/tool-registry.ts | 162 | 1 | apps/web/__tests__/scraping-clearance.test.ts |
| apps/web/lib/billing/stripe-outcome.ts | 126 | 1 | apps/web/__tests__/stripe-outcome.test.ts |
| apps/web/lib/claude-api/model-economics.ts | 118 | 1 | apps/web/__tests__/model-economics.test.ts |
| apps/web/lib/claude-api/providers/google-oauth.ts | 118 | 1 | apps/web/lib/claude-api/providers/google-oauth.test.ts |
| apps/web/lib/claude-api/usage-store.ts | 118 | 1 | apps/web/__tests__/claude-api-usage-store.test.ts |
| apps/web/lib/claude-api/jynx-examples.ts | 116 | 1 | apps/web/lib/claude-api/jynx-examples.test.ts |
| apps/web/lib/claude-api/internal-llm.ts | 113 | 1 | apps/web/__tests__/internal-llm.test.ts |
| apps/web/lib/claude-api/provider-dispatch.ts | 98 | 1 | apps/web/lib/claude-api/provider-dispatch.test.ts |
| apps/web/lib/billing/checkout-repair-owner-queue.ts | 84 | 1 | apps/web/__tests__/checkout-repair-owner-queue.test.ts |
| apps/web/lib/claude-api/budget-store.ts | 75 | 1 | apps/web/__tests__/claude-api-budget-store.test.ts |
| apps/web/lib/claude-api/jynx-errors.ts | 75 | 1 | apps/web/lib/claude-api/jynx-errors.test.ts |
| apps/web/lib/claude-api/credit-pool-store.ts | 71 | 1 | apps/web/lib/claude-api/credit-pool-store.test.ts |
| apps/web/lib/claude-api/numeric-guard.ts | 67 | 1 | apps/web/__tests__/numeric-guard.test.ts |
| apps/web/lib/claude-api/free-lane-policy.ts | 26 | 1 | apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/claude-api/openai-compat.ts | 123 | 2 | apps/web/lib/claude-api/jynx-errors.test.ts; apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/billing/canonical-json.ts | 86 | 2 | apps/web/__tests__/canonical-json.test.ts; packages/genesis-kernel/src/__tests__/planner.test.ts |
| apps/web/lib/billing/checkout-attempt-repair.ts | 388 | 3 | apps/web/__tests__/checkout-attempt-repair.test.ts; apps/web/__tests__/checkout-repair-owner-queue.test.ts; apps/web/__tests__/repair-checkout-attempts-cron-route.test.ts |
| apps/web/lib/claude-api/providers/azure-foundry.ts | 213 | 3 | apps/web/lib/claude-api/credit-pool.test.ts; apps/web/lib/claude-api/provider-dispatch.test.ts; apps/web/lib/claude-api/providers/azure-foundry.test.ts |
| apps/web/lib/claude-api/credit-pool.ts | 142 | 3 | apps/web/lib/claude-api/credit-pool-store.test.ts; apps/web/lib/claude-api/credit-pool.test.ts; apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/scraping/source-rights-registry.ts | 860 | 4 | apps/web/__tests__/affiliate-structural-separation-guard.test.ts; apps/web/__tests__/scraping-clearance.test.ts; packages/genesis-kernel/src/__tests__/twin.test.ts |
| apps/web/lib/claude-api/model-router.ts | 94 | 4 | apps/web/__tests__/ai-provider-registry.test.ts; apps/web/__tests__/cockpit-api-costs-routing.test.tsx; apps/web/__tests__/model-router.test.ts |
| apps/web/lib/scraping/clearance-engine.ts | 434 | 6 | apps/web/__tests__/ingest-pfr-adv-stats.test.ts; apps/web/__tests__/ingest-player-stats.test.ts; apps/web/__tests__/pressure-coverage.test.ts |
| apps/web/lib/claude-api/jynx.ts | 218 | 6 | apps/web/__tests__/credit-stack-posture.test.ts; apps/web/__tests__/founder-next-steps.test.ts; apps/web/__tests__/ops-public-surface-truth-rate-limit.test.ts |
| apps/web/lib/claude-api/cost-monitor.ts | 185 | 7 | apps/web/__tests__/calibration-insight-claude.test.ts; apps/web/__tests__/claude-api-budget-migration.test.ts; apps/web/__tests__/claude-api-cost-monitor.test.ts |
| apps/web/lib/billing/checkout-attempt.ts | 622 | 8 | apps/web/__tests__/checkout-attempt-db.integration.test.ts; apps/web/__tests__/checkout-attempt-repair.test.ts; apps/web/__tests__/checkout-attempt.test.ts |
| apps/web/lib/billing/notice.ts | 59 | 10 | apps/web/__tests__/aws-case-study-page.test.ts; apps/web/__tests__/billing-notice.test.ts; apps/web/__tests__/board-gate-flag-policy.test.ts |
| apps/web/lib/claude-api/messages.ts | 115 | 12 | apps/web/__tests__/claude-api-cerebras.test.ts; apps/web/__tests__/claude-api-free-lane.test.ts; apps/web/__tests__/claude-api-messages.test.ts |
| apps/web/lib/claude-api/free-lane.ts | 100 | 12 | apps/web/__tests__/ai-provider-registry.test.ts; apps/web/__tests__/claude-api-free-lane.test.ts; apps/web/__tests__/cockpit-api-costs-routing.test.tsx |
| apps/web/lib/claude-api/providers/cerebras.ts | 138 | 14 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts |
| apps/web/lib/claude-api/providers/bedrock.ts | 213 | 15 | apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts; apps/web/__tests__/ai-control-plane-credit-admission.test.ts |
| apps/web/lib/claude-api/providers/vertex.ts | 206 | 15 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts |
| apps/web/lib/api-entitlement.ts | 185 | 23 | apps/web/__tests__/api-entitlement.test.ts; apps/web/__tests__/birthday-usage-trend.test.ts; apps/web/__tests__/combine.test.ts |
| apps/web/lib/entitlements.ts | 112 | 26 | apps/web/__tests__/api-entitlement.test.ts; apps/web/__tests__/api-p9-05-rate-limit.test.ts; apps/web/__tests__/audit-drawer-shape.test.ts |
| apps/web/lib/stripe.ts | 456 | 31 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/analytics-instrumentation.test.tsx; apps/web/__tests__/billing-money-posture.test.ts |
| apps/web/lib/claude-api/dashboard.ts | 120 | 47 | apps/web/__tests__/api-v1-shadow-route-harness.test.ts; apps/web/__tests__/api-v1-shadow-route-replay.test.ts; apps/web/__tests__/billing-notice.test.ts |
| apps/web/lib/scraping/index.ts | 12 | 138 | apps/web/__tests__/affiliate-structural-separation-guard.test.ts; apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-claim-pg.test.ts |

## Ten highest-priority gaps

1. `apps/web/lib/scraping/extraction-modes.ts` — 166 lines, 0 tests
2. `apps/web/lib/claude-api/jynx-complete.ts` — 41 lines, 0 tests
3. `apps/web/lib/billing/reconcile-entitlements.ts` — 621 lines, 1 test
4. `apps/web/lib/scraping/sports-data-candidates.ts` — 547 lines, 1 test
5. `apps/web/lib/claude-api/response-cache.ts` — 238 lines, 1 test
6. `apps/web/lib/scraping/data-rules.ts` — 208 lines, 1 test
7. `apps/web/lib/billing/price-ids.ts` — 197 lines, 1 test
8. `apps/web/lib/claude-api/open-weight-catalog.ts` — 182 lines, 1 test
9. `apps/web/lib/scraping/tool-registry.ts` — 162 lines, 1 test
10. `apps/web/lib/billing/stripe-outcome.ts` — 126 lines, 1 test
