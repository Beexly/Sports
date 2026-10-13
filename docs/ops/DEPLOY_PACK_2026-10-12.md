# Deploy Pack — Full Real-Data Live Flip (2026-10-12)

**Purpose:** the one document for flipping galaxysportsedge.com to full
real-data / real-engine live. Companion: `docs/ops/SITE_SURFACE_CENSUS_2026-10-12.md`.
Source runbook: `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md` (2026-07-10
evidence; re-check the live ledger against the repo at execution time).

**Hard rules that stay in force:** no deploy before Part A completes; nothing
posts/publishes outside the gates; the doctrine-internal fences in Part B.3 are
NOT part of this flip.

---

## Part A — Migration-ledger reconciliation (Garrett, ~20 min, one-time)

Why: production schema was evolved out-of-band (`db push`) while the Prisma
ledger was never updated, and `DIRECT_URL` is stale (`migrate deploy` fails
P1001; the pooled `DATABASE_URL` works). Until the ledger matches the repo, the
fail-closed migration gate refuses every production build. Production evidence
2026-10-12: `/board` serves its DB_UNREACHABLE honest-empty state.

### The taps, in order

**Tap 1 — Neon console (get the direct string).**
Neon Dashboard → your project → Connection Details → **uncheck "Pooled
connection"** → copy the connection string. This is the current **direct**
(non-`-pooler`) string.

**Tap 2 — Vercel (repair `DIRECT_URL`).**
Vercel → project **sports-web** → Settings → Environment Variables →
**Production** → edit `DIRECT_URL` → paste the direct string from Tap 1 → Save.

> ### ⚠️ DO NOT DEPLOY BETWEEN TAP 2 AND STEP A5.
> With `DIRECT_URL` repaired but the ledger unreconciled, a deploy makes
> `prisma migrate deploy` connect and try to apply four "pending" migrations
> against objects that already exist. The apply fails AND records a **P3018
> failed-migration row**, which makes the ledger surgery below harder.
> Finish Part A first, or use the break-glass in A6.

**Step A1 — sanity check** (any machine with `psql`, with the new `DIRECT_URL`
exported): `psql "$DIRECT_URL" -c "select 1;"` must succeed.

**Step A2 — prove the live schema matches the repo schema** (read-only).
From the repo root, with production `DATABASE_URL` + repaired `DIRECT_URL`
exported:

```bash
cd packages/db
npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma
```

