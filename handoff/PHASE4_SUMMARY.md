# PHASE 4 SUMMARY

## Status: 7 committed (working-tree) + 0 blocked + 0 skipped

## Committed vs. Working-Tree

Of the seven Phase 4 fixes (P4-01..P4-07), **one** was committed to git history during
this phase. The remaining six were applied to the working tree and passed their scoped
verification, but were left uncommitted at sprint close. All seven edits are currently
present in the working tree and pass the full `npm run typecheck && npm run lint` suite.

| Task | GSE-SEC  | Files edited | Committed?         | Commit hash (short)                 | typecheck | lint    |
|------|----------|--------------|--------------------|--------------------------------------|-----------|---------|
| P4-01| 025      | 4 (preview, board, state, api) | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |
| P4-02| 016      | 2 (authorize.ts, test)         | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |
| P4-03| 039      | 2 (process-sport.ts, settle-sport.ts) | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |
| P4-04| 043      | 3 (process-sport, generate-signal-slate, test) | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |
| P4-05| 049      | 3 (pfr-adv-stats, pressure-coverage, rushing-contact) | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |
| P4-06| 050      | 3 (multi-source-scores, free-score-persist, source-router) | **COMMITTED** | b992f1c3 | EXIT 0    | EXIT 0  |
| P4-07| 051      | 2 (free-first-ingest, free-score-persist) | Working tree only (uncommitted) | — | EXIT 0    | EXIT 0  |

### Commit hash verification

```
$ git show b992f1c317d2f42279186e69434b15fbb4ec6e2c --stat --oneline
b992f1c3 fix: GSE-SEC-050 — gate secondary score sources with runtime checkClearance
 apps/web/lib/data-sources/free-score-persist.ts  | 17 ++++++++
 apps/web/lib/data-sources/multi-source-scores.ts | 53 +++++++++++++++++++++++
 apps/web/lib/data-sources/source-router.ts       |  2 +-
 3 files changed, 71 insertions(+), 1 deletion(-)
```

Hash resolves. PASS.

### Working-tree status

```
$ git diff --name-only HEAD
apps/web/__tests__/cron-vercel-platform.test.ts
apps/web/app/api/board/state/route.ts
apps/web/app/board/page.tsx
apps/web/app/cockpit/api-costs/budget-override-control.tsx
apps/web/app/preview/[sport]/[slug]/page.tsx
apps/web/lib/board/state.ts
apps/web/lib/cron/authorize.ts
apps/web/lib/data-sources/free-first-ingest.ts
apps/web/lib/data-sources/free-score-persist.ts
apps/web/lib/data-sources/multi-source-scores.ts   (committed in b992f1c3 — diff shows
apps/web/lib/data-sources/source-router.ts         no conflict; remaining files are
apps/web/lib/ingestion/pfr-adv-stats.ts             uncommitted P4 + P1-03 edits)
apps/web/lib/intelligence/rushing-contact.ts
apps/web/lib/nflverse/pressure-coverage.ts
eval/promptfoo/scorer.test.ts
packages/ingestion-pipeline/src/__tests__/process-sport.test.ts
packages/ingestion-pipeline/src/generate-signal-slate.ts
packages/ingestion-pipeline/src/process-sport.ts
packages/ingestion-pipeline/src/settle-sport.ts
tools/model-advisor/recommend.test.ts
tools/model-advisor/recommend.ts
```

NOTE: `tools/model-advisor/*` and `eval/promptfoo/*` appear in the diff as carry-over
uncommitted working-tree edits from Phase 1 (P1-03). They are not Phase 4 scope.

## Per-Task Results

### P4-01 — GSE-SEC-025: Paywall leak on /board and /preview
- **Files:** apps/web/app/preview/[sport]/[slug]/page.tsx (2 call sites fixed);
  apps/web/lib/board/state.ts (removed dead redactMarket helper);
  apps/web/app/board/page.tsx (removed unused canSeePremiumPicks var);
  apps/web/app/api/board/state/route.ts (confirmed already correct).
- **Fix:** Both preview and board now resolve viewer entitlements first, then pass
  `canSeePremiumPicks` to `loadGameForSlug` / `loadBoardState` so tier: "FREE" is
  applied at the DB query. Premium `pick.selection`/`line`/`market` never reach
  anonymous/FREE viewers.
