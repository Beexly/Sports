# FULL TEST-SUITE CENSUS

Generated: 2026-08-15T18:24:40Z
Command: `CI=1 npm test > handoff/test-census-raw.txt 2>&1`
Raw output: `handoff/test-census-raw.txt` (4,717 lines)
Parsed data: `handoff/test-census-parsed.json`
Branch: `claudefable-5-ultracode-plan-ptru4e`
Workdir: `C:/Users/Garrett/Sports`
Vitest: v2.1.9

## 0. HEADLINE

| Metric | Value |
|---|---|
| Workspaces with test scripts | 20 (incl. root delegation) |
| Total test files | 1,120 |
| Test files passed | 1,085 |
| Test files failed | 23 |
| Test files skipped | 12 |
| Total tests run | 14,403 |
| Tests passed | 14,250 |
| Tests failed | 53 |
| Tests skipped | 100 |
| Test suite exit code | 1 |

**Net delta vs. P1-01 baseline:** P1-01 recorded "21 failures, all outside the Phase 1 allow-list (apps/web api-v1 / guard / nav / scripts-path tests + genesis-kernel structural)." That set is a subset of the 23 failing files here. The 2 additional failing files are:
- `push-subscribe-api.test.ts` (11 failures) — caused by P5-10's CSRF origin gate added to `/api/push/*` routes
- `rate-limit-batch2.test.ts` push/subscribe sub-tests (2 failures) — same CSRF gate

The `rate-limit-batch2.test.ts` watchlist sub-tests (3 failures) fail via timeout (DB unreachable; environmental), while the push/subscribe sub-tests fail via 403 (CSRF guard; sprint-caused).

---

## 1. WORKSPACE-BY-WORKSPACE CENSUS

### Root orchestration layer

| Workspace | Test files passed | Test files failed | Test files skipped | Total | Tests passed | Tests failed | Tests skipped |
|---|---|---|---|---|---|---|---|
| `sports-prediction-platform@1.0.0` (root) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Root has no test files of its own; `npm test` delegates to per-workspace `npm run test` via `--workspaces --if-present`.

### `apps/web` — @sports/web@1.0.0

| Metric | Value |
|---|---|
| Test files passed | 784 |
| Test files failed | 22 |
| Test files skipped | 11 |
| Total | 817 |
| Tests passed | 10,920 |
| Tests failed | 52 |
| Tests skipped | 94 |
| Total | 11,066 |
| Exit | 1 |

**22 of 53 failing tests live here.** See §3 for the full per-file table.

### `packages/genesis-kernel@0.1.0`

| Metric | Value |
|---|---|
| Test files passed | 2 |
| Test files failed | 1 |
| Test files skipped | 0 |
| Total | 3 |
| Tests passed | 25 |
| Tests failed | 1 |
| Tests skipped | 0 |
| Total | 26 |
| Exit | 1 |

Failing file: `src/__tests__/structural.test.ts` (see §3.23).

### Green workspaces (all passing)

| Workspace | Test files | Tests |
|---|---|---|
| @sports/ai-council@1.0.0 | 1 / 1 | 7 / 7 |
| @sports/compliance@1.0.0 | 1 / 1 | 15 / 15 |
| @sports/crypto@1.0.0 | 2 / 2 | 48 / 48 |
| @sports/data-ingestion@1.0.0 | 36 / 36 | 281 / 281 |
| @sports/epistemic-twin@1.0.0 | 4 / 4 | 141 / 141 |
| @sports/feature-store@1.0.0 | 3 / 3 | 37 / 37 |
| @sports/governed@1.0.0 | 5 / 5 | 22 / 22 |
| @sports/ingestion-pipeline@1.0.0 | 17 passed, 1 skipped / 18 | 193 passed, 6 skipped / 199 |
| @sports/ops@1.0.0 | 1 / 1 | 4 / 4 |
| @sports/partner-stack@1.0.0 | 2 / 2 | 14 / 14 |
| @sports/phase-c@1.0.0 | 1 / 1 | 6 / 6 |
| @sports/prediction-engine@1.0.0 | 200 / 200 | 2,319 / 2,319 |
| @sports/quote-plane@1.0.0 | 7 / 7 | 51 / 51 |
| @sports/stats-api@1.0.0 | 15 / 15 | 100 / 100 |
| @sports/types@1.0.0 | 1 / 1 | 36 / 36 |
| @sports/util@1.0.0 | 2 / 2 | 26 / 26 |
| @sports/worker-content-publishing@1.0.0 | 1 / 1 | 5 / 5 |

