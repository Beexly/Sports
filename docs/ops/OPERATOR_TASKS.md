# Operator-only tasks (cannot be done from inside an agent session)

Source: Claude Code setup audits v6.0 / v7.0 (2026-09-02) and the remediation
that followed. Each item below needs a human with console access. Tick the box
and add the date when done; the next audit reads this file.

Each task carries a stable short id (bold, e.g. `NEON-RO`) so the health-check
script (`scripts/check-operator-tasks.mjs`, `npm run ops:tasks`) can reference
it. Do not rename an id once assigned — the script and prior audit notes key
off it.

## Status table

| Id | Task | Owner action | Verifiable from repo? | Status |
|---|---|---|---|---|
| NEON-RO | Switch the Neon connector to read-only | claude.ai → Settings → Connectors → Neon | No — account/connector-level | Open |
| CONN-PRUNE | Prune workspace connectors to `github`, `Neon` (read-only), `Vercel` | claude.ai → Settings → Connectors | No — account-level (proxy: `.mcp.json` has no DB server; `.claude/settings.json` denies `mcp__Neon__delete_project`) | Open |
| BASELINE-MIG | Baseline migration landed; CI replay blocking; confirm production | Baseline in PR #684; CI replay + drift check made blocking on `claude/final-launch` (2026-09-02); owner: confirm `npm run db:migrate:status` after the first production deploy | Partly (`npx prisma migrate deploy` on an empty DB is green; CI enforces it) | 1 owner step open (production confirm) |
| ACTIONS-BILLING | GitHub Actions billing / minutes | GitHub org → Settings → Billing | Partly — CI, daily-smoke and external-cron runs observed completing on 2026-09-02 (PR #684 check runs; daily-smoke #103–#105 green) | Resolved 2026-09-02 (minutes restored; keep an eye on the monthly cap) |
| PUSH-PROTECT | Enable push protection and secret scanning | GitHub repo → Settings → Code security | No — GitHub repo-settings-level | Open |
| BRANCH-PROTECT | Confirm branch protection on `main` | GitHub repo → Settings → Branches | No — GitHub repo-settings-level | Open |
| SANDBOX-NET | Sandbox is enabled with a 20-domain allowlist; make it fail closed | On a machine with bubblewrap (Linux) or seatbelt (macOS): run one agent session and confirm `sandbox` reports active; then set `sandbox.failIfUnavailable: true` in `.claude/settings.json` (owner-only). Until then a machine without a sandbox runtime runs unsandboxed, which is why `npm run ops:tasks` reports this row UNVERIFIED (2026-09-02) | Partly (`npm run ops:tasks` verifies enabled + allowlist + failIfUnavailable) | Open — enabled in PR #684; fail-closed flip pending the owner's verification run |
| NEXT-MAJOR | Plan the Next.js 14 → 15/16 major upgrade | Separate migration project; the two `dependency-audit` waivers (`next`, bundled `postcss`) are reviewed by 2027-01-15 | Partly (`node scripts/guardrails/dependency-audit.mjs` shows the waivers) | Open |
| HENRYGD-REG | Register (or reject) the henrygd NCAA API in the source-rights registry | Owner/legal read, then a row in `apps/web/lib/scraping/source-rights-registry.ts` | Partly (`checkClearance` denies it today; NCAA settlement runs single-source) | Open |
| PRE-COMMIT-BRAND | Run the brand trust gate in the pre-commit hook, not only in CI | Replace `.githooks/pre-commit` with the text in "Pre-commit brand gate" below (`.githooks/**` is agent-denied; the bash guard refused the write on 2026-09-02, as designed) | No — hook files are owner-only | Open (hook text ready, 2026-09-02) |
| STALE-PICKS | Adjudicate the 20 stale published PENDING picks on unstarted NFL/NCAAF games before Week 1 (leave / unpublish / void) | `npm run ops:stale-picks` lists them read-only; the decision is applied in the database by the owner, never by a cron | Partly (the script lists; the truth surface counts `stalePendingPicks`) | Open (2026-09-05) |
| MCP-VERCEL-KEY | Rename the `vercel` server key in `.mcp.json` to `Vercel` | MCP tool names are case-sensitive: the lowercase key yields `mcp__vercel__*` tools, which the `mcp__Vercel__pause_project` / `mcp__Vercel__unpause_project` confirmation rules in `.claude/settings.json` do not match, so a mutating Vercel call through the repo server would skip confirmation. Change the key to `"Vercel"` (nothing else references it), then confirm `/mcp` lists the server as `Vercel`. The agent permission surface denies writes to `.mcp.json` (refused 2026-09-03, as designed) | No — `.mcp.json` is owner-only for agents | Open (2026-09-03, cubic review) |

## Stale published picks (adjudicate before NFL Week 1)

- [ ] **STALE-PICKS** — 20 published PENDING picks (2026-09-05, `stalePendingPicks`
  on the truth surface) sit on NFL/NCAAF games that have not started and were
  last refreshed in May or June (model v5.0.0 and v5.2.6). Nothing supersedes or
  voids them automatically (`apps/web/lib/board/stale-pick-policy.ts`: the record
  is the product, so that is an owner decision), but every settlement lane WILL
  grade them at kickoff on their months-old lock line and count them toward the
  canonical sample and the calibration surface. List them, read-only:

  ```sh
  npm run ops:stale-picks          # table; add -- --json for machine-readable
  ```

  Decide per row, then act through the database with the row's `pickId`:
  leave (it grades at kickoff on the stale line, honestly labelled by its
  modelVersion), unpublish (`isPublished = false`; it leaves the public record
  and the sample), or void (`result = 'VOID'` plus a `pick_settlement_events`
  row with `result = 'VOID'` so the outbox and receipts stay consistent). Never
  delete a row. Whatever is decided, record the decision and the count here.
  Verify: `curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq .stalePendingPicks`
  reads `count: 0` (or the number deliberately left).

## Database and MCP connectors

- [ ] **NEON-RO** — Switch the Neon connector to read-only (or point it at a
  non-production branch). Today the claude.ai Neon connector attaches in write
  mode with `delete_project`, `delete_branch`, `delete_postgres_database`,
  `run_sql`, and `reset_from_parent` exposed. `.claude/settings.json` now denies
  the destructive tools and asks on `run_sql*`, but that is belt-and-braces: the
  connector itself should not carry write scope for a coding session. Where:
  claude.ai → Settings → Connectors → Neon.
- [ ] **CONN-PRUNE** — Prune connectors for this workspace to `github`, `Neon`
  (read-only), and `Vercel`. Gmail, Google Drive, Notion, Figma, Era Context,
  QuickNode, Isometric, and Profound are unrelated to this codebase, cost
  roughly 95k tokens of tool schemas per session
  (docs/ops/EFFICIENCY_AUDIT_2026-08-13.md), and expose `send_message` /
  `trash_*` / `share_file`. Project-scoped servers are declared in `.mcp.json`
  (github, context7 for docs, vercel).

## Baseline migration (history squashed 2026-09-02)

- [ ] **BASELINE-MIG** — **Landed in PR #684.** The 53-file history (which
  started at `20260522141600_add_loss_autopsy` on top of a `db push`-built
  schema and so could not replay from empty) was squashed into
  `packages/db/prisma/migrations/20260101000000_baseline/migration.sql`.
  The baseline is idempotent: every CREATE is `IF NOT EXISTS`, every enum and
  foreign key is wrapped in a duplicate-object guard, the 35 hand-written CHECK
  constraints are guarded by `pg_constraint`, and the 3 `claude_api_budgets`
  seed rows are upserts. Verified on a disposable Postgres 16 on 2026-09-02:
  `migrate deploy` from empty → drift check 0 → re-deploy 0; and on a
  production-like database (schema present, the 53 names recorded in
  `_prisma_migrations`) → deploy 0, drift 0, `migrate status` "Database
  schema is up to date!". The old files moved unchanged to
  `packages/db/prisma/migrations-archive/` because tests and
  `scripts/integration/settlement-outbox-acceptance.mjs` read their SQL.
  One owner step remains, which is why the box is unticked:
  1. **Confirm production after the first deploy that carries the baseline.**
     `scripts/deploy/migrate-if-configured.mjs` runs `migrate deploy`, which
     applies the baseline once (nothing is re-created — see above) and records
     it; `migrate deploy` ignores the 53 applied names that are no longer in
     the folder. Then run `npm run db:migrate:status` against production and
     tick this box when it prints "Database schema is up to date!". No
     `migrate resolve` is needed. If the baseline fails in the build gate, the
     build fails closed and the error names the statement; do not edit the
     baseline — fix the data or add a forward migration.
  2. ~~Make the CI replay blocking~~ — **done 2026-09-02** on
     `claude/final-launch` under the owner authority granted for that session:
     `.github/workflows/ci.yml` now runs `prisma migrate deploy` (blocking) and
     `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel … --exit-code`;
     the `db push` step is gone. A schema change without a migration fails CI.