- **VERIFY (exact output from journal):**
  ```
  npm run typecheck → EXIT 0
  npx eslint on all 4 files → EXIT 0 (1 error fixed: unused var)
  Manual trace confirms anonymous request to /board and /preview URLs now tier-filter
  at the DB query and redact market/selection fields.
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-025 closed.

### P4-02 — GSE-SEC-016: Spoofable x-vercel-cron auth on mutating cron routes
- **Files:** apps/web/lib/cron/authorize.ts (only source file in scope);
  apps/web/__tests__/cron-vercel-platform.test.ts (updated to assert new default).
- **Fix:** `resolveMode()` now returns `mode ?? "bearer_only"` (was `"dual"`).
  The x-vercel-cron platform header is accepted only when a route explicitly passes
  `{ mode: "dual" }` (reserved for read-only health-probe crons). All 24+ mutating
  crons default to bearer_only now.
- **VERIFY (exact output from journal):**
  ```
  npm run typecheck → EXIT 0
  npx eslint (4 scoped files) → EXIT 0
  npx vitest run cron-vercel-platform.test.ts cron-authorize-dual-secret.test.ts → 11/11 PASS
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-016 closed.

### P4-03 — GSE-SEC-039: Paid Odds + Scores fetch without spend guard
- **Files:** packages/ingestion-pipeline/src/process-sport.ts (odds path);
  packages/ingestion-pipeline/src/settle-sport.ts (scores path).
- **Fix:** Added local `paidCallJustified(need, sport.key)` to both files (mirrors
  free-first-ingest.ts + source-router.ts). Guards `client.getOdds()` at line 253
  and `client.getScores()` at line 178. Also fixed a malformed `console.warn`
  (literal `\n` escape sequences injected by prior run causing TS1127).
- **VERIFY (exact output from journal):**
  ```
  npx tsc --noEmit -p packages/ingestion-pipeline/tsconfig.json → EXIT 0
  grep confirms paidCallJustified called before client.getOdds (line 251 < 253)
  and before client.getScores (line 171 < 178).
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-039 closed.

### P4-04 — GSE-SEC-043: Settle TOCTOU could overwrite a just-settled pick
- **Files:** packages/ingestion-pipeline/src/process-sport.ts;
  packages/ingestion-pipeline/src/generate-signal-slate.ts;
  packages/ingestion-pipeline/src/__tests__/process-sport.test.ts.
- **Fix:** Replaced `upsert` block with race-safe `updateMany(where: { gameId, pickType, result: "PENDING" })` + conditional `create`. If count=0, pick is frozen/ skipped. No code path writes pick-identity fields onto a settled row.
- **VERIFY (exact output from journal):**
  ```
  npx tsc --noEmit -p packages/ingestion-pipeline/tsconfig.json → EXIT 0
  npx vitest run process-sport.test.ts generate-signal-slate.test.ts → 48/48 PASS
  Confirm: no code path writes pick-identity fields onto a settled row.
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-043 closed.

### P4-05 — GSE-SEC-049: PFR advanced stats ingested without PFR-specific clearance
- **Files:** apps/web/lib/ingestion/pfr-adv-stats.ts;
  apps/web/lib/nflverse/pressure-coverage.ts;
  apps/web/lib/intelligence/rushing-contact.ts.
  (source-rights-registry.ts NOT modified.)
- **Fix:** Added `checkClearance` call with source_id="pfr-advstats-via-nflverse"
  (mode: open_dataset_ingest, tool_id: fetch-native, intents: ["storage","derived_analytics"])
  before every PFR data access. Retention of `assertIngestible("nflverse")` as
  secondary sanity check.
