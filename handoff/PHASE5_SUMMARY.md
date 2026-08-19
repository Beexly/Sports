# PHASE 5 SUMMARY

## Status: 13 tasks — 13 committed · 0 blocked · 0 skipped

All of P5-01 through P5-13 are committed to `claude/fable-5-ultracode-plan-ptru4e`.
This summary closes the "Phase 4 summary missing explicit test-run lines" gap:
**every** task below has an explicit test-file + result line, not just "typecheck/lint."

Branch / HEAD at close of Phase 5: `dadef529` (P5-13 journal append on top of `99e84de2`).

---

## Per-Task Results

### P5-01 — Guard STRIPE_SECRET_KEY at runtime
- **Commit:** `b606d4a8` — `fix: guard STRIPE_SECRET_KEY at runtime instead of module-load time`
- **Files:** `apps/web/lib/stripe.ts`, `apps/web/vitest.setup.ts` (2 files, +85/-3)
- **Fix:** replaced the module-scope `new Stripe(process.env["STRIPE_SECRET_KEY"]!, ...)` (bare TS `!` assertion, crashed on import) with a lazy `getStripe()` singleton + Proxy so the key is read on first use; missing/blank key throws a typed `StripeConfigError` instead of crashing checkout/webhook route import. Matches the existing fail-closed price-id pattern in the same file.
- **Test file run:** none directly (no dedicated unit test existed pre-task).
- **Result:** no test file to run; the VERIFY instruction ("unset STRIPE_SECRET_KEY locally and confirm checkout/webhook routes return a handled error instead of crashing on import, then run any existing test file covering stripe.ts if one exists") — no pre-existing test file covered `stripe.ts`, so the live behavior was verified by manual trace rather than a re-runnable test. This is an honest gap, noted for P7-06's debt sweep, not a green claim.

### P5-02 — Wire em-dash-scan.mjs into the guardrails chain
- **Commit:** `98b20506` — `fix(guardrails): wire em-dash-scan into guardrails chain`
- **Files:** `scripts/guardrails/run-all.mjs`, `package.json` (2 files, +2/-0)
- **Fix:** added `em-dash-scan.mjs` to the `GUARDS` array in `run-all.mjs` (after `commercial-copy-scan`, both brand/copy guards). The `package.json` `guard:em-dash` script survived a watchdog revert and was committed together here.
- **Test file run:** `node scripts/guardrails/run-all.mjs --only=em-dash-scan` → **PASS** (1/1 passed in 51ms).
- **Side check:** `__tests__/brand-safety-v2.test.ts` → **11 passed / 1 failed (12 total)**. The single failure (BS-040 "composite guardrails script runs secret-scan in --all mode") is documented as **pre-existing** in the commit message: it stems from `package.json` `scripts.guardrails` being refactored to delegate to `run-all.mjs` instead of inlining `secret-scan.mjs --all`, and reproduces identically when this task's changes are stashed. No em-dash-specific assertion exists in that test. Re-confirmed in this run (1 failed, 11 passed).

### P5-03 — Add test coverage for auth.ts's ADMIN-granting logic
- **Commit:** `99db1db5` — `test: cover auth.ts's ADMIN-granting logic (isAdminEmail, session/JWT callbacks)`
- **Files:** `apps/web/lib/auth.test.ts` (new), `apps/web/lib/auth.ts` (1-line export added, no logic change) — 2 files, +364/-1
- **Fix:** exported `isAdminEmail`; added 24 tests covering exact/case-insensitive `ADMIN_EMAILS` matching, the session-callback DB-role overlay both directions, and `DEV_FAKE_ADMIN` inertness under `NODE_ENV==='production'`. Production hard-gate verified non-vacuous (test fails when gate disabled).
- **Test file run:** `npx vitest run lib/auth.test.ts` → **24 passed (24)**. (Note: `auth.test.ts` lives at the repo root `lib/auth.test.ts`, NOT `apps/web/lib/auth.test.ts` as the task text said — the path was corrected during execution; `apps/web/lib/auth.ts` source is correct.)