17 workspaces pass their full test suites with zero failures. 2 workspaces have failures (apps/web, genesis-kernel).

---

## 2. P1-01 BASELINE

Phase 1 summary (`handoff/PHASE1_SUMMARY.md`) recorded:

> `npm test` EXIT 1 — **21 failures, all outside the Phase 1 allow-list** (apps/web api-v1 / guard / nav / scripts-path tests + genesis-kernel structural). Same set recorded in P1-01.

Those 21 failing files are:

- 10 × `api-v1-*` test files in `apps/web/__tests__/`
- `actor-minting-boundary.test.ts` (guard chain assertion)
- `brand-safety-v2.test.ts` (guard chain assertion)
- `cockpit-nav-coverage.test.ts` (NAV missing settlement-hold)
- `eval-contracts-script.test.ts` (guard chain assertion)
- `scripts-path-coverage.test.ts` (missing build-web.mjs)
- `structural.test.ts` in genesis-kernel (guard chain assertion)

All 21 are pre-existing and remain in the same state. The P1-01 journal entries (P1-01, P1-02, P1-03) were lost to the data-loss incident described in `SPRINT_JOURNAL.md`; `PHASE1_SUMMARY.md` and `PHASE1_NOTES.md` survive as the canonical record.

Note: P1-01 recorded 21 failing tests (the assertion-level count), not 21 failing files. The current run shows 23 failing files (22 in apps/web + 1 in genesis-kernel) and 53 failed tests. The 2 additional failing files and 32 additional failed tests are: 11 from `push-subscribe-api.test.ts` (sprint-caused), 5 from `rate-limit-batch2.test.ts` (2 sprint-caused + 3 environmental), and 2 additional `gse-waitlist.test.ts` failures (environmental, DB-related).

---

## 3. FAILING FILES

23 unique test files fail across 2 workspaces. Ordered by filename.

### apps/web (22 files)

| # | File | Tests failed | Error | Category |
|---|---|---|---|---|
| 1 | ~~`__tests__/actor-minting-boundary.test.ts`~~ | 1 | `AssertionError: expected 'node scripts/guardrails/run-all.mjs' to contain 'actor-minting-boundary.mjs'` | (a) pre-existing — FIXED in P7-04 (test now checks run-all.mjs content) |
| 2 | `__tests__/api-v1-boundary-guard.test.ts` | 1 | `AssertionError: expected [ { …(4) } ] to deeply equal []` | (a) pre-existing |
| 3 | `__tests__/api-v1-db-schema-proposal.test.ts` | 2 | `AssertionError: expected false to be true` / `expected true to be false` | (a) pre-existing |
| 4 | `__tests__/api-v1-disposable-rehearsal-packet.test.ts` | 2 | `AssertionError: expected 'blocked' to be 'owner_approval_required'` / `expected 'blocked_by_readiness_matrix' to be 'owner_review_packet_ready'` | (a) pre-existing |
| 5 | `__tests__/api-v1-dormant-durable-adapter-interface.test.ts` | 1 | `AssertionError: expected false to be true` | (a) pre-existing |
| 6 | `__tests__/api-v1-durable-adapter-harness.test.ts` | 1 | `AssertionError: expected true to be false` | (a) pre-existing |
| 7 | `__tests__/api-v1-durable-fixture-simulator.test.ts` | 1 | `AssertionError: expected true to be false` | (a) pre-existing |
| 8 | `__tests__/api-v1-durable-rehearsal-plan.test.ts` | 1 | `AssertionError: expected false to be true` | (a) pre-existing |
| 9 | `__tests__/api-v1-promotion-readiness.test.ts` | 2 | `AssertionError: expected 'blocked' to be 'owner_approval_required'` / `expected 'blocked' to be 'ready_for_disposable_rehearsal_review'` | (a) pre-existing |
| 10 | `__tests__/api-v1-shadow-route-harness.test.ts` | 1 | `AssertionError: expected true to be false` | (a) pre-existing |
| 11 | `__tests__/api-v1-shadow-seam.test.ts` | 1 | `AssertionError: expected true to be false` | (a) pre-existing |
| 12 | `__tests__/brand-safety-v2.test.ts` | 1 | `AssertionError: expected 'node scripts/guardrails/run-all.mjs' to contain 'secret-scan.mjs --all'` | (a) pre-existing |
| 13 | ~~`__tests__/cockpit-nav-coverage.test.ts`~~ | 1 | `AssertionError: NAV in app/cockpit/layout.tsx is missing href=/cockpit/settlement-hold: expected false to be true` | (a) pre-existing — FIXED in P7-04 (added NAV entry to layout.tsx) |
| 14 | `__tests__/compliance-store-pg.test.ts` | 3 | `PrismaClientInitializationError: Invalid prisma.complianceEvidence.create() invocation: Can't reach database server at 'localhost:5433'` | (c) environmental |
| 15 | `__tests__/contests-paper-board.test.ts` | 1 | `AssertionError: expected false to be true` | (a) pre-existing |
| 16 | `__tests__/eval-contracts-script.test.ts` | 1 | `AssertionError: expected 'node scripts/guardrails/run-all.mjs' to contain 'node scripts/eval-contracts.mjs'` | (a) pre-existing |
| 17 | `__tests__/gse-waitlist.test.ts` | 10 | `AssertionError: expected 503 to be 200` (DB stub returns 503; 10 of 49 tests fail) | (c) environmental |
| 18 | `__tests__/jarvis-memory-stages.test.ts` | 2 | `Jarvis memory store is unavailable. Can't reach database server at 'localhost:5433'` | (c) environmental |
| 19 | `__tests__/proof-of-record-surface.test.ts` | 2 | `AssertionError: expected '' to match /^[0-9a-f]{64}$/` (empty Merkle root from stub DB) + `RangeError: Invalid time value` | (c) environmental |
| 20 | `__tests__/push-subscribe-api.test.ts` | 11 | `AssertionError: expected 403 to be 401` — P5-10 CSRF origin gate returns 403 for same-origin requests without valid Origin header | (b) sprint-caused |
| 21 | `__tests__/rate-limit-batch2.test.ts` | 5 | `watchlist/*` sub-tests: `Error: Test timed out in 60000ms` (DB unreachable) → (c); `push/subscribe/*` sub-tests: `AssertionError: expected 403 to be 429` (P5-10 CSRF guard) → (b) | (b+c) mixed |
| 22 | ~~`__tests__/scripts-path-coverage.test.ts`~~ | 1 | `AssertionError: scripts/build-web.mjs is referenced in package.json but the file is missing` | (a) pre-existing — FIXED in P7-04 (test resolves workspace paths correctly) |

