# Operator Launch Runbook

**Audience:** the operator opening the laptop in the morning to take the
platform from "validated and merged" to "publicly available with safe
performance claims."

This runbook is paired with `docs/launch-observatory.md` (architecture +
brand voice) and `reports/launch-night/final-report.md` (what shipped last
session). Read those first if you don't have context.

## 0. Pre-flight (do this once before any deploy)

```bash
# In the repo root:
rm -f .git/index.lock                  # clears the sandbox-held file
rm -rf node_modules _speedtest         # removes the partial-install residue
npm install                            # full clean install
npm run db:generate                    # prisma client + types
```

If `npm install` still fails with `ENOTEMPTY`, you're still inside the
sandbox — run the same commands outside the sandbox shell.

## 0a. Seed picks for the dashboard (dev only)

If the operator wants visible picks in `/dashboard`, `/cockpit`, and
`/cockpit/history` before live ingestion is wired, the fastest path is
the morning-setup orchestrator:

```bash
npm run dev          # in one terminal
npm run morning:setup  # in another — seeds + regens snapshots
```

`morning:setup` runs `db:seed` and `snapshots:regen` in sequence and
prints the URLs to open. If the dev server is not reachable, the
snapshot regen is skipped gracefully and only the seed runs.

Manual equivalent:

```bash
npm run db:seed
```

The seed is idempotent — it only creates picks when `db.pick.count() === 0`
and only when `NODE_ENV !== "production"`. It creates ~38 synthetic
picks across NFL/NBA/MLB/NHL/NCAAF: 8 pending canonical, 18 canonical
settled (mostly wins), 12 bootstrap-era. Each settled canonical pick
also seeds a `PickSignalSnapshot` with `eligibleForLearning=true`.

Synthetic picks carry `modelVersion='v5.0.0-seed'` so the operator can
later purge them with a targeted `DELETE FROM picks WHERE
model_version = 'v5.0.0-seed'`.

The Verified Record / Win Rate display stays gated by the
performance-gate policy. In **production** the seed never runs and
real ingestion fills the canonical count.

In **dev** with the seed run, if the operator manually flips
`PERFORMANCE_STATS_ENABLED=true`, the seeded picks DO flow through to
the canonical count — intentional, so the operator can preview the
policy-allowed UI without wiring live ingestion. The `Sample mode`
banner and the `dashboard-sample-mode` testid appear in the DOM the
whole time, so the operator never mistakes seeded picks for real
claims.

Safety boundaries that stay in place regardless:

- `seedPicks()` is gated on `NODE_ENV !== "production"`.
- `PERFORMANCE_STATS_ENABLED` defaults to `false`; the operator has to
  explicitly flip it.
- The trust-claims registry banned-phrase scanner runs on every
  customer page in CI.

## 1. Local verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If any of those fail, do not push. Read the first failing test, fix the
specific issue, and re-run the **focused** test before re-running the
full suite:

```bash
cd apps/web
npx vitest run __tests__/<the-test-file>.test.ts
```

Customer-facing copy regressions surface in:

- `public-copy-scanner.test.ts` — banned phrases
- `public-performance-policy.test.ts` — disclaimer + internal-vocabulary
- `dashboard-performance-gate.test.ts` — gate enforcement
- `trust-claims.test.ts` — registry invariants

If only those fail, the issue is brand/voice, not logic — fix the copy
and re-run.

## 2. Branch + commit + push + PR

```bash
git checkout -b feature/jarvis-launch-observatory
git add .
git status                              # eyeball — anything unexpected?
git commit -m "feat: add Jarvis launch cockpit and historical pick observability"
git push -u origin feature/jarvis-launch-observatory
```

Open a PR into `main`. Use the body from
`reports/launch-night/final-report.md`. Wait for CI green:

- `test` (lint + typecheck + test)
- `build` (Next.js build)
- `trust-gate` (banned phrases)
- `model-freeze` (no MODEL_VERSION drift)
- `draft-only` (no auto-publish path)
- `brand-safety` (customer-copy invariants — added this pass)
- `guardrails` (composite)

If `brand-safety` fails but `test` passes, you have a customer-copy
regression that the full suite would have caught more slowly — same fix,
faster signal.

## 3. Stage validation (after deploy)