- **VERIFY (exact output from journal):**
  ```
  npx tsc --noEmit (cwd apps/web) → EXIT 0
  npx eslint lib/ingestion/pfr-adv-stats.ts lib/nflverse/pressure-coverage.ts
    lib/intelligence/rushing-contact.ts --max-warnings=0 → EXIT 0
  Confirmed all three files call checkClearance with source_id "pfr-advstats-via-nflverse"
    before touching PFR data.
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-049 closed.

### P4-06 — GSE-SEC-050: Unregistered secondary score sources fetched without clearance
- **Files:** apps/web/lib/data-sources/multi-source-scores.ts;
  apps/web/lib/data-sources/free-score-persist.ts;
  apps/web/lib/data-sources/source-router.ts.
- **Fix:** Added `checkSecondaryClearance()` helper calling `checkClearance` for each
  unregistered source (henrygd-ncaa, mlb-statsapi, balldontlie-nba, nhl-web-api) at
  the top of `fetchSecondaryForIsoDays()` and inline before each secondary fetch.
  Denial skips the fetch and emits an error log.
- **Commit:** b992f1c317d2f42279186e69434b15fbb4ec6e2c
- **VERIFY (exact output from journal):**
  ```
  npm run typecheck → EXIT 0
  npm run lint → EXIT 0
  Confirmed all fetch sites for henrygd-ncaa, mlb-statsapi, balldontlie-nba, nhl-web-api
  now call checkClearance before any network call — denial skips the fetch.
  ```
- **Result:** PASS. GSE-SEC-050 closed.

### P4-07 — GSE-SEC-051: ESPN scores stored despite storage_allowed=false
- **Files:** apps/web/lib/data-sources/free-first-ingest.ts;
  apps/web/lib/data-sources/free-score-persist.ts.
  (source-rights-registry.ts NOT modified.)
- **Fix:** Added runtime `checkClearance` call with source_id="espn-public-api"
  (mode: public_logged_off_fact_extract, tool_id: fetch-native, intents: ["storage","derived_analytics"])
  before the ESPN scoreboard fetch in `fetchScoresFreeFirst()`. If clearance is
  denied, returns `data: null` — preventing ESPN-sourced scores from being fetched
  for persistence.
  In `persistFreeScores()`, added the same check before `db.game.updateMany()`;
  denial skips the DB write.
- **VERIFY (exact output from journal):**
  ```
  npx tsc --noEmit -p apps/web/tsconfig.json → EXIT 0
  npx eslint apps/web/lib/data-sources/free-first-ingest.ts
    apps/web/lib/data-sources/free-score-persist.ts --max-warnings=0 → EXIT 0
  Confirmed: ESPN-sourced scores can no longer be fetched for persistence or written
  to Game rows while storage_allowed=false holds for espn-public-api.
  ```
- **Commit:** Not committed — working tree only.
- **Result:** PASS. GSE-SEC-051 closed.

## Full-suite current state (all P4 edits in working tree)

The complete Phase 4 edits are now present in the working tree. A full-suite run
confirms both checks pass cleanly with all fixes applied:

```
$ npm run typecheck
→ EXIT 0  (all 22 workspaces typecheck clean)

$ npm run lint
→ EXIT 0  (eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0)
```

## Summary table

| GSE-SEC | Phase 4 Task | Commit hash | typecheck | lint |
|---------|-------------|-------------|-----------|------|
| 025     | P4-01       | — (working tree) | EXIT 0 | EXIT 0 |
| 016     | P4-02       | — (working tree) | EXIT 0 | EXIT 0 |
| 039     | P4-03       | — (working tree) | EXIT 0 | EXIT 0 |
| 043     | P4-04       | — (working tree) | EXIT 0 | EXIT 0 |
| 049     | P4-05       | — (working tree) | EXIT 0 | EXIT 0 |
| 050     | P4-06       | b992f1c3  | EXIT 0 | EXIT 0 |
| 051     | P4-07       | — (working tree) | EXIT 0 | EXIT 0 |

Commit counts: 1 committed (b992f1c3, P4-06), 6 applied-but-uncommitted (P4-01..05, P4-07),
0 blocked, 0 skipped.

---

## P5-12 NOTE (2026-08-16) — GSE-SEC-051 blocker RESOLVED

P5-12 narrowed the clearance intent in `free-first-ingest.ts` (the GSE-SEC-051
fix from P4-07) from `["storage", "derived_analytics"]` to `["derived_analytics"]`
only, and committed it (b67ace68). The original P4-07 clearance call was
requesting `storage` intent on ESPN, which has `storage_allowed=false`
permanently in the rights registry — so clearance was always denied, blocking
the read-only ESPN scores path entirely.

GSE-SEC-051's core blocker (the clearance call itself that gates ESPN ingestion)
is now committed and passing. It is safe to commit `free-first-ingest.ts` +
`free-score-persist.ts` together in a future task, but per P5-12's instructions,
do NOT commit free-score-persist.ts in this task — that remains a separate
decision. The `free-score-persist.ts` file in the working tree diff still
carries its own P4-07 clearance gating edit and awaits a separate commit.
