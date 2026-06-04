# STRUCTURAL CLEAN ROOM AUDIT (2026-05-27)

Repo: `C:\Users\Garrett\Sports`
Date run: 2026-05-28
Branch: `main`
Latest commit: `728f9c8 docs: parity sync Wave 1-3 docs from AI Sports workspace`

## Baseline command capture
- `pwd` => `C:\Users\Garrett\Sports`
- `git branch --show-current` => `main`
- `git status --short` => dirty (17 modified, multiple untracked)
- `git diff --name-status` => modified files in app/lib/docs/package/scripts
- `git diff --stat` => 17 files changed, 129 insertions, 42 deletions
- `git log -1 --oneline` => `728f9c8 docs: parity sync Wave 1-3 docs from AI Sports workspace`

## Protected file check (pre-work)
- `docs/ops/decision-log.md`
- SHA-256: `C05A8E65745BF4E05C172F6CA09F3A02D1991DE8C21CE86CB1051A9E54A3929E`
- Size: `46062` bytes

## Required targeted inspection notes
- `.gitattributes`: missing
- `docs/ops/issue-queue.md`: present, no local diff
- `scripts/smoke-prod.ps1`: missing
- `scripts/smoke-prod.sh`: present, no local diff
- `scripts/guardrails/trust-gate.mjs`: modified (whitelist expanded)
- `package.json`: modified (brand lint scripts + `overrides.qs`)
- `package-lock.json`: modified (workspace links + qs version bump + new package manifests)
- `BLOCKED_NEED_G.md`: missing
- `COORDINATION.md`: missing
- `STATE.md`: missing
- `dashboard.html`: missing
- `findings/`: missing
- `metrics/`: missing
- `apps/web/app` dirty paths: 11 modified pages/routes
- `apps/web/lib` dirty paths: 2 modified libs
- `packages/` dirty paths: 4 new package trees (brand/emails/social-formatters/ui-brand)
- `.github` dirty paths: 2 new files

## Dirty/untracked path classification

| path | git status | zone | likely source | risk | recommended action |
|---|---|---|---|---|---|
| `apps/web/app/admin/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/board/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/cockpit/agents/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/cockpit/media/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/cockpit/review/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/cockpit/tasks/page.tsx` | M | app | intentional prior work | high | owner decision required |
| `apps/web/app/journal/[slug]/page.tsx` | M | route | intentional prior work | high | owner decision required |
| `apps/web/app/journal/page.tsx` | M | route | intentional prior work | high | owner decision required |
| `apps/web/app/journal/rss.xml/route.ts` | M | route | intentional prior work | high | owner decision required |
| `apps/web/app/page.tsx` | M | route | intentional prior work | high | owner decision required |
| `apps/web/app/sitemap.ts` | M | route | intentional prior work | high | owner decision required |
| `apps/web/lib/correlation/load-settled-picks.ts` | M | app | intentional prior work | high | owner decision required |
| `apps/web/lib/entitlements.ts` | M | app | intentional prior work | high | owner decision required |
| `docs/ops/evals/README.md` | M | docs/report | docs sync | low | keep |
| `package-lock.json` | M | package | intentional prior work | high | owner decision required |
| `package.json` | M | package | intentional prior work | high | owner decision required |
| `scripts/guardrails/trust-gate.mjs` | M | script | intentional prior work | high | owner decision required |
| `.github/PULL_REQUEST_TEMPLATE.md` | ?? | config | intentional prior work | medium | owner decision required |
| `.github/workflows/brand-lint.yml` | ?? | config | intentional prior work | medium | owner decision required |
| `INTEGRATION-SURFACES.md` | ?? | docs/report | agent artifact | low | move to reports |
| `docs/ops/pr-review-checklist.md` | ?? | docs/report | docs sync | low | keep |
| `docs/ops/stuck-queue-protocol.md` | ?? | docs/report | docs sync | low | keep |
| `ersGarrettDownloadscc1-for-primary-clonedocsintelligenceai-search-geo-strategy.md…` | ?? | unknown | agent artifact | medium | owner decision required |
| `packages/brand/package.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/__tests__/brand.test.ts` | ?? | test | intentional prior work | high | owner decision required |
| `packages/brand/src/grades.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/identity.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/index.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/microcopy.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/tokens.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/src/voice.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/brand/tsconfig.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/emails/package.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/emails/src/__tests__/emails.test.ts` | ?? | test | intentional prior work | high | owner decision required |
| `packages/emails/src/index.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/emails/tsconfig.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/social-formatters/package.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/social-formatters/src/__tests__/formatters.test.ts` | ?? | test | intentional prior work | high | owner decision required |
| `packages/social-formatters/src/index.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/social-formatters/tsconfig.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/ui-brand/package.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/ui-brand/src/__tests__/components.test.tsx` | ?? | test | intentional prior work | high | owner decision required |
| `packages/ui-brand/src/components.tsx` | ?? | package | intentional prior work | high | owner decision required |
| `packages/ui-brand/src/index.ts` | ?? | package | intentional prior work | high | owner decision required |
| `packages/ui-brand/tsconfig.json` | ?? | package | intentional prior work | high | owner decision required |
| `packages/ui-brand/vitest.config.ts` | ?? | test | intentional prior work | high | owner decision required |
| `packages/ui-brand/vitest.setup.ts` | ?? | test | intentional prior work | high | owner decision required |
| `reports/agent-handoffs/DOCS_PARITY_SYNC_AUDIT_2026-05-27.md` | ?? | docs/report | docs sync | low | keep |
| `reports/agent-handoffs/PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md` | ?? | docs/report | docs sync | low | keep |
| `reports/agent-handoffs/_docs_parity_inventory_2026-05-27.csv` | ?? | docs/report | docs sync | low | keep |
| `reports/agent-handoffs/_docs_parity_zone_counts_2026-05-27.csv` | ?? | docs/report | docs sync | low | keep |
| `reports/agent-handoffs/_manifest_allowed_copy_plan_2026-05-27.csv` | ?? | docs/report | docs sync | low | keep |
| `reports/agent-handoffs/_pre_sync_inventory_2026-05-27.csv` | ?? | docs/report | docs sync | low | keep |
| `scripts/guardrails/brand-lint.mjs` | ?? | script | intentional prior work | high | owner decision required |

## Handoff file investigation (required two files)

| file | exists in scratch | exists in primary | hash/size match | current relevance | recommended action |
|---|---|---|---|---|---|
| `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` | no | no | n/a | referenced by process but absent | regenerate |
| `reports/agent-handoffs/CODEX_CC1_HANDOFF.md` | no | no | n/a | referenced by process but absent | regenerate |

## Structural assessment
- Docs parity handoff set exists and appears coherent (no copy conflicts observed in this run).
- Forbidden-zone drift is real and concentrated in `apps/`, `packages/`, `.github/`, scripts, and package manifests.
- Implementation should remain blocked until these are either cleaned or explicitly owner-approved.