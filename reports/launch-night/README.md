# Launch Night Reports — Index

**Read this first if you're the operator opening the laptop in the morning.**

**Snapshot:** 103 test files (from ~17), 8 new operator npm scripts,
3 new cockpit-only API routes, 2 new cockpit pages, 1 new CI
`brand-safety` job, 2 ADRs, full operator runbook, db-seeded picks so
the dashboard renders rows in the morning. All validation + git push
blocked from inside the sandbox; the operator must run the recipe in
`morning-handoff.md` outside the sandbox.

## Read in order

0. **[CHEATSHEET.md](./CHEATSHEET.md)** — single-page operator cheat
   sheet: 4 URLs, 4 commands, 4 things to verify, 4 invariants. Start
   here if you only have 60 seconds.
1. **[morning-handoff.md](./morning-handoff.md)** — the one-page brief.
   Stats, 60-second summary, next operator commands, quick visual checks,
   post-deploy verification, what the next session should pick up.
2. **[overnight-changelog.md](./overnight-changelog.md)** — first-pass
   changelog (initial Phase 0-11 push).
3. **[overnight-summary.md](./overnight-summary.md)** — second-pass
   summary covering everything added after the changelog (diff, alerts,
   trend page, ADRs, scripts, ~30 more test files).
4. **[final-report.md](./final-report.md)** — the close-of-day report.
   PR body candidate. Phase status matrix. Validation status. Exact next
   actions.
5. **[next-session-handoff.md](./next-session-handoff.md)** — what the
   *next* autonomous loop should pick up (Redis-backed ring buffer,
   durable audit log, calibration loop, admin dashboard rebuild, brand
   voice doc, snapshot CI, etc.).
6. **[observability-audit.md](./observability-audit.md)** — Phase 0
   inventory and gap analysis. What was found before the loop started.
7. **[run-dashboard-tonight.md](./run-dashboard-tonight.md)** — the
   one-click + one-command recipes for previewing the dashboard locally.
8. **[SESSIONS.md](./SESSIONS.md)** — coordination file for the two
   parallel Claude sessions working on launch night. Read this if
   you're trying to figure out "who shipped X."

## Snapshots

[`snapshots/index.html`](./snapshots/) — static HTML snapshots of every
critical route. Open in a browser to preview the cockpit, customer
dashboard, performance, etc. without spinning up the dev server. Regen
with `npm run snapshots:regen` while `npm run dev` is running.

## Historical / earlier phase reports

- [`../../PHASE_9_REPORT.md`](../../PHASE_9_REPORT.md) — the Phase 9
  (CI / deployment hardening) report that landed before the launch-
  night loop. Still authoritative for the CI work; the launch-night
  reports here build on top of it.

## Related docs

- `docs/launch-observatory.md` — architecture + brand voice + Jarvis
  troubleshooting + CSV format + alerts.
- `docs/launch-runbook.md` — step-by-step operator recipe to production.
- `docs/adr/001-public-performance-policy.md` — ADR on the policy module.
- `docs/adr/002-jarvis-synthesizer.md` — ADR on the synthesizer design.
- `CONTRIBUTING.md` — trust-first invariants + claim/page recipes.

## Quick commands

```bash
npm run test:fast           # brand-safety + cockpit (~2 minutes)
npm run smoke:launch-night  # the same plus optional snapshot regen
npm run snapshots:regen     # refresh the static snapshot HTML
npm run prod:probe          # health probe against APP_URL (env var)
```
