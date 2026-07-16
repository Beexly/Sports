# 01 — Baseline

Recorded 2026-07-11 (UTC), immediately after PR #75 merged.

## Repository state at program start

- Default branch: `main` at `821d0ca3` — squash merge of PR #75 ("The frontier
  wave: Sealed Engine flagship, browser-verifiable receipts, states doctrine,
  and the verified improvement sweep"), which included four verified Codex
  review fixes (engine receipt official-pick join, /proof outage isolation,
  verify-console failure-context recompute copy, recompute state reset).
- Working branch: `claude/nfl-pbp-expected-metrics-xb069r`, reset to
  `origin/main` after the merge (merged-history-only, force-with-lease).
- Working tree: clean at reset.
- CI at head: green (tests, typecheck, lint, Prisma, build, all guardrail
  scanners). Vercel preview READY.

## Branch and PR decisions (deviations recorded)

The founder's handoff suggested dedicated branches
(`claude/frontier-radar-truth-2026-07-11`, `claude/frontier-agent-foundry-2026-07-11`,
`claude/frontier-model-router-shadow-2026-07-11`). This session operates under a
standing designated-branch rule, so:

- **PR A (truth + radar)** develops on the designated branch
  `claude/nfl-pbp-expected-metrics-xb069r` and opens a PR from it.
- Subsequent workstreams use the handoff's dedicated branch names, stacked on
  PR A's head, if branch creation is permitted in this environment; otherwise
  they queue behind PR A's merge and the constraint is recorded in
  `10_BLOCKERS.md`.
- **Frontier PRs are opened, not merged.** Merge is an owner action for this
  program (explicit handoff rule), unlike the babysit-to-merge protocol that
  governed PR #68–#75.

## Environment constraints

- GitHub access is MCP-only (no `gh` CLI, no direct API).
- No production database access from this environment; production activation
  claims are impossible to verify here and are treated as owner-gated.
- Production deploys currently refuse at the fail-closed migration gate until
  the owner runs `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md` (or
  break-glass). Nothing in this program changes production behavior anyway:
  all new capability flags default false.

## Canonical validation commands (from package.json, not guessed)

- `npm run test` (workspace vitest), `npm run typecheck`, `npm run lint`
- Guardrail scanners (repo root): `node scripts/guardrails/em-dash-scan.mjs`,
  `trust-gate.mjs`, `commercial-copy-scan.mjs`, `no-zk-overclaim.mjs`,
  `no-unsupported-performance-claims.mjs`, `secret-scan.mjs` (pre-commit hook)