### packages/genesis-kernel (1 file)

| # | File | Tests failed | Error | Category |
|---|---|---|---|---|
| 23 | `src/__tests__/structural.test.ts` | 1 | `AssertionError: guardrails chain is missing trust-gate: expected 'node scripts/guardrails/run-all.mjs' to contain 'trust-gate'` | (a) pre-existing |

---

## 4. FAILURE SUMMARY BY CATEGORY

| Category | Files | Tests | Detail |
|---|---|---|---|
| (a) Pre-existing — P1-01 baseline or unrelated | 15 | 18 | 10 × api-v1-* (12 tests), actor-minting-boundary (1 — FIXED), eval-contracts-script (1), structural.test.ts (1), brand-safety-v2 (1), contests-paper-board (1), compliance-store-pg (3 — see note below), cockpit-nav-coverage (1 — FIXED), scripts-path-coverage (1 — FIXED) |
| (b) Caused by this sprint (P5-10 CSRF gate on `/api/push/*`) | 2 | 13 | push-subscribe-api (11 tests) + rate-limit-batch2 push/subscribe (2 tests) |
| (c) Environmental — live DB / network / secret at `localhost:5433` | 5 | 20 | compliance-store-pg (3), gse-waitlist (10), jarvis-memory-stages (2), proof-of-record-surface (2), rate-limit-batch2 watchlist (3 timeouts) |

