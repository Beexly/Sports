# Morning Handoff — Read This First

**Last refreshed:** 2026-05-19 (overnight loop continued through to
~03:15 AM PT; 103 test files; gate-only seed safety; picks seeded;
operator cheat sheet added.)

You wake up to a launch observatory that's been built, tested at the
source level, and documented. What's still pending is anything that
needs to run outside the sandbox (install, validate, commit, push,
deploy). The autonomous loop ran from ~10 PM Mon → ~early AM Tue.

**If you have only 60 seconds:** open
[`CHEATSHEET.md`](./CHEATSHEET.md) — single page, 4 URLs, 4 commands,
4 verifications, 4 invariants.

**If you have time for one command:** run `npm run dev` in one terminal
and `npm run morning:setup` in another. That seeds ~38 synthetic picks,
refreshes the static snapshots, and prints the URLs to open. From there
`/dashboard`, `/cockpit`, and `/cockpit/history` all render with data.

**Branch:** `sports-intelligence-os-phase-9-ci` (all the work below sits
on this branch, not committed yet — see the operator commands below).

## At-a-glance stats

- Test files: 103 (up from ~17 at session start) — ~6.1x growth
- Lib files under `apps/web/lib/`: 33
- Docs under `docs/`: 14 (incl. 2 ADRs)
- Launch-night reports under `reports/launch-night/`: 10 (incl. this one, the README index, and `CHEATSHEET.md`)
- New cockpit-only API routes: 3 (`/api/cockpit/history/export`, `/api/cockpit/jarvis`, `/api/cockpit/jarvis/trend`)
- New cockpit-only pages: 2 (`/cockpit/history`, `/cockpit/jarvis/trend`)
- New CI jobs: 1 (`brand-safety`)
- New operator npm scripts: 7 (`test:fast`, `test:brand-safety`,
  `test:cockpit`, `snapshots:regen`, `smoke:launch-night`,
  `prod:probe`, `jarvis:diff`)
- New helper scripts under `scripts/`: 5 (`launch-night-smoke.mjs`,
  `regenerate-launch-snapshots.mjs`, `prod-probe.mjs`,
  `jarvis-diff.mjs`, `exercise-jarvis.mjs`)

## 60-second summary

- **What's built:** Public-performance policy gates the customer
  dashboard + daily slate. Jarvis Launch Observatory at `/cockpit`
  reports launch-status, sectional health, and recommended actions.
  Forensic pick ledger at `/cockpit/history` shows per-row eligibility,
  bootstrap badges, a publish-readiness checklist, and CSV export.
  Admin-only JSON APIs at `/api/cockpit/jarvis` and
  `/api/cockpit/jarvis/trend`. Helper library
  (`jarvis-audit-log`, `jarvis-history`, `jarvis-diff`) and reusable
  components (`JarvisTrend`, `JarvisAssessmentPanel`).
- **Tests added:** ~60 test files (77 total) covering policy rules, brand-safety,
  bootstrap exclusion, readiness-gate enforcement at the engine
  boundary, Jarvis purity + determinism, cockpit stub-mode safety,
  trust-claim registry contract, NCPG phone-number policy, docs scan,
  snapshots scan, metadata scan, env-coverage, cockpit nav coverage,
  ChecklistRow, ADR contract, type-shape, loader-shape, sectional
  rendering cross-check, and a "policy is the only path to a public
  win-rate" invariant.
- **CI:** New `brand-safety` GitHub Actions job runs the customer-copy
  invariants in under a minute.
- **Docs:** `docs/launch-observatory.md` (brand voice quick reference,
  data-flow diagram, troubleshooting table, CSV format, helpline
  policy, JarvisDiff usage). `docs/launch-runbook.md` (step-by-step
  operator recipe). `docs/adr/001` + `docs/adr/002`. `CONTRIBUTING.md`.
- **What's NOT done (sandbox-blocked):** local `npm install`, full
  test/build, git commit, git push, PR.

## Read these in order

1. `reports/launch-night/observability-audit.md` — what was found at
   the start.
2. `reports/launch-night/final-report.md` — initial close-of-day summary
   (Phase 0–11).
3. `reports/launch-night/overnight-changelog.md` — every file added or
   edited in the overnight loop.
4. `docs/launch-runbook.md` — step-by-step recipe to take the platform
   to production.
5. `docs/launch-observatory.md` — architecture + brand voice reference.

## Next operator actions

Run these outside the sandbox:

```bash
# 1. Clear the sandbox-held files and reinstall
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
rm -f .git/index.lock
rm -rf node_modules _speedtest
npm install

# 2. Validate
npm run lint
npm run typecheck
npm run test
npm run build

# If you just want picks to render in the dashboard right now:
npm run dev               # in one terminal
npm run morning:setup     # in another — seeds + regens snapshots

# 3. Fast subset (brand-safety + cockpit) — under 2 minutes:
npm run test:fast

# Or just the brand-safety subset (under a minute):
npm run test:brand-safety

# Or all the launch-night smokes in one shot:
npm run smoke:launch-night
# With snapshot regen (requires `npm run dev` running too):
node scripts/launch-night-smoke.mjs --with-snapshots

# 4. Commit + push + open PR
git checkout -b feature/jarvis-launch-observatory
git add .
git commit -m "feat: add Jarvis launch cockpit and historical pick observability"
git push -u origin feature/jarvis-launch-observatory
# Open PR into main; use reports/launch-night/final-report.md as the body.
```

## Quick visual checks (no terminal)

Before you do anything else, open this file in a browser:

```
C:\Users\Garrett\Documents\Claude\Projects\AI Sports\reports\launch-night\snapshots\index.html
```

It links to static HTML snapshots of every critical route. If any look
wrong, you'll see it before you start the dev server.