## Pre-commit brand gate

- [ ] **PRE-COMMIT-BRAND** — Today `.githooks/pre-commit` runs only the staged-file
  secret scan, so a banned phrase (rule 8) is first caught by CI five minutes after
  the commit. `node scripts/guardrails/trust-gate.mjs` scans the public-copy
  directories in about five seconds and is the same check CI runs. The agent bash
  guard refuses writes into `.githooks/` (that refusal is the guard working), so the
  owner replaces the hook by hand with:

  ```sh
  #!/usr/bin/env sh
  # Pre-commit guardrails: secret scan (staged files) + brand trust gate.
  node scripts/guardrails/secret-scan.mjs
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "pre-commit: secret-scan blocked this commit (see above)." 1>&2
    exit "$status"
  fi
  node scripts/guardrails/trust-gate.mjs
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "pre-commit: trust-gate blocked this commit (banned phrase on a public surface; see above)." 1>&2
    exit "$status"
  fi
  exit 0
  ```

  Keep the file mode `100755`. Verify: stage a file containing a banned phrase from
  `docs/positioning.md` and confirm `git commit` aborts; then unstage it.

## Data rights

- [ ] **HENRYGD-REG** — Decide the rights posture of the henrygd NCAA API
  (`https://github.com/henrygd/ncaa-api`, NCAA.com-derived facts). It is listed
  as OWNER-APPROVED free-first primary for NCAA facts in
  `apps/web/lib/scraping/sports-data-candidates.ts` but has **no row** in
  `apps/web/lib/scraping/source-rights-registry.ts`, so `checkClearance()`
  denies it. Until 2026-09-02 the free settlement runner fetched it anyway
  (bypassing the gate); it now fails closed like `free-score-persist.ts`
  (GSE-SEC-050), which makes NCAA football settlement single-source (ESPN)
  and never CONFIRMED by consensus. To restore the second source, add a
  registry row (status `approved_public_logged_off`, facts only,
  `storage_allowed: false`, attribution to NCAA.com via henrygd, self-host
  before relying on it) after the terms read in
  `docs/legal/VENDOR_QUESTIONNAIRE_CFBD.md`'s checklist style. Note:
  `storage_allowed: false` blocks the `storage` and `derived_analytics`
  intents in `checkClearance()` (`apps/web/lib/scraping/clearance-engine.ts`),
  so a row added with that flag restores henrygd only as a live consensus
  check, not for settlement — settlement persists finals (the `storage` and
  `derived_analytics` intents, via intents storage + `derived_analytics`).
  Using henrygd for settlement storage requires legal approval of storage
  rights first; only after that approval may the row be updated to
  `storage_allowed: true`. Never widen a registry row to make a test pass.

