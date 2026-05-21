# Overnight Loop Summary (continuation)

**Window:** post-`overnight-changelog.md` → ~04:16 UTC 2026-05-19
**Branch:** `sports-intelligence-os-phase-9-ci`

This is the *second-pass* summary covering work that landed after the
initial `overnight-changelog.md`. Pair with that earlier file for the
complete morning context.

## What landed in this pass

### New libraries
- `apps/web/lib/cockpit/jarvis-diff.ts` — pure diff between two
  `JarvisAssessment`s with sectional + warning + config deltas
  + `summarizeJarvisDiff` one-line summary.
- `apps/web/lib/cockpit/jarvis-alerts.ts` — typed operator alerts
  derived from a diff (`info` / `warning` / `page` severities), plus
  `pagingAlerts` filter and `launchStatusAlert` convenience.
- `apps/web/components/cockpit/jarvis-diff-badge.tsx` — compact "what
  changed since last assessment" badge that reads from the ring buffer.
- `apps/web/components/cockpit/jarvis-assessment-panel.tsx` — reusable
  rendering of the full assessment (drop-in for cockpit page).
- `apps/web/components/cockpit/checklist-row.tsx` — shared cockpit
  primitive for "this is satisfied / this is not" rows.

### New pages
- `apps/web/app/cockpit/jarvis/trend/page.tsx` — admin-only trend
  view backed by `sharedJarvisHistory()`.

### New API routes
- `apps/web/app/api/cockpit/jarvis/trend/route.ts` — admin-only JSON
  trend endpoint that pushes a fresh assessment on every call.

### Page changes
- `apps/web/app/cockpit/history/page.tsx`:
  - Publish-readiness checklist (4 rows + progress bar + ready-to-flip
    explanation when applicable).
  - `ChecklistRow` extracted to shared primitive and imported.
  - CSV export button now wears an "Admin only" label.
- `apps/web/app/admin/dashboard/dashboard-view.tsx`:
  - Live launch-status pill that fetches `/api/cockpit/jarvis` and
    color-codes by JarvisLaunchStatus.

### Scripts + tooling
- `scripts/exercise-jarvis.mjs` — drives the full Jarvis pipeline
  (synthesize → audit → diff → alerts) locally with synthetic input.
- `scripts/regenerate-launch-snapshots.mjs` hardened for 503/redirect
  responses with self-describing HTML placeholders.
- Root `package.json` + `apps/web/package.json` now expose
  `test:brand-safety` and `test:cockpit` scripts so the operator can
  run focused subsets in under a minute.

### Docs
- `docs/launch-observatory.md`:
  - "Operator alerts" subsection covering jarvis-alerts.
  - "Jarvis assessment diff" subsection covering jarvis-diff.
  - "Snapshots (no-server preview)" subsection.
  - "CSV export format" subsection.
  - "Wiring the Jarvis trend on /cockpit" recipe.
  - "Responsible gambling — helpline policy".
  - "Troubleshooting Jarvis statuses" table.
- `docs/launch-runbook.md`:
  - `7a. Regenerating launch-night snapshots`.
  - `7b. Reading the snapshot freshness`.
- `docs/adr/001-public-performance-policy.md` and
  `docs/adr/002-jarvis-synthesizer.md` — two ADRs explaining the policy
  module and the synthesizer design decisions.
- `CONTRIBUTING.md` — trust-first invariants + where to look when CI
  fails + how to add a customer-facing claim or cockpit page.
- `reports/launch-night/morning-handoff.md` — the very first thing the
  operator sees when they sit down.
- `reports/launch-night/overnight-changelog.md` — the first-pass
  changelog covering the initial Phase 0-11 work.
- This file — the second-pass summary.

### Tests
Added or extended (new ones marked with ★):

