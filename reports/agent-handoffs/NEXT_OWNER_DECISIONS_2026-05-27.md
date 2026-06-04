# NEXT OWNER DECISIONS (2026-05-27)

## Decision 1: Forbidden-zone carry-forward vs revert
Owner must decide per file group:
- Carry forward or revert all modified app/route files under `apps/web/app/**`
- Carry forward or revert modified app libs under `apps/web/lib/**`
- Carry forward or revert package/script/config set:
  - `package.json`
  - `package-lock.json`
  - `scripts/guardrails/trust-gate.mjs`
  - `scripts/guardrails/brand-lint.mjs`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/workflows/brand-lint.yml`
  - `packages/brand/**`
  - `packages/emails/**`
  - `packages/social-formatters/**`
  - `packages/ui-brand/**`

## Decision 2: Unknown malformed untracked path
- Path begins:
  - `ersGarrettDownloadscc1-for-primary-clonedocsintelligenceai-search-geo-strategy.md...`
- Owner should confirm whether to preserve for forensics or remove as stray artifact.

## Decision 3: Validation policy for smoke lane
- `npm run test:smoke` currently missing.
- Choose one:
  1. approve adding `test:smoke` script,
  2. approve checklist update to current scripts,
  3. approve docs-only smoke execution standard via `scripts/smoke-prod.sh` + CI workflow.

## Decision 4: Missing handoff files
- Required files absent:
  - `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`
  - `reports/agent-handoffs/CODEX_CC1_HANDOFF.md`
- Owner should decide whether to regenerate from template/process requirements now.

## Commands used to reach decisions
- `git status --porcelain -uall`
- `git diff --name-status`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run test:smoke`