Sign in as ADMIN on staging.

1. **`/cockpit`** — Jarvis Launch Observatory loads. Read the
   `oneSentenceAssessment` at the top. Expected states:
   - `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` (most common at this stage)
   - `LAUNCH_READY` (only after step 5 below)
   - Anything else → stop and investigate before continuing.
2. **`/cockpit/history`** — last 100 picks load. Confirm:
   - Bootstrap picks are flagged (yellow badge).
   - Public-eligible / Learning-eligible columns show the expected values
     given the readiness gates.
   - "Performance gate is …" line at the top reads CLOSED while you're
     still in bootstrap mode.
   - Try the CSV export button — file downloads with the current filters
     applied.
3. **`/admin/dashboard`** — raw operator console renders. Header links
   to `/cockpit` and `/cockpit/history` work.

Sign out, then visit as a non-admin or anonymous user:

4. **`/dashboard`** (sign in as a regular user) — the "Verified Record"
   and "Win Rate" cards show `Collecting` and `—`. Beneath them, the
   "collecting baseline data" notice appears. Bootstrap badges visible on
   any bootstrap rows in the recent-picks list.
5. **`/performance`** — bootstrap-state component, no win-rate claims.
6. **`/picks`** — slate renders. No `recentRecord` chip (because
   performance gate is closed). No banned phrases anywhere on page.
7. **`/`** — marketing homepage renders. No banned phrases.

If any of the above shows a record/win-rate while the performance gate
is closed, **stop**. Either the gate has been flipped without you
realizing, or a code path is bypassing the policy. Roll back the deploy.

## 4. Data warm-up

```bash
# Trigger an ingestion run via the admin API (signed-in as ADMIN):
curl -X POST https://<staging-host>/api/admin/trigger-refresh \
  -H "Cookie: <admin-session-cookie>"
```

Then back on `/cockpit`:

- `ingestionStatus` should turn from `UNKNOWN` to `GREEN` after a few
  minutes (the worker writes an `IngestionRun` row on success).
- Jarvis's `recommendedNextActions` shrinks as the data catches up.

Wait until the platform has accumulated **at least `minSettledPicksForLearning`**
canonical settled picks (default 25). Track this on
`/cockpit/history` → the "Public-eligible" rollup.

## 5. Opening the performance gate

This is the only operator action that changes customer-visible behavior.
Do not perform it until **all** of the following are true:

- Jarvis `canonicalHistoryStatus` reads `GREEN`.
- `/cockpit/history` rollup shows `Public-eligible >= 25`.
- Jarvis `safetyWarnings` is empty.
- Jarvis `launchStatus` is `LAUNCH_READY` or
  `LAUNCH_READY_PENDING_EXTERNAL_CONFIG`.

Then, in the deploy env:

```
PERFORMANCE_STATS_ENABLED=true
```

Redeploy. Re-validate `/dashboard` and `/performance`:

- "Verified Record" now shows W-L-P.
- "Win Rate" shows a percent.
- The collecting notice is gone; the visible-state caption shows.
- `/api/picks/daily-slate` now includes `recentRecord` in its JSON.

## 6. Rollback (if anything looks off after step 5)

```
PERFORMANCE_STATS_ENABLED=false
```

Redeploy. The dashboard immediately re-hides the record/win-rate; the
slate immediately stops returning `recentRecord`. No code changes, no
data changes — the gate alone controls the behavior.

If you need a full rollback of the launch observatory changes:

```bash
git checkout main
git revert <merge-commit-sha>
git push
```

The previous behavior (raw 14-day win-rate on `/dashboard`, ungated
`recentRecord` on the slate) was unsafe — the revert restores the old
bug. Prefer the gate-only rollback above.

## 7. Daily operator checklist (post-launch)

Once a day, in this order:

1. Visit `/cockpit`. Confirm `launchStatus = LAUNCH_READY`.
2. Check `ingestionStatus` and `settlementStatus` — both should be GREEN.
3. Open `/cockpit/history`. Skim the "Public-eligible" count vs.
   yesterday. A flatline is a sign ingestion or settlement is failing.
4. If `safetyWarnings` has anything, that takes priority over the rest of
   the day. Pause public-facing changes until it clears.
5. Check `/admin/dashboard` for raw ingestion errors.
6. If `canonicalHistoryStatus` regresses to AMBER, do not flip any
   additional gates that day.

## 7a. Regenerating launch-night snapshots

The static HTML snapshots in `reports/launch-night/snapshots/` are
committed for fast offline review. To refresh them:

```bash
# 1. Start the dev server in one terminal:
npm run dev

# 2. In another terminal (either form works):
npm run snapshots:regen
# or:
node scripts/regenerate-launch-snapshots.mjs
# or with a non-default host:
APP_URL=http://localhost:3001 npm run snapshots:regen
```

The script fetches each critical route, writes the body verbatim, and
rebuilds `index.html` with a fresh status table. If any route returns
non-2xx the script exits non-zero so you notice.

The script has no Next.js or framework dependencies — just `fetch()` and
`writeFile()`. Safe to run against any deploy environment that responds
with HTML on the listed paths.

## 7b. Reading the snapshot freshness

The snapshot index (`reports/launch-night/snapshots/index.html`) shows
when each snapshot was last regenerated and which routes returned
non-2xx. When opening the index in the morning:

- Status **200** → page rendered normally.
- Status **3xx** → page redirected. For `/cockpit` this is expected
  when there's no admin session. The placeholder body in the snapshot
  notes the redirect destination.
- Status **503** → readiness gate is closed. Expected for `/performance`
  and `/api/picks` in bootstrap mode.
- Status **4xx** other than 401/403 → investigate. Likely a build or
  route handler bug.
- Status **0** → the dev server wasn't running. Re-run
  `npm run snapshots:regen` after starting `npm run dev`.

The regenerator writes a self-describing HTML placeholder for non-200
responses so the snapshot still tells you what happened.

## 7c. Operator script index

The repo ships a small set of operator-facing npm scripts. Use them
in this order during a launch:

| Script | What it does | When to use |
|---|---|---|
| `npm run test:fast` | Brand-safety + cockpit subsets | Pre-commit smoke (~2 minutes) |
| `npm run test:brand-safety` | Customer-copy invariants only | Quickest gate (~30s) |
| `npm run test:cockpit` | Cockpit + Jarvis subsets only | After cockpit changes |
| `npm test` | Full suite | Before opening a PR |
| `npm run build` | Next.js production build | Before opening a PR |
| `npm run morning:setup` | Seed picks + refresh snapshots in one shot | Wake-up: get the dashboard rendering with data |
| `npm run snapshots:regen` | Refresh `reports/launch-night/snapshots/*.html` | After visual changes |
| `npm run smoke:launch-night` | Brand-safety + cockpit subsets in sequence | One-shot before push |
| `npm run prod:probe` | Hit `/api/health` (+ `/api/cockpit/jarvis` with cookie) | Post-deploy verification |
| `npm run jarvis:diff -- --save FILE` | Capture current Jarvis state | Before flipping a gate |
| `npm run jarvis:diff -- --against FILE` | Diff current vs saved state, exits non-zero on regression | After flipping a gate |
| `npm run guardrails` | All three guardrail scripts (trust-gate, model-freeze, draft-only) | Before merging a model change |

Each script's source lives in `scripts/`. Each one is single-file,
dependency-free, and has a `__tests__/*-script.test.ts` pinning its
source-level invariants.

## 8. Known invariants — never break these

- A pick with `isBootstrap=true` must never count toward public stats.
- A pick with `result=PENDING` must never count toward public stats.
- A pick with `result=VOID` must never count toward W/L/P.
- The customer dashboard must never display a record/win-rate while
  `canExposePerformanceStats=false`.
- `/api/performance` must return 503 (not 200 with empty data) while the
  gate is closed.
- The cockpit and admin dashboard must never be reachable without an
  ADMIN session.
- No phrase in the trust-claims BANNED registry may appear on any public
  page (the `public-copy-scanner.test.ts` enforces this; if it ever goes
  green incorrectly, investigate the scanner).
- No code path may set `PUBLISHED` on a `ContentDraft` automatically —
  every publish requires an explicit operator action.
- The MODEL_VERSION constant only moves when paired with an IMPLEMENTED
  CalibrationProposal landing in the same change (enforced by the
  model-freeze CI job).