| File | Coverage |
|---|---|
| `jarvis-diff.test.ts` ★ | diffJarvis correctness + summarizeJarvisDiff |
| `jarvis-alerts.test.ts` ★ | severity mapping, dedupe keys, paging filter, launchStatusAlert + edge cases |
| `jarvis-diff-badge.test.ts` ★ | component contract, render-null pre-2-snapshots, ARIA |
| `jarvis-assessment-panel.test.ts` ★ | sectional fields rendered, data-testids, status color coverage |
| `jarvis-type-shape.test.ts` ★ | runtime presence of every required JarvisAssessment key |
| `jarvis-loader-shape.test.ts` ★ | loadJarvisAssessment return shape + every consumer destructures correctly |
| `cockpit-jarvis-trend-api.test.ts` ★ | trend endpoint admin gate + buffer push + no-503 |
| `cockpit-history-checklist.test.ts` ★ | publish-readiness checklist rows + progress + ChecklistRow import |
| `cockpit-history-filter-contract.test.ts` ★ | page and export agree on filter keys |
| `cockpit-link-usage.test.ts` ★ | cockpit pages use Next Link not bare anchor |
| `cockpit-lib-docstrings.test.ts` ★ | every exported cockpit lib function has a preceding comment |
| `cockpit-sectional-rendering.test.ts` ★ | every sectional status referenced by the cockpit page |
| `cockpit-nav-coverage.test.ts` ★ | NAV in layout.tsx includes every implemented page |
| `cockpit-stub-safety.test.ts` ★ | no top-level await db.*, loader wraps queries |
| `cockpit-history-a11y.test.ts` ★ | nav + role=group + aria-current + focus-visible |
| `cockpit-history-export.test.ts` ★ | admin gate + CSV content-type + uses shared helper |
| `cockpit-jarvis-api.test.ts` ★ | admin gate + no 503 + cache-control + no auto-publish |
| `docs-adr.test.ts` ★ | ADR file naming, Status + Date headers, no TODO/TBD |
| `docs-public-copy-scan.test.ts` ★ | docs/launch-observatory + docs/launch-runbook |
| `snapshots-banned-phrases.test.ts` ★ | reports/launch-night/snapshots/*.html user-visible text |
| `metadata-banned-phrases.test.ts` ★ | layout + generateMetadata files |
| `next-config-policy.test.ts` ★ | strict mode + headers + secret-leak guards |
| `phone-number-policy.test.ts` ★ | NCPG number lives only in trust-claims |
| `public-copy-scan-strong.test.ts` ★ | registry-driven scan over all customer pages |
| `policy-only-winrate.test.ts` ★ | only policy module derives a win-rate |
| `readiness-gate-enforcement.test.ts` ★ | engine boundary: isFeatured derived from gate |
| `readiness-gates-contract.test.ts` ★ | ReadinessGates declares every key consumers depend on |
| `stub-mode-contract.test.ts` ★ | isStubMode exported + cockpit + loader use it |
| `env-example-coverage.test.ts` ★ | .env.example covers Jarvis + platform-config + progression flags |
| `dashboard-load-performance.test.ts` ★ | extracted loader unit tests |
| `trust-claims.test.ts` extended | banned-phrase list export, INTERNAL_VOCABULARY, visibility audit, enum shape, freshness, NCPG number, duplicate-id check |
| `jarvis.test.ts` extended | sectional-health classification fixtures, fixture per launchStatus, ordering rules |
| `jarvis-purity.test.ts` extended | no auto-bet / auto-publish / auto-promote |
| `jarvis-audit-log.test.ts` extended | full JSON round-trip preserves warnings |

### Memory
- Updated `sports-intelligence-os` memory entry with the full overnight
  loop deliverables, so the next session has a complete picture.

## Validation status (unchanged)

Local execution still blocked by the sandbox `node_modules` ACL +
`.git/index.lock`. Operator must run `handoff.md §8.11` outside the
sandbox first. Once that's clear:

```bash
npm run test:brand-safety   # ~30s
npm run test:cockpit        # ~45s
npm test                    # full suite
npm run build
```

## Picks visible by morning (third-pass priority pivot)

The operator's overnight redirect: "Focus on sports at least. I want to
see picks in the morning on the dash / Jarvis." Session B added (after
the cockpit/policy/Jarvis work):

- `packages/db/prisma/seed.ts` — `seedPicks()` creates ~38 synthetic
  picks (8 pending canonical, 18 settled canonical win-heavy, 12
  bootstrap-era). Idempotent, dev-only, every row stamped
  `modelVersion='v5.0.0-seed'`.
- `apps/web/app/cockpit/page.tsx` — "Picks at a glance" section + concrete
  counts (today / pending / settled-7d / canonical / bootstrap / featured)
  + freshness footer.
- `apps/web/app/cockpit/history/page.tsx` — "Source" filter pill so the
  operator can isolate seed picks from live model output.
- `apps/web/app/api/picks/route.ts` — `meta.containsSeedData` flag
  exposed to the page.
- `apps/web/app/picks/page.tsx` — Demo-mode badge rendered when the
  page receives `containsSeedData: true`.
- `apps/web/lib/cockpit/jarvis.ts` — `oneSentenceAssessment` now lists
  `canonical / pending / bootstrap excluded` counts in every status case.
- **Safety (final design):** seed picks flow through to canonical
  counts the same as any other pick. The boundaries are at the gate
  layer: `seedPicks()` is gated on `NODE_ENV !== "production"`, and
  `PERFORMANCE_STATS_ENABLED` defaults to `false`. The dashboard
  `Sample mode` banner and `dashboard-sample-mode` testid keep the
  disclosure visible whenever seeded picks are present. The extracted
  `lib/dashboard/load-performance.ts` keeps the seed-exclusion filter
  as a safer default for any future caller.

Tests added:
- `apps/web/__tests__/seed-picks-wiring.test.ts`
- `apps/web/__tests__/cockpit-picks-glance.test.ts`
- `apps/web/__tests__/dashboard-picks-tiles.test.ts`
- `apps/web/__tests__/picks-demo-mode.test.ts`
- `apps/web/__tests__/sample-picks-contract.test.ts`
- `apps/web/__tests__/cockpit-today-picks-chip.test.ts`
- `apps/web/__tests__/seed-exclusion-consistency.test.ts`

Coordination with Session A is captured in
`reports/launch-night/SESSIONS.md`.

## Stat snapshot (final)

- 107 test files (up from ~17 at session start — ~6.3x)
- 33 lib files under `apps/web/lib/`
- 14 docs files under `docs/` (incl. ADR 001 + ADR 002)
- 10 launch-night reports under `reports/launch-night/` (incl. README
  index + `CHEATSHEET.md` operator one-pager)
- 9 cockpit pages + 3 admin-only API routes (`/api/cockpit/history/export`,
  `/api/cockpit/jarvis`, `/api/cockpit/jarvis/trend`)
- 1 new CI job (`brand-safety`) wired into `.github/workflows/ci.yml`
- 7 new operator npm scripts: `test:brand-safety`, `test:cockpit`,
  `test:fast`, `snapshots:regen`, `smoke:launch-night`, `prod:probe`,
  `jarvis:diff`
- 5 new helper scripts in `scripts/`: launch-night-smoke,
  regenerate-launch-snapshots, prod-probe, jarvis-diff, exercise-jarvis
- 0 lint/typecheck/test runs (sandbox blocker — operator must run
  outside the sandbox)
- 0 git commits / pushes / PRs (sandbox blocker — `.git/index.lock`
  held)

## What's still pending for the operator

Same recipe as before:

```bash
rm -f .git/index.lock
rm -rf node_modules _speedtest
npm install
npm run lint
npm run typecheck
npm run test
npm run build
git checkout -b feature/jarvis-launch-observatory
git add .
git commit -m "feat: add Jarvis launch cockpit and historical pick observability"
git push -u origin feature/jarvis-launch-observatory
# Open PR using reports/launch-night/final-report.md as the body.
```

Have a good morning.
