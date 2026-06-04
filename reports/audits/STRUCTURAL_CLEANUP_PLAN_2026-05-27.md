# STRUCTURAL CLEANUP PLAN (2026-05-27)

Repo: `C:\Users\Garrett\Sports`
Generated from: `reports/audits/STRUCTURAL_CLEAN_ROOM_AUDIT_2026-05-27.md`

## Bucket A — Safe to preserve
- `docs/ops/pr-review-checklist.md`
- `docs/ops/stuck-queue-protocol.md`
- `reports/agent-handoffs/DOCS_PARITY_SYNC_AUDIT_2026-05-27.md`
- `reports/agent-handoffs/PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md`
- `reports/agent-handoffs/_docs_parity_inventory_2026-05-27.csv`
- `reports/agent-handoffs/_docs_parity_zone_counts_2026-05-27.csv`
- `reports/agent-handoffs/_manifest_allowed_copy_plan_2026-05-27.csv`
- `reports/agent-handoffs/_pre_sync_inventory_2026-05-27.csv`
- `docs/ops/evals/README.md` (modified docs content; preserve pending docs-only commit isolation)

## Bucket B — Safe to move into reports
- `INTEGRATION-SURFACES.md` -> `reports/agent-handoffs/INTEGRATION-SURFACES.md`
  - reason: root-level report artifact, non-code markdown, low-risk relocation candidate.
- `BLOCKED_NEED_G.md` / `COORDINATION.md` / `STATE.md` / `dashboard.html`
  - currently missing in this clone; no move action available.

## Bucket C — Safe revert candidates (proposal only; no mutation in this pass)
- None auto-safe at this time.
- Rationale: all non-doc code/config/package changes appear potentially intentional prior work; reverting without owner decision risks data/work loss.

## Bucket D — Owner decision required
- Modified app/route files under `apps/web/app/**` listed in clean-room audit.
- Modified app libraries: `apps/web/lib/correlation/load-settled-picks.ts`, `apps/web/lib/entitlements.ts`.
- Modified package manifests: `package.json`, `package-lock.json`.
- Modified script: `scripts/guardrails/trust-gate.mjs`.
- New script: `scripts/guardrails/brand-lint.mjs`.
- New GitHub files: `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/brand-lint.yml`.
- New package trees/files under:
  - `packages/brand/**`
  - `packages/emails/**`
  - `packages/social-formatters/**`
  - `packages/ui-brand/**`
- Unknown malformed untracked filename:
  - `ersGarrettDownloadscc1-for-primary-clonedocsintelligenceai-search-geo-strategy.md…`

## Execution policy for current pass
- Do not mutate Bucket C or D.
- Proceed with validation diagnosis and produce failure diagnostics + owner decision handoff.