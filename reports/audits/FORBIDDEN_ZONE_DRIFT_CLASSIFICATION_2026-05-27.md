# FORBIDDEN ZONE DRIFT CLASSIFICATION (2026-05-27)

## Commands run
- `git status --porcelain -uall`
- `git diff --name-status`
- `git diff --stat`
- `git diff -- apps/web/app apps/web/lib packages .github package.json package-lock.json scripts/guardrails/trust-gate.mjs`

## Drift summary by zone
- app/route modified: 11 files under `apps/web/app/**`
- app lib modified: 2 files under `apps/web/lib/**`
- package manifests modified: `package.json`, `package-lock.json`
- scripts modified/new: `scripts/guardrails/trust-gate.mjs`, `scripts/guardrails/brand-lint.mjs`
- package trees untracked: `packages/brand/**`, `packages/emails/**`, `packages/social-formatters/**`, `packages/ui-brand/**`
- `.github` untracked: PR template + workflow

## Classification
- High-risk owner-decision set:
  - all `apps/web/app/**` modified files listed in `STRUCTURAL_CLEAN_ROOM_AUDIT_2026-05-27.md`
  - `apps/web/lib/correlation/load-settled-picks.ts`
  - `apps/web/lib/entitlements.ts`
  - `package.json`
  - `package-lock.json`
  - `scripts/guardrails/trust-gate.mjs`
  - `scripts/guardrails/brand-lint.mjs`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/workflows/brand-lint.yml`
  - all untracked files under `packages/brand/**`, `packages/emails/**`, `packages/social-formatters/**`, `packages/ui-brand/**`
- Medium-risk unknown:
  - malformed untracked path beginning `ersGarrettDownloadscc1-for-primary-clonedocsintelligenceai-search-geo-strategy.md...`

## Safe/low-risk non-forbidden reports/docs
- `docs/ops/pr-review-checklist.md`
- `docs/ops/stuck-queue-protocol.md`
- `reports/agent-handoffs/*` parity docs/csvs
- moved root report artifact now at `reports/agent-handoffs/INTEGRATION-SURFACES.md`

## Recommended next action
- Block implementation until owner explicitly chooses carry-forward/revert for every high-risk forbidden-zone item.