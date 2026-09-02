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
| BASELINE-MIG | Baseline migration landed; confirm production + make the CI replay blocking | Baseline in PR #684; owner: confirm `npm run db:migrate:status` after the first production deploy, apply the `.github/workflows/ci.yml` patch below | Partly (`npx prisma migrate deploy` on an empty DB is green) | Baseline landed in PR #684; 2 owner steps open |
| ACTIONS-BILLING | GitHub Actions billing / minutes | GitHub org → Settings → Billing | Partly — CI, daily-smoke and external-cron runs observed completing on 2026-09-02 (PR #684 check runs; daily-smoke #103–#105 green) | Resolved 2026-09-02 (minutes restored; keep an eye on the monthly cap) |
| PUSH-PROTECT | Enable push protection and secret scanning | GitHub repo → Settings → Code security | No — GitHub repo-settings-level | Open |
| BRANCH-PROTECT | Confirm branch protection on `main` | GitHub repo → Settings → Branches | No — GitHub repo-settings-level | Open |
| SANDBOX-NET | Enable OS-level sandboxing with a network allowlist | Edit `.claude/settings.json` (owner-only): `sandbox.enabled: true` + `sandbox.network.allowedDomains` | Yes | Done in PR #684 (verify on a machine with bubblewrap / macOS) |
| NEXT-MAJOR | Plan the Next.js 14 → 15/16 major upgrade | Separate migration project; the two `dependency-audit` waivers (`next`, bundled `postcss`) are reviewed by 2027-01-15 | Partly (`node scripts/guardrails/dependency-audit.mjs` shows the waivers) | Open |

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
  Two owner steps remain, which is why the box is unticked:
  1. **Confirm production after the first deploy that carries the baseline.**
     `scripts/deploy/migrate-if-configured.mjs` runs `migrate deploy`, which
     applies the baseline once (nothing is re-created — see above) and records
     it; `migrate deploy` ignores the 53 applied names that are no longer in
     the folder. Then run `npm run db:migrate:status` against production and
     tick this box when it prints "Database schema is up to date!". No
     `migrate resolve` is needed. If the baseline fails in the build gate, the
     build fails closed and the error names the statement; do not edit the
     baseline — fix the data or add a forward migration.
  2. **Make the CI replay blocking.** `.github/workflows/**` is Edit-denied
     for agent sessions, so this patch was written out instead of applied.
     In `.github/workflows/ci.yml` replace the "Migration history replay
     check" step (with its `continue-on-error: true`) and the following
     "Push database schema (test DB)" step with:
     ```yaml
     - name: Apply migrations (prisma migrate deploy, empty test DB)
       run: npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

     - name: Migration drift check (schema.prisma vs applied migrations)
       run: npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel packages/db/prisma/schema.prisma --exit-code
     ```
     Until then the existing non-blocking replay step passes on every run and
     the `db push` step is a no-op.

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