Must print **"No difference detected"**. If it lists differences, the live
schema is partially applied: apply each missing object manually from that
migration's `migration.sql` first, then re-diff until clean. For indexes on hot
tables use the online forms (outside any transaction):

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "odds_gameId_fetchedAt_idx" ON "odds"("gameId", "fetchedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ingestion_runs_status_completedAt_idx" ON "ingestion_runs"("status", "completedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "picks_settledAt_idx" ON "picks"("settledAt");
```

(A failed CONCURRENTLY build leaves an INVALID index: `DROP INDEX CONCURRENTLY <name>;` and rerun.)

**Step A3 — back up the ledger before touching it.**

```bash
psql "$DIRECT_URL" -c "select * from _prisma_migrations order by started_at;" > _prisma_migrations.backup.txt
```

**Step A4 — mark the four repo migrations applied + delete the four orphans.**

```bash
cd packages/db
npx prisma migrate resolve --applied 20260622120000_add_fantasy_subscription_tier
npx prisma migrate resolve --applied 20260622173000_add_pick_proof_receipt
npx prisma migrate resolve --applied 20260622180000_add_slate_commitment
npx prisma migrate resolve --applied 20260708000000_add_hot_path_indexes
```

```sql
delete from _prisma_migrations where migration_name in (
  '20260522000000_baseline',
  '20260610060117_add_closing_line_clv',
  '20260610200000_add_snapshot_bet_time_line_lock',
  '20260610230000_add_ingestion_run_quota'
);
```

**Step A5 — verify green, THEN redeploy.**

```bash
npx prisma migrate status   # must print: "Database schema is up to date!"
```

**Tap 3 — Vercel:** redeploy `main` (Deployments → ⋯ → Redeploy, or push any
commit). The migration gate now passes. **Do the Part B flag edits before this
redeploy** so one deploy brings everything up together (the gates fail closed,
so early flips are safe: no rows → honest-empty, never invented data).

### A6 — Break-glass (only if you must ship before reconciling)

Set `MIGRATE_GATE_ALLOW_UNVERIFIED=true` in Vercel Production env and redeploy.
The gate skips `migrate deploy` entirely for that build, with a loud warning
and **no schema-parity guarantee** — acceptable only for deploys known to carry
no schema change. **Remove the variable immediately after.** This pack
recommends the full reconciliation instead.

---

## Part B — Flag flips (Vercel → sports-web → Settings → Environment Variables → Production)

Current values are as observed 2026-10-12 from production behavior + code
defaults; confirm each in the Vercel UI while editing (names only — never paste
values anywhere else).

### B.1 Flip these for full real-data live

| # | Variable | Current | Set to | What it opens |
|---|---|---|---|---|
| 1 | `DIRECT_URL` | stale (dead endpoint, P1001) | current Neon **direct** string (Part A, Tap 1) | Working `migrate deploy`; the migration gate can pass |
| 2 | `LIVE_BOARD` | unset (off) | `true` | `/`, `/board`, `/slate`, `/games/*`, `/room/*` serve live Neon rows instead of HONEST_EMPTY_LIVE_BOARD_OFF |
| 3 | `LIVE_BOARD_GATE_SLATE` | unset | `1` | The gate slate loader (dual-asOf + calibration + quote checks) |
| 4 | `PUBLIC_PICKS_ENABLED` | unset (closed) | `true` | Public picks on `/picks` — still subject to readiness gates, FreshnessGate, and the adverse-edge suppression; opens nothing until canonical picks exist and clear |
| 5 | `CANONICAL_HISTORY_ENABLED` | unset (off) | `true` | Engine starts producing canonical picks (the history `/performance` and CLV are computed from) |
| 6 | `PUBLISH_LEDGER` | unset (off) | `true` | `/ledger` + `/glass-ledger` publish the pick ledger |
| 7 | `PROJECTIONS_PROVIDER` | unset (illustrative pool) | `graded` | Every fantasy surface + `/optimizer` switches from the fictional illustrative pool to the in-repo process-grade projections provider — real players, real engine |
| 8 | `PROPS_SLATE_ENABLED` | unset (404) | `1` | Ops props-slate endpoint (`/api/ops/props-slate`) reachable |
| 9 | `PERFORMANCE_STATS_ENABLED` | unset (off) | `true` — **LAST, and only after the settled-canonical-pick floor is met** (the cockpit/Jarvis readiness read states the floor and the current count) | `/performance`, `/clv` publish the record. Flipping early publishes nothing false (eligibility still gates), but the doctrine order is: settle first, publish second |

Also confirm **absent** (must stay unset): `EMERGENCY_OVERRIDE_ID`,
`EMERGENCY_REASON`, `EMERGENCY_RELIABILITY_UNTIL` (emergency overrides) and
`MIGRATE_GATE_ALLOW_UNVERIFIED` (break-glass only, see A6).

### B.2 Verify while you're in there (no change expected)

| Variable | Note |
|---|---|
| `DATABASE_URL` | Pooled Neon string — proven reachable from the Vercel build network; leave as is |
| `STATS_PUBLIC` | `/stats` foundation renders publicly today; leave at its current value — its sub-surfaces stay foundation until rights + live feeds clear |
| `CONTESTS_PUBLIC` | Paper contest board; a separate product decision, not required for this flip |
| `API_V1_ENABLED` | Public API v1 product gate; separate decision |

### B.3 DO NOT FLIP — doctrine-internal fences (Garrett 2026-09-28, HARD)

The public site shows projections, rankings, and published picks with their
outcomes only. These stay **unset**; opening any of them is a separate founder
decision, never a side effect of going live:

`METHODOLOGY_PUBLIC` · `METRICS_PUBLIC` · `NFLVERSE_PUBLIC` · `PLAYERS_PUBLIC`
· `PARLAY_MRI_PUBLIC` · `CALIBRATION_JSON_PUBLIC` · `TRUTH_TOPOLOGY_PUBLIC` ·
`SOURCES_CATALOG_PUBLIC`

`/intelligence/reconstruction` has **no flag at all** — permanently dark (NGS
doctrine). Post-deploy, `/players` and `/methodology` returning 404 is CORRECT;
a 200 there is a regression.

---

## Part C — Merge order for tonight's branch stack (Beexly/Sports → main)

Every merge requires green CI + the two-agent adversarial review, per standing
fleet rules. Order:

1. **`motif/main-ci-repair-2026-10-12` → main.** Lockfile regeneration
   (`@sports/twitter-bot` locked), `process-sport.ts` merge-scar repair,
   data-ingestion export surface — **plus the build blocker: deduplicate the
   three files whose duplicated definitions currently make EVERY tree
   unbuildable (`apps/web/components/ui/nav.tsx` — `Nav`/`NavSkeleton` ×2;
   `apps/web/app/auth/signin/page.tsx` — `metadata` ×2;
   `packages/prediction-engine/src/index.ts` — `LedgerEntry` export ×2;
   verified on main and on the stack, see Build verification).** Lands first
   so every later PR gets a green, honest CI signal and a buildable tree.
2. **`motif/pr1156-hygiene-fixes-2026-10-12` → `fix/galaxy-odds-first-2026-10-08`**
   (removes the 20.7 MB feed blob, the `.pyc`/generated junk; stamps the props
   board DIAGNOSTIC; gates the watchdog; props tests skip when Hermes' sheets
   are absent; loosens the brittle physics pin). Then **PR #1156
   (Hermes branch) → main**. The Galaxy-first ingestion behavior change inside
   #1156 needs Garrett's explicit sign-off or a split before this merge.
3. **`motif/sgp-real-prices-2026-10-12` → main** (SGP wired to real
   ESPN/Galaxy prices; DIAGNOSTIC artifact).
4. **`motif/pr1156-review-fixes-2026-10-12` → main** (Clayton trap disarm +
   parser/estimator hardening; stacked on step 3).
5. **`motif/sgp-projections-surface-2026-10-12` → main** (`/projections` page;
   stacked on step 3 — merge after step 4 to keep the artifact chain in order).
6. **Props chain → main** (engine-internal; not deploy-blocking):
   `motif/prop-price-feed-2026-10-12`, then `motif/props-board-live-2026-10-12`,
   then `motif/props-model-side-2026-10-12` when it lands.
7. **Tonight's wiring branches → main**, each as it clears review: gate
   census/wiring + gauntlet, reasoning layer, board/picks wiring, DFS
   real-slate wiring.
8. **`motif/deploy-pack-2026-10-12` → main** (this pack + the census; docs
   only, any time).

After the merges: Part A (reconciliation) → Part B flags → one production
deploy of `main` → Part D verification.

---

## Part D — Post-deploy verification checklist

Run top to bottom after the deploy. "Expected" includes the honest-empty
states — outside a slate window, empty is correct, not a failure.

| # | Check | Must show |
|---|---|---|
| 1 | Build log (Vercel) | Build COMPLETES (the 3-file dedupe from C.1 is in) and the migration gate passes (no P3018, no break-glass warning). If the break-glass warning appears, A6 was used — remove the var and redeploy |
| 2 | `GET /api/health` | 200 |
| 3 | `/board` | NOT `DB_UNREACHABLE`. During a slate window: live rows, fresh `Last refresh` (Central, labeled CT). Outside a window: honest-empty classifier state — either is a pass; invented rows are a fail |
| 4 | `GET /api/board/state` | 200 JSON; counts consistent with `/board`; `lastRefresh` recent during windows |
| 5 | `/` | Board counts render (or honest unavailable only if the DB is genuinely down); settled sample may still be dark — expected until eligibility clears |
| 6 | `/picks` | Readiness-gated: published picks with line/timing/reason, OR the dark "picks open when our sample and gates allow" state. A slate that appears without canonical rows behind it is a fail |
| 7 | `/projections` | During a slate window: projection cards — percentages only, no odds format, no player names, "Projection only. Not a pick and not a recommendation." After kickoff: rows come down, page reads stale/empty — expected, not an error |
| 8 | `/fantasy/lineup` (and one more fantasy page) | Real player names (graded provider). Fictional names (e.g. "Silas Hart") after the `PROJECTIONS_PROVIDER=graded` flip = fail |
| 9 | `/fantasy/dfs` | Real slate once the DFS provider registration (step C.7) is deployed; until then the sample slate MUST still be labeled fictional — unlabeled sample data is a fail |
| 10 | `/players`, `/methodology` | **Still 404** (doctrine fences shut). A 200 is a regression — stop and investigate |
| 11 | `/performance`, `/clv` | Dark until the settled floor + `PERFORMANCE_STATS_ENABLED`; then record with period, sample size, model version |
| 12 | `/ledger` | Ledger rows once `PUBLISH_LEDGER=true` and canonical picks exist; honest-empty before that |
| 13 | `/stats` | Foundation renders; DB dimensions show measured values once the DB is reachable at render |
| 14 | Brand safety | `npm run test:brand-safety --workspace=apps/web` green on the merged tree (see build verification below) |
| 15 | Rollback note | Any fail on rows 3/6/8: set `LIVE_BOARD` / `PUBLIC_PICKS_ENABLED` back to unset and redeploy — surfaces return to honest-empty; no data migration is involved |

---

## Build verification (2026-10-12, on the web-stack head)

Verified in a clean assembled tree of `motif/sgp-projections-surface-2026-10-12`
(Hermes base + the 6 surface files fetched from the remote; every fetched file's
git blob SHA matched the API's, the snapshot is byte-identical to the wiring
branch's SGP artifact, and the loader source is byte-identical to the copy held
by the board/picks lane). `npm install` completed: 830 packages (note: the
scratch copy's lockfile was repaired by `npm install` — the repo lockfile
desync itself is fixed by merge step C.1).

**Production build (`npm run build` → `next build`): FAILS — 3 files with
duplicated definitions, present on main AND on this stack (verified in the
committed git blobs of both).** Webpack/SWC halts on:

| File | Defect |
|---|---|
| `apps/web/components/ui/nav.tsx` | `export function Nav()` defined twice (lines 108, 152); `NavSkeleton` twice (174, 188) |
| `apps/web/app/auth/signin/page.tsx` | `export const metadata` twice (lines 15, 25) |
| `packages/prediction-engine/src/index.ts` | `LedgerEntry` exported twice (lines 1523, 2183) |

The fix is mechanical (delete the duplicated blocks) and is added to merge
step C.1. This also explains the frozen production deployment: no tree
containing these files can build, in Vercel or anywhere else. Everything else
in the build got that far cleanly: `next.config.mjs` sets
`typescript: { ignoreBuildErrors: true }` (type errors never block this build;
ESLint is NOT ignored — `ignoreDuringBuilds: false` — and no lint failure was
reached before the SWC halt). Two earlier attempts the same evening stalled
inside `next/font` downloads from Google Fonts (socket hang-ups — a VM network
outage that also took the GitHub API down intermittently); the third attempt,
after the network recovered, reached the real compile errors above.

**Typecheck (`tsc --noEmit`, full program, this head): 100 errors, all
pre-existing branch/repo rot — and the two that matter for the standing
question are NOT among them:**

- **Main's `process-sport.ts` syntax errors do NOT block this stack.** Zero
  TS1005 syntax errors exist on the branch head: its `process-sport.ts` parses
  clean (byte-verified earlier by the CI diagnosis). Its only 2 mentions in the
  typecheck are TS2305 missing-export errors (lines 39–40:
  `createGalaxySecondBook`, `getOddsPaymentCircuitBreaker` not re-exported from
  `@sports/data-ingestion`) — the export-surface rot that merge step C.1
  (main-CI repair) fixes. On a MAIN tree the same web typecheck DOES surface
  main's 2 syntax errors (observed by the surface agent), which is exactly why
  C.1 merges first.
- **Zero errors in the 6 surface files** (`/projections` page, loader,
  snapshot, card, loader tests, copy-scanner update).
- Error census (100): app/api 26 (mostly the same missing data-ingestion
  exports + Prisma client missing `mobileAuthCode`/`mobileDevice` models),
  packages/ingestion-pipeline 12, components/ui 11, prediction-engine 8,
  lib/intelligence-core 8, lib/odds 6, lib/intelligence 5, data-ingestion 4,
  app/auth 4, rest scattered. Three are latent runtime defects worth a lane:
  `app/picks/page.tsx(683)` `Cannot find name 'lastUpdatedIso'`,
  `components/picks/pick-card.tsx(129)` `Cannot find name 'LocalTime'`,
  `app/clv/page.tsx(288)` a `"date-short"` format literal mismatch. They ship
  under `ignoreBuildErrors` today; production renders around them, but the
  picks pair should be fixed before picks go public (Part B.4).

**Test suites on this head (run locally, 2026-10-12):**

- `test:brand-safety` (19 files): **4,670 passed / 1 failed (4,671)**. The one
  failure is a scanner false positive: `docs-public-copy-scan` flags the word
  "lock" in repo-root `AGENTS.md` lines 10033/10751/11384 — all three are the
  surname **Lock** (Drew Lock) in X-analytics benchmark entries, not betting
  copy. Fix before merge: backtick those lines or teach the scanner the
  exception. The public-copy scanner itself (27 tests, including the two new
  `/projections` surfaces) passes.
- SGP projections loader tests: **9/9 pass**.
- From the CI diagnosis on the same branch tree (clean checkout):
  `process-sport.test.ts` 87/87, `refresh-cycle.test.ts` 16/16,
  `free-auto-settle` 28/28, AI Council 7/7, Vercel skip-gate 10/10.
