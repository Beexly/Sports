# Plan — Cycle 12 · feat(ci): nightly content workflow that opens a PR for operator review

## Goal
Item 4 of the queue. A scheduled GitHub Action that drafts today's content + runs the semantic reviewer + opens a PR with the result. The PR explicitly does NOT auto-merge — operator approves to publish. Master prompt §6 Hard Rule (no auto-publish) is the load-bearing invariant.

## Files to touch
1. `.github/workflows/nightly-content.yml` — NEW; cron + dispatch + draft + review + create-pr
2. `scripts/draft-nightly-content.mjs` — NEW; runner that uses @anthropic-ai/sdk to draft + review, writes `_drafts/<YYYY-MM-DD>-nightly.md` and `.review.json`
3. `.gitignore` — leave `_drafts/` tracked (the workflow's PR commits into it)
4. `apps/web/__tests__/nightly-content-workflow.test.ts` — NEW; source-level invariants
5. `_logs/CHANGELOG.md` — append entry

## Design

### Workflow shape
- Trigger: `schedule: cron: "0 8 * * *"` (08:00 UTC ≈ pre-dawn US) + `workflow_dispatch` for manual runs
- Concurrency: `nightly-content` group, no-cancel
- Permissions: `contents: write`, `pull-requests: write` (the PR job needs both)
- Steps: checkout → setup-node@20 → npm ci → run draft script → `peter-evans/create-pull-request@v7`
- Branch name: `nightly-content/<run_id>` (so each run gets its own branch)
- Labels: `content`, `draft-only`, `needs-operator-review`
- PR body: explicit "Auto-generated draft. Operator action required. This PR does NOT auto-merge."
- NO `automerge` flag, NO `--auto` flag, NO direct push to `main`

### Runner script
- `scripts/draft-nightly-content.mjs` — self-contained, ESM
- Uses the dynamically-imported @anthropic-ai/sdk (same pattern as the other operator scripts)
- Today's fixture picks (TODO comment for the real DB-backed swap when DATABASE_URL is available in CI)
- Two SDK calls: draft (Sonnet 4.6, json_schema) + review (Haiku 4.5, json_schema)
- Writes `_drafts/<date>-nightly.md` (markdown — title + tags front-matter + content) and `_drafts/<date>-nightly.review.json` (verdict + findings)
- Honors `--dry-run` for local testing (skips write)

### Why inline prompts (not import the TS module)
The TS modules use `@/lib/...` path aliases that don't resolve from a root-level node script without tsx + a tsconfig-paths step. For Cycle 12 MVP, the script duplicates the prompt template; the runtime path (apps/web) is unaffected. A future cycle can consolidate when the workflow needs DB access anyway.

### Hard Rule coverage
- No auto-publish: PR is DRAFT-only, no merge flag.
- No auto-bet: review verdict only — script does nothing with it beyond writing it.
- No engine side effects: script is pure read-from-env / write-to-_drafts/.
- Guardrails: `trust-gate.mjs` scans `_drafts/` — review verdict gating is the safety net.

## Test plan
- Source-level workflow test:
  - `name:`, `on.schedule.cron`, `on.workflow_dispatch` present
  - Uses `actions/checkout@v4` + `actions/setup-node@v4` + `peter-evans/create-pull-request@v7`
  - Uses `secrets.ANTHROPIC_API_KEY`
  - Does NOT contain `auto-merge`, `--auto`, `gh pr merge`, or any direct push to `main`
  - Concurrency group set
- Source-level runner test:
  - Imports from `@anthropic-ai/sdk`
  - References both Sonnet (draft model) and Haiku (review model) constants
  - Writes to `_drafts/` directory
  - Honors `--dry-run`
- Full sweep + guardrails

## Rollback
Single commit. Revert removes both files; nothing else changes. The cron stops firing immediately.

## Commit message
`feat(ci): nightly content workflow drafts + reviews + opens an operator PR`
