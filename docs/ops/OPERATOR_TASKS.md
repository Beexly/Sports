# Operator-only tasks (cannot be done from inside an agent session)

Source: Claude Code setup audits v6.0 / v7.0 (2026-09-02) and the remediation
that followed. Each item below needs a human with console access. Tick the box
and add the date when done; the next audit reads this file.

## Database and MCP connectors

- [ ] **Switch the Neon connector to read-only** (or point it at a non-production
  branch). Today the claude.ai Neon connector attaches in write mode with
  `delete_project`, `delete_branch`, `delete_postgres_database`, `run_sql`, and
  `reset_from_parent` exposed. `.claude/settings.json` now denies the destructive
  tools and asks on `run_sql*`, but that is belt-and-braces: the connector itself
  should not carry write scope for a coding session. Where: claude.ai → Settings →
  Connectors → Neon.
- [ ] **Prune connectors for this workspace** to `github`, `Neon` (read-only), and
  `Vercel`. Gmail, Google Drive, Notion, Figma, Era Context, QuickNode, Isometric,
  and Profound are unrelated to this codebase, cost roughly 95k tokens of tool
  schemas per session (docs/ops/EFFICIENCY_AUDIT_2026-08-13.md), and expose
  `send_message` / `trash_*` / `share_file`. Project-scoped servers are declared in
  `.mcp.json` (github, context7 for docs, vercel).

## Baseline migration (schema history is not replayable)

- [ ] **Create a baseline migration.** None of the 53 files under
  `packages/db/prisma/migrations/` creates `picks` or `users`; the history starts at
  `20260522141600_add_loss_autopsy` on top of a schema that was built with
  `db push`. `prisma migrate deploy` against an empty database fails at that first
  migration ("relation picks does not exist"; reproduced locally on Postgres 16 on
  2026-09-02). CI therefore keeps `db push` for the test database and runs the
  replay check non-blocking (`.github/workflows/ci.yml`, "Migration history replay
  check"). Fix, in order: (1) generate `0000_baseline` with
  `prisma migrate diff --from-empty --to-schema-datamodel packages/db/prisma/schema.prisma --script`
  captured as the SQL of a new migration dated before 20260522; (2) on production
  run `prisma migrate resolve --applied 0000_baseline` so the gate does not try to
  re-create tables; (3) verify `prisma migrate status` is clean in prod; (4) switch
  the CI step to blocking and replace `db push` with `migrate deploy` plus
  `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel … --exit-code`.
  This touches `packages/db/prisma/migrations/**` (frozen for agents by AGENTS.md
  law 2) and production, so it is an owner change.

## GitHub

- [ ] **Restore GitHub Actions billing / minutes** so `.github/workflows/ci.yml`
  runs on every PR again. The `.githooks/pre-push` comment records that minutes
  were unavailable; until they are, the secret-scan, trust-gate, and guardrails
  jobs are not a backstop.
- [ ] **Enable push protection and secret scanning** on the repository
  (Settings → Code security). This is the one layer that works even when a
  contributor bypasses local hooks.
- [ ] **Confirm branch protection on `main`** requires the `guardrails`,
  `trust-gate`, `secret-scan`, and `test` checks.

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
  minutes are restored.