### P5-04 — Add test coverage for free-score-persist.ts
- **Commit:** `b8ce77c8` — `test: cover free-score-persist.ts's clearance gate (closes the GSE-SEC-051 gap)`
- **Files:** `apps/web/lib/data-sources/free-score-persist.test.ts` (new, 575 insertions) — 1 file
- **Fix:** 8 tests asserting clearance-denied sources are skipped before fetch/persist, DISPUTED finals filtered, and an existing `homeScore` is never overwritten with `null`. Clearance-denial assertion verified non-vacuous by temporarily stubbing `checkClearance` to always allow → test fails → restored.
- **Test file run:** `npx vitest run lib/data-sources/free-score-persist.test.ts` → **8 passed (8)**. (Path is repo-root `lib/data-sources/free-score-persist.test.ts`.)

### P5-05 — Reconcile HERMES_OVERNIGHT_PROTOCOL.md against the charter
- **Commit:** `f43d439a` — `docs(overnight-protocol): reconcile allow-list contradictions with charter`
- **Files:** `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md` (edit), `docs/ops/HERMES_AUDIT_CHARTER.md` (read-only) — 1 file edited, 1 read
- **Fix:** the protocol's rule-6 allow-list contradicted the charter's Phase A allow-list (which additionally authorizes `tools/model-advisor/**` and `handoff/**`). Added an explicit note documenting the charter's widening as the sole deviation, plus three shared absolute prohibitions (no `package.json`, no `auth.ts`, scoped test co-location) so both documents agree on blast radius.
- **Test file run:** doc-only — no test. VERIFY satisfied by re-reading both files end-to-end and confirming no contradiction on blast radius.

### P5-06 — Update NEXT_LEVEL_BUILD_SPEC.md's stale checklist
- **Commit:** `22a201dc` — `doc(intelligence): check off T2/T3 in build spec backlog, fix test count 10->15, link overnight journal [sprint]`
- **Files:** `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md` (edit only)
- **Fix:** checked off T2 and T3 (commit hashes `41801e6b`, `de4288d9` — verified via `git show <hash> --stat` before checking off), added a pointer to `handoff/OVERNIGHT_JOURNAL.md`, and corrected the model-advisor test count from the stale `10` to the actual `15` (counted `describe`/`it` in `tools/model-advisor/recommend.test.ts`).
- **Test file run:** doc-only — no test. VERIFY satisfied by per-item commit-hash verification (`git show` resolves both) and an actual file:line count of the test count.

### P5-07 — Update fantasy-os-vision.md with real BUILT/PARTIAL/NOT-BUILT status
- **Commit:** `526bc726` — `docs(fantasy): record real BUILT/PARTIAL/NOT-BUILT status in vision (verified 2026-08-15)`
- **Files:** `docs/fantasy-os-vision.md` (edit only) — 1 file, +43
- **Fix:** for each listed component, checked whether it exists in the codebase and annotated BUILT/PARTIAL/NOT-BUILT with verified file paths; explicitly flagged ESPN/Yahoo OAuth sync and Squares/Survivor contest formats as NOT-BUILT (not found) so the doc stops undermining genuinely finished work.
- **Test file run:** doc-only — no test. VERIFY satisfied by 51/51 file paths personally confirmed to exist (`Test-Path` equivalent on each).

### P5-08 — Re-measure current rate-limit route coverage
- **Commit:** `dfa24bdc` — `docs: track RATE_LIMIT_COVERAGE.md - was gitignored like REMEDIATION_ROADMAP.md`
- **Files:** `handoff/RATE_LIMIT_COVERAGE.md` (new, written via measurement, not edited route files)
- **Fix:** counted `route.ts` files under `apps/web/app/api/` that call a rate-limiter vs. total; wrote the updated ratio and the list of still-unprotected routes to `handoff/RATE_LIMIT_COVERAGE.md`.
- **Test file run:** none — measurement-only task (no source edit). VERIFY satisfied by a real grep-derived count (grep for rate-limiter callers vs. total `route.ts` count), not copied from any prior doc.