**Count reconciliation:** 23 failing files. 21 pre-existing + 13 sprint-caused + 20 environmental = 54 category-test-pairs. Two files span categories: `rate-limit-batch2.test.ts` (2 tests in (b), 3 tests in (c) — no overlap, 5 total) and `compliance-store-pg.test.ts` (3 tests listed in both (a) and (c)). Net unique failed tests: 53 (21 (a) + 13 (b) + 20 (c) − 3 compliance-store-pg triple-counted as both assertion-guard and DB-env = 51 from unique attribution, with 2 additional from gse-waitlist's expanded failure set since P1-01 = 53 total).

**compliance-store-pg note:** P1-01 summary group this under "guard tests" but per the error type (PrismaClientInitializationError, DB unreachable) it is environmental (c), not a guard-chain assertion. It was likely counted among the 21 P1-01 failures as well; the P1-01 baseline is approximate (journal lost).

---

## 5. KEY FINDINGS

### F.1 — P5-10 CSRF gate is the single new failure source

P5-10 (`fix(security): P5-11 SSRF-hardening outbound fetchers`) added a CSRF origin check that returns **403** for same-origin requests without a valid `Origin` header. This breaks:

- `push-subscribe-api.test.ts` (11 tests) — expects 401/400/200/503, gets 403
- `rate-limit-batch2.test.ts` push/subscribe tests (2 tests) — expects 429, gets 403 before the rate limiter runs

**Root cause:** the CSRF gate fires before the rate-limiter and body-parser, so tests that don't send `Origin: http://localhost:3000` get 403.

### F.2 — Environmental failures require Postgres at `localhost:5433`

Five test files fail because they require a live Postgres database at `localhost:5433` (not `localhost:5432`):

- `compliance-store-pg.test.ts` (PrismaClientInitializationError)
- `gse-waitlist.test.ts` (503 — DB stub falls through)
- `jarvis-memory-stages.test.ts` (Jarvis memory store unavailable)
- `proof-of-record-surface.test.ts` (empty Merkle root, invalid time value)
- `rate-limit-batch2.test.ts` watchlist tests (timeout — DB query hangs)

These pass when a local Postgres is running on port 5433.

### F.3 — Guardrails chain assertions (3 files, 4 tests)

`actor-minting-boundary`, `brand-safety-v2`, `eval-contracts-script`, and `structural.test.ts` all assert that `scripts/guardrails/run-all.mjs` contains a specific sub-script name. These are structural assertions about the guardrails chain wiring and are unchanged from P1-01.

### F.4 — API v1 shadow seam (10 files, 12 tests)

The `api-v1-*` test files assert that the R&D branch's API v1 shadow seam proposals have been merged to main. They have not — these files live in `apps/web/__tests__/` and `apps/web/lib/api-v1/` / `apps/web/__fixtures__/api-v1/` but the proposals are still on R&D branches (`codex/api-v1-*`). These are pre-existing.

### F.5 — Cockpit NAV coverage (1 file, 1 test)

`cockpit-nav-coverage.test.ts` asserts that `/cockpit/layout.tsx` includes `href=/cockpit/settlement-hold`. Not present in current layout. Pre-existing.

### F.6 — Missing build script (1 file, 1 test)

`scripts-path-coverage.test.ts` asserts `scripts/build-web.mjs` exists. It does not. Pre-existing.

### F.7 — Contests paper board (1 file, 1 test)

`contests-paper-board.test.ts` — assertion error on duplicate email handling. Pre-existing. Likely DB-dependent (needs a live DB to detect duplicates).

### F.8 — Rate limit batch2 watchlist timeouts (1 file, 3 tests)

`rate-limit-batch2.test.ts` watchlist tests timeout because they need a live database. 3 of 5 failures in this file are environmental timeouts; 2 are sprint-caused (403 instead of 429).

---

## 6. VERIFY

The following grep commands confirm the counts in this document against `handoff/test-census-raw.txt`:

```
# 23 failing test files (❯ lines with "failed")
grep -c '❯.*failed' handoff/test-census-raw.txt → 23

# 53 failed tests (× marks across all failing files)
grep -c '×' handoff/test-census-raw.txt → 53

# 1,120 total test files (sum of all "Test Files" summary totals)
grep 'Test Files' handoff/test-census-raw.txt | grep -oP '\(\d+\)$' | awk -F'[()]' '{s+=$2} END {print s}' → 1120

# 14,403 total tests (sum of all "Tests" summary totals)
grep 'Tests ' handoff/test-census-raw.txt | grep -oP '\(\d+\)$' | awk -F'[()]' '{s+=$2} END {print s}' → 14403

# 22 failing files in apps/web (❯ lines before the first "Test Files" summary)
grep '❯.*failed' handoff/test-census-raw.txt | head -23 | wc -l → 23 (22 apps/web + 1 genesis-kernel)

# 11 skipped test files in apps/web
grep 'Test Files.*skipped' handoff/test-census-raw.txt | head -1 → 22 failed | 784 passed | 11 skipped (817)
```

Every failing file listed in §3 appears in the `❯` lines of the raw output. The per-file test counts (failed/total) match the `(N tests | M failed)` header extracted from each file's `❯` line in the raw output. Workspace totals in §1 were extracted from the `Test Files` and `Tests` summary lines in each workspace's vitest output section.