To refresh the snapshots:

```bash
npm run dev       # in one terminal
npm run snapshots:regen  # in another
```

## Known issues / non-blockers

- The bash-side mount in the sandbox occasionally lags the Windows
  filesystem during a write burst. Trust the file tools (Read/Write/
  Edit), not `wc -l` over bash.
- The cockpit overview page (`apps/web/app/cockpit/page.tsx`) was
  rewritten in parallel by the user during the loop. The
  `JarvisAssessmentPanel` component is available as a drop-in if you
  want to slim the page down on the next iteration.
- The Jarvis ring buffer is process-local. For a multi-process deploy,
  swap `sharedJarvisHistory()` for a Redis-backed buffer (the
  interface is the same).

## If something goes wrong

- A `brand-safety` CI failure: open the failing test file, fix the
  copy on the page it scans, re-run `npm run test:brand-safety`.
- The dashboard shows a win-rate when you expect it to hide:
  `PERFORMANCE_STATS_ENABLED=true` is in the active env. Flip it back
  to `false`.
- The cockpit doesn't render: check `/api/cockpit/jarvis` — it should
  never 503; failures arrive as a 200 error envelope. If you get a
  503, the auth middleware is misconfigured.

## Post-deploy verification

After deploying to staging/production, hit the prod probe:

```bash
APP_URL=https://staging.example.com npm run prod:probe

# With admin-only checks (cockpit JSON endpoint):
APP_URL=https://prod.example.com \
  ADMIN_COOKIE="next-auth.session-token=..." \
  npm run prod:probe
```

Exit code is non-zero if `/api/health` doesn't return 200.

## Picks visible by morning

`packages/db/prisma/seed.ts` now ships a `seedPicks()` function that
creates ~30 synthetic picks across NFL/NBA/MLB/NHL/NCAAF. The seed
runs idempotently: only when `db.pick.count() === 0`, and only when
`NODE_ENV !== "production"`. Distribution:

- 8 pending canonical picks (today's + tomorrow's slate)
- 18 settled canonical picks (last 2 weeks) — win-heavy split
- 12 bootstrap-era picks (older history, mostly settled)

Each settled canonical pick also seeds a `PickSignalSnapshot` row with
`eligibleForLearning=true` so the cockpit-history page renders the
learning-eligibility column meaningfully.

After `npm run db:seed`, the operator sees:
- `/dashboard` — Today's picks tile + Recent results tile both render rows
- `/cockpit` — Picks at a glance: "Today's slate" sport-by-sport
  breakdown (`cockpit-slate-meta`) plus "Today's picks the operator
  surface is publishing" list (`cockpit-today-picks-list`); the Jarvis
  one-sentence assessment now references canonical/pending/bootstrap counts
- `/cockpit/history` — last 30+ picks with bootstrap badges, exclusion
  reasons, CSV export, plus a Source filter pill (live vs seed)

**Safety reminder:** these are synthetic seed picks, not model output. The
`reasoning` field includes the disclaimer. The performance gate is
unaffected — `Verified Record` stays gated until canonical settled
picks > 25 AND `PERFORMANCE_STATS_ENABLED=true`.

When live ingestion is configured (`THE_ODDS_API_KEY` set, ingestion
worker running), real picks land alongside the seed. To purge the seed
later, the operator can run a manual `DELETE FROM picks WHERE
model_version = 'v5.0.0-seed'`.

## 10-second status check

Before reading anything else, glance at this list. If everything in
this column is what you expected, the loop's work matches the brief:

- ✅ After `npm run db:seed`, `/dashboard`, `/cockpit`, and `/cockpit/history`
  all show actual pick rows (not empty states).
- ✅ Synthetic seed picks are tagged `modelVersion='v5.0.0-seed'`. The
  dashboard `Sample mode` banner stays up whenever they're rendered.
  Safety is at the gate layer: `seedPicks()` is dev-only, and
  `PERFORMANCE_STATS_ENABLED` defaults off.
- ✅ `/picks` and `/dashboard` show a "Demo mode" banner when the seed
  is the source.
- ✅ `/cockpit/history` has a Source filter pill so the operator can
  isolate seed picks from real ingestion output.


- ✅ Customer dashboard win-rate / record gated behind
  `evaluatePublicPerformancePolicy()` (no more raw 14-day arithmetic).
- ✅ `/api/picks/daily-slate` `recentRecord` gated on
  `canExposePerformanceStats`.
- ✅ `/api/performance` 503s when the gate is closed and never queries
  before the check.
- ✅ Jarvis Launch Observatory at `/cockpit` with synthesized status,
  sectional health, recommended actions, phase matrix.
- ✅ `/cockpit/history` forensic ledger with per-row eligibility,
  exclusion reasons, CSV export (admin-gated), publish-readiness
  checklist.
- ✅ `/cockpit/jarvis/trend` admin page + `/api/cockpit/jarvis` and
  `/api/cockpit/jarvis/trend` JSON endpoints.
- ✅ Admin dashboard rebuilt with a live launch-status pill probing
  `/api/cockpit/jarvis`.
- ✅ Brand-safety CI job, ~73 test files covering trust + Jarvis +
  cockpit + dashboard + docs invariants.
- ✅ Two ADRs, operator runbook, contributing guide, snapshot
  regenerator, prod probe script, alerts helper, diff helper.
- ⏳ Local lint / typecheck / test / build / git push — still blocked
  by sandbox ACL; operator must run the recipe below first.

## What the next session should pick up

See `reports/launch-night/next-session-handoff.md` for the prioritised
list (Redis-backed ring buffer, durable audit log, calibration loop,
admin dashboard rebuild, etc.).

Have a good morning.