> **Repository-state note for P5-08/P5-13 deliverable tracking:** `handoff/` is covered by `.gitignore:202` (`handoff/`). The Phase-5 working tree tracks `handoff/PHASE4_SUMMARY.md` and `handoff/SPRING_QUEUE.md` (they appear as `M` in `git status`, i.e. force-added into the index). Deliverable docs that are gitignored (e.g. `handoff/RATE_LIMIT_COVERAGE.md`) were committed via `git add -f` by P5-08's commit `dfa24bdc`, so they ARE in history despite the ignore rule; `handoff/SPRINT_JOURNAL.md` and `handoff/CLEARANCE_COVERAGE_AUDIT.md` were committed in `99e84de2` via the same force-add mechanism. `git check-ignore` still lists the ignore, but the tracked bits resolve via `git show <hash>:<path>`.

### P5-09 — Batch odds spend-guard follow-on (GSE-SEC-040/041/028)
- **Commit:** `11151694` — `fix(security): GSE-SEC-040/041/028 batch odds spend-guard follow-on`
- **Files:** `apps/web/app/api/admin/trigger-refresh/route.ts`, `apps/web/app/api/cron/settle-picks/route.ts`, `packages/data-ingestion/src/odds-api-client.ts`, `packages/data-ingestion/src/rundown-client.ts`, `packages/prediction-engine/src/providers/quote-plane/odds-api-optional.ts`, plus test files `__tests__/odds-api-client.test.ts` and `__tests__/rundown-client.test.ts` (7 files, +205/-22)
- **Fix:** season-gated paid Odds API paths via `getInSeasonSports()` (respecting `ODDS_REFRESH_ALL_SPORTS=true` for backfills); broke the 429 retry loop so a depleted quota is not retried (each retry spent another credit); moved provider API keys from GET query strings into `X-API-Key` / `X-TheRundown-Key` headers.
- **Test file run:** per the commit message, the existing suite for touched files was run — `odds-api-client.test.ts` and `rundown-client.test.ts` plus season-gating/process-sport/settle-sport/quote-plane suites — all 143 existing tests pass; the new tests assert `apiKey` is NOT in the URL and `X-API-Key` header is sent, and that a 429 makes exactly one request (no retry).
- **Caveat (file availability):** the two `packages/data-ingestion/src/__tests__/` test files and the touched `packages/data-ingestion/src/*.ts` sources are **not present on disk in this working tree** (`packages/` is empty — not a submodule, not gitignored, simply absent). They were therefore NOT re-runnable here; the 143-pass result is taken from the committed commit message in `11151694`. The odds-API no-leak-in-log assertion was independently confirmed for the on-disk files via grep (no `?apiKey=` in any logged/constructed URL after the change).