## GitHub

- [x] **ACTIONS-BILLING** — GitHub Actions minutes are back: on 2026-09-02
  the full `ci.yml` matrix ran on every push to PR #684 (12 jobs green on the
  final head), `daily-smoke.yml` completed #103–#105 on consecutive days and
  `external-cron.yml` fires dozens of times a day. The `.githooks/pre-push`
  comment that called itself "the LAST automated gate" dated from the
  2026-08-16 billing block and has been corrected. Re-open this item if a
  workflow run shows "billing" or "spending limit" in its failure reason.
- [ ] **PUSH-PROTECT** — Enable push protection and secret scanning on the
  repository (Settings → Code security). This is the one layer that works
  even when a contributor bypasses local hooks.
- [ ] **BRANCH-PROTECT** — Confirm branch protection on `main` requires the
  `guardrails`, `trust-gate`, `secret-scan`, and `test` checks.

## Claude Code sandbox (network isolation)

- [ ] **SANDBOX-NET** — Enable OS-level sandboxing for agent sessions with an
  explicit network allowlist. `.claude/settings.json` currently ships with
  `sandbox.enabled: false`, so Bash commands run without OS-level filesystem
  and network isolation and rely solely on the permission rules and the
  PreToolUse guard (`scripts/guardrails/agent-bash-guard.mjs`) to keep an
  agent off destructive or off-policy network calls. Turning sandboxing on
  (`sandbox.enabled: true`) with a non-empty `sandbox.network.allowedDomains`
  list (the domains agent sessions legitimately need — e.g. the npm registry,
  GitHub, Vercel, The Odds API, Anthropic API — and nothing else) adds a
  second, kernel-level backstop against exfiltration or unapproved outbound
  calls, independent of policy-file correctness. `.claude/settings.json` is
  frozen for agents (see "Repo policy files" below), so this is an owner edit.

## Dependencies

- [ ] **NEXT-MAJOR** — Plan and land the Next.js major upgrade (14.2.x → 15.5 or
  16.3). `npm audit` reports two HIGH advisories (`next`, and the `postcss` copy
  bundled inside `next/node_modules`) whose only fix is `next@16.3.x`, a
  semver-major jump that touches the App Router, React 19, and the build. They
  are documented waivers in `scripts/guardrails/dependency-audit.mjs` with
  `reviewBy: 2027-01-15`; `dependency-audit` fails once that date passes without
  either the upgrade or a renewed, justified waiver. Not an agent change: it is a
  framework migration with its own test pass.

## Repo policy files (AGENTS.md law 2)

The following are frozen for agents and now also denied for Edit/Write inside
Claude Code sessions. Changes to them are owner edits made outside an agent:

- `.claude/settings.json` (permission policy, hooks)
- `scripts/guardrails/**` (CI guards and the PreToolUse guard)
- `.claude/hooks/**`
- `.github/workflows/**`

To change one: edit it in your editor, run `npm run guard:agent-bash` (guard
selftest) and `npm run guardrails`, commit with a message that names the audit
finding, and note it here.

## Verification after these are done

- Re-run the Claude Code setup audit (v7.0 prompt). The MCP dimension can only
  reach full marks once the Neon connector is read-only and the connector set is
  pruned; the Security dimension's "CI backstop idle" note clears once Actions
  minutes are restored, and the sandbox dimension clears once `SANDBOX-NET` is
  live.
- `node scripts/check-operator-tasks.mjs` (or `npm run ops:tasks`) reports the
  live state of every checkbox above and, where possible, verifies it directly
  from the repo — see the Status table's "Verifiable from repo?" column.