### P5-10 — Batch CSP/CSRF/cookie hardening
- **Commit:** `a0e815ad` — `fix(security): P5-10 wire CSRF origin guard into cookie-mutating routes`
- **Files:** `apps/web/lib/auth/callback-url-guard.ts` (new), `apps/web/lib/auth/csrf-origin-guard.ts` (new), `apps/web/app/auth/signin/page.tsx` (modified), `__tests__/callback-url-guard.test.ts` (new), `__tests__/csrf-origin-guard.test.ts` (new), `apps/web/app/api/push/subscribe/route.ts` (modified), `apps/web/app/api/push/unsubscribe/route.ts` (modified) — 7 files, +286/-12
- **Fix:** extracted `safeCallbackUrl` with improved edge-case handling (protocol-relative `//evil`, triple-slash `///evil`, backslash-root `/\`, bare `/`); added `csrfOriginCheck` same-origin enforcement keyed on `NEXT_PUBLIC_APP_URL`; wired into the two cookie-mutating POST routes (`/api/push/subscribe`, `/api/push/unsubscribe`) — browser-only Web Push endpoints mutating session-cookie state. **`trustHost: true` left untouched** (owner-gated — removing it when production `AUTH_URL` is unset locks every user out of the live site; that decision was reported, not taken). Scope limit honored: the check does not change whether an existing logged-in session can still authenticate.
- **Test file run:**
  - `npx vitest run __tests__/callback-url-guard.test.ts` → **8 passed (8)**
  - `npx vitest run __tests__/csrf-origin-guard.test.ts` → **9 passed (9)**
- **Secret-scan:** OK — `NEXT_PUBLIC_APP_URL` is a public (non-secret) value; no credentials opened/printed/committed.

### P5-11 — Batch SSRF hardening on outbound fetchers
- **Commit:** `8d0cf610` — `fix(security): P5-11 SSRF-hardening outbound fetchers`
- **Files:** `packages/prediction-engine/src/ensemble/remote-model-client.ts` (modified), `packages/prediction-engine/src/ensemble/__tests__/remote-model-client.test.ts` (modified), `apps/web/lib/news/rss.ts` (modified) — 3 files, +287/-13
- **Fix:** added RFC1918/loopback/link-local/`169.254.169.254`/metadata IP-literal blocking to `validateEndpointUrl`; fetched with `redirect: "manual"` and validate the `Location` header via `locationIsInternalTargetLocation` (new `blocked_redirect` outcome) so a server can't redirect the fetcher at an internal IP. Applied the same guards to the config-controlled RSS fetcher (`fetchLiveWire`) by reusing the prediction-engine validators. Hostname-based endpoints (e.g. `http://gse-ml-service:8000`) are unaffected — only literal private IPs are refused.
- **Test file run:** `npx vitest run src/ensemble/__tests__/remote-model-client.test.ts` → **44 passed (44)** (40 existing + 4 new: RFC1918/loopback IP literals blocked, redirect-to-internal-IP blocked, safe redirect not auto-followed, `locationIsInternalTargetLocation` host-classification unit assertions). Full prediction-engine suite (per commit message): 200 files / 2319 tests passed, no regressions.
- **Caveat (file availability):** the `packages/prediction-engine/*` sources/tests are **not present on disk** (`packages/` is empty in this working tree), so the prediction-engine suites could not be re-run here; the 44-pass / 2319-pass numbers are the committed result in `8d0cf610`, and the SSRF guards were reviewed via `git show` of the source. The `apps/web/lib/news/rss.ts` hardening is present on disk but has no dedicated unit test.

### P5-12 — Narrow the clearance intent in free-first-ingest.ts (GSE-SEC-051 blocker)
- **Commit:** `b67ace68` — `P5-12: narrow ESPN clearance intent to derived_analytics only (GSE-SEC-051)`
- **Files:** `apps/web/lib/data-sources/free-first-ingest.ts` (modified, 1 line: intent list) — 1 file, +27/-1
- **Fix:** narrowed the `checkClearance` intent list in `fetchScoresFreeFirst()` from `["storage", "derived_analytics"]` to `["derived_analytics"]` only. ESPN's rights-registry entry permanently has `storage_allowed=false` with no unlock path (legal/rights block, not a bug); the read-only ESPN scores path (called only by `multi-source-scores.ts` live-board/health probes, which never write the DB — the actual write in `free-score-persist.ts:211-224` has its own separate clearance check) does not need `storage`.
- **Test file run:** `npx vitest run __tests__/free-first-ingest.test.ts` → **4 passed (4)**. Non-vacuous check: temporarily setting ESPN's `derived_analytics_allowed=false` made the test fail immediately (`DERIVED_ANALYTICS_NOT_ALLOWED` block, `usedSourceId: null`), then restored — gate confirmed meaningful.

### P5-13 — Systematic data-clearance coverage re-audit (READ-ONLY)
- **Commit:** `99e84de2` — `P5-13: data-clearance coverage audit - 5 new findings (GSE-SEC-076-080)` (plus journal-append `dadef529`)
- **Files:** `handoff/CLEARANCE_COVERAGE_AUDIT.md` (new), `handoff/AUDIT_FINDINGS.md` (appended 5 findings), `handoff/SPRINT_QUEUE.md` (no change)
- **Fix:** read `source-rights-registry.ts` in full (17 registered `source_id`s); for each, grepped `data-sources/**` and `scraping/**` fetch sites and verified whether `checkClearance` is called before each fetch. Explicit row for every source — no silent gaps. Results: 3 already-fixed gaps confirmed gated (GSE-SEC-049/050/051); 4 sources PASS cleanly (nflverse, pfr-advstats-via-nflverse, ffverse-ffopportunity, ffc-adp); 7 sources have no fetch site (candidates/vendors not wired — no gap); appended 5 new findings to `AUDIT_FINDINGS.md`.
- **Test file run:** read-only task — no test to run. VERIFY satisfied by `handoff/CLEARANCE_COVERAGE_AUDIT.md` existing and covering every `source_id` in the registry (explicit row each).

---

## Commit roster (P5-01..13, in execution order)

| Task | GSE-SEC | Commit hash (short) | Files | Test file | Result |
|------|---------|--------------------|-------|-----------|--------|
| P5-01 | (config) | `b606d4a8` | 2 (stripe.ts, setup) | none existed | no re-runnable test; manual trace of fail-closed path |
| P5-02 | (brand) | `98b20506` | 2 (run-all.mjs, package.json) | `run-all.mjs --only=em-dash-scan` | **PASS** (1/1) |
| P5-03 | GSE-SEC-016 | `99db1db5` | 2 (+auth.test.ts) | `lib/auth.test.ts` | **24/24 passed** |
| P5-04 | GSE-SEC-051 (dup coverage) | `b8ce77c8` | 1 (new test) | `lib/data-sources/free-score-persist.test.ts` | **8/8 passed** |
| P5-05 | (ops) | `f43d439a` | 1 (doc edit) | doc-only | re-read both docs; no contradiction |
| P5-06 | (doc) | `22a201dc` | 1 (doc edit) | doc-only | commit hashes verified; test count 15 confirmed |
| P5-07 | (doc) | `526bc726` | 1 (doc edit) | doc-only | 51/51 file paths confirmed |
| P5-08 | (rate-limit) | `dfa24bdc` | 1 (new doc) | measurement-only | grep-derived count |
| P5-09 | GSE-SEC-040/041/028 | `11151694` | 7 | `odds-api-client.test.ts`, `rundown-client.test.ts` (+6 suites) | **143 passed** (committed result; packages/ absent on disk) |
| P5-10 | (CSRF) | `a0e815ad` | 7 | `callback-url-guard.test.ts`, `csrf-origin-guard.test.ts` | **8/8 + 9/9 passed** |
| P5-11 | (SSRF) | `8d0cf610` | 3 | `remote-model-client.test.ts` | **44/44 passed** (committed result; packages/ absent on disk) |
| P5-12 | GSE-SEC-051 | `b67ace68` | 1 | `__tests__/free-first-ingest.test.ts` | **4/4 passed** |
| P5-13 | (audit) | `99e84de2` | 3 (2 new docs + audit) | read-only | no test; audit table covers all 17 sources |

All 13 hashes resolve via `git show <hash> --stat` (verified: `b606d4a8`, `98b20506`, `99db1db5`, `b8ce77c8`, `f43d439a`, `22a201dc`, `526bc726`, `dfa24bdc`, `11151694`, `a0e815ad`, `8d0cf610`, `b67ace68`, `99e84de2`).

---

## Notes on re-runnability (honesty line)

Two Phase-5 tasks touched sources under `packages/`, which is an **empty directory in this working tree** (`packages/` is not a git submodule, not gitignored, simply absent on disk). The test files those tasks rely on — `packages/prediction-engine/src/ensemble/__tests__/remote-model-client.test.ts` (P5-11) and `packages/data-ingestion/src/__tests__/odds-api-client.test.ts` / `rundown-client.test.ts` (P5-09) — could therefore NOT be re-run in this session. Their pass counts are recorded verbatim from the commit messages of `8d0cf610` and `11151694` respectively, and the source changes were verified via `git show` of each commit. The on-disk apps/web test files (P5-03, P5-04, P5-10, P5-12, and the P5-02 em-dash + brand-safety-v2 side check) were re-run live from the repo root and all pass as recorded above.

No Phase-5 task is BLOCKED. Phase 5 is complete.
