You are GROK, running on the founder's LOCAL machine, working the Galaxy Sports Edge repo at /home/user/Sports (adjust to your local clone path).

## CURRENT STATE
`main` is GREEN: apps/web 11526 tests passing, prediction-engine 2423 passing, tsc 0 errors, guardrails chain exit 0. Do not break this.

CLAUDE (cloud container) has GitHub MERGE AUTHORITY. You do NOT. You push branches and open PRs; Claude reviews and merges. This is not negotiable and not a formality.

CLAUDE HAS WORK IN FLIGHT. DO NOT OPEN OR EDIT THESE FILES:

Pushed, open as PR #463 (`claude/workflow-contract-tests`):
- apps/web/lib/ops/scheduler-liveness.ts
- apps/web/lib/performance/settlement-health.ts
- apps/web/__tests__/github-workflow-contract.test.ts

Uncommitted on Claude's branch right now (GSE-SEC-071, upstream error-body leak):
- apps/web/lib/pick-explainer/explain.ts
- apps/web/lib/pick-explainer/explain-error-disclosure.test.ts
- apps/web/app/api/picks/[id]/explain/route.ts

Shared, Claude is appending to it — coordinate, do not rewrite:
- handoff/REMEDIATION_EXECUTION.md (rows 47 and 48 are already corrected to FIXED)

## ALREADY MERGED TODAY — DO NOT REDO ANY OF THIS
#441 build-segfault · #445 handoff/specs · #446 ESPN limit · #447 T12 import boundary · #448 de-vig oracle + Parlay MRI · #449/#450/#457 coordination docs · #451 T11 settlement backfill · #452 age gate · #453 MoneyPuck rights · #454 calibration Clopper-Pearson · #456 calibration regression repair · #458 B2B v1 tier leak · #459 rate-limit key forgery · #460 NB2 dispersion property test · #461 clearance-gap doc · #462 per-sport dispersion estimator. (#455 was closed as superseded.)

OPEN, NOT YET MERGED: #463 sealed-control-plane contract tests — it pins two verified dead alarms (external-watchdog.yml compares schedulerLiveness.status against "ok", which is not in the union, so 30 of its 30 most recent runs failed; external-cron.yml's refresh-odds job guards on a cron literal `on.schedule` never declares, so it never fires on schedule). Both fixes are one-line, in sealed `.github/**`, and are the founder's. Do not duplicate this work.

## FILES CLAUDE OWNS — DO NOT TOUCH
- apps/web/lib/scraping/source-rights-registry.ts (EXCEPT for LANE A items 1 and 4 below, and only after you have the actual ToS text in hand)
- apps/web/lib/api/rate-limit.ts and the ~45 apps/web files calling consumeRateLimit
- apps/web/lib/ops/cron-schedule-manifest.ts, apps/web/__tests__/cron-schedule-manifest.test.ts, scripts/check-deploy-readiness.mjs

## SEALED — FLAG, NEVER FORCE
- .github/** (line edits are founder-only; the TESTS about workflows are writable but Claude owns that item)
- packages/db/prisma/schema.prisma and migrations/** — READ-ONLY. Never author or edit a migration. You may RUN existing migrations against a disposable DB.

## BLOCKED — DO NOT TOUCH
MVE (one-shot, founder-gated) · PROVEN env flags · the Stripe letter · Neon rotation · Stripe Dashboard actions of any kind (Radar rules, ToS URL) — those are OPERATOR/founder steps, not code.

## HARD RULES
1. Never push to main. PR only. Never force-push. Never self-merge.
2. Never weaken a guard, loosen an assertion, or skip/skip.if a test to get green.
3. Real exit codes only. No `|| true`, no swallowed failures, no "should pass" claims. Paste actual output.
4. No fake data, no fabricated stats. TypeScript strict — no `any`.
5. Rights are judged by the SOURCE's own Terms of Service, never by convenience or by what a doc asserts.
6. Run the affected package's suite before opening a PR (`npm run test` scoped, plus `npm run typecheck` and `npm run lint`). Claude runs the FULL cross-package suite after merge — that's his job, not yours.
7. One PR per numbered item. Small, reviewable, single-purpose. If an item balloons past its stated size, stop and say so in the PR rather than widening scope.
8. If a task needs a change to packages/types/ or any shared cross-package export, STOP and ask. Do not widen.

## NEVER STALL — READ THIS TWICE
When you finish an item: push the branch, open the PR, and IMMEDIATELY START THE NEXT ITEM. Do not wait for review. Do not wait for a merge. Do not end a run blocked on a merge. If a PR needs rebasing later, rebase it later. Every item below is independent of every other item — none of them depends on a prior merge landing. If you are ever unsure what to do next, take the next unstarted number in the list. An idle Grok run is the single most expensive failure mode in this setup.

If a task turns out to be already done, impossible, or wrong, write one paragraph saying exactly what you found and why, then move to the next number. Do not stop the run.

=====================================================================
## LANE A — ONLY YOU CAN DO THESE (local machine). DO THESE FIRST.
=====================================================================
Claude physically cannot do any of these; each was re-verified failing in the cloud container this session.

**A1. Settle the Kalshi ToS question.** [S, HIGHEST LEVERAGE]
Open Kalshi's data/API Terms of Service PDF locally — real browser, or OCR it — and read the actual clause on automated access and commercial use. Claude cannot: `curl kalshi.com/terms` returns HTTP 429 from the cloud egress, and the container has no pdftotext/pdftoppm/pdfinfo/tesseract (only the bare libpoppler134 shared library), so even a successfully fetched PDF is unreadable there.
Deliverables:
  a) A quoted excerpt of the governing clause, with the URL and retrieval date, pasted into the PR body.
  b) Register `kalshi` in apps/web/lib/scraping/source-rights-registry.ts at whatever status the REAL text supports (`permission_required` if consent is needed; do not upgrade it to make life easier).
  c) Add `checkClearance()` calls inside the two EXISTING try/catch blocks at packages/ingestion-pipeline/src/build-independent-fair-values.ts:167-192 (the KalshiClient.getFairValue call site — the soft-fail path already exists, return null on denial).
  d) Register the second, currently callerless live path too: packages/quote-plane/src/providers/kalshi-trade-api.ts.
  e) Update the BLOCKED section of docs/ops/AGENT-COORDINATION.md §3 to reflect what you actually found.
Verified before assigning you this: `grep -in kalshi apps/web/lib/scraping/source-rights-registry.ts` returns ZERO hits, so nothing is mid-flight and you will not collide.
This is the single named BLOCKED item gating a LIVE pick-confidence input.

**A2. Fix the Hermes overnight-runner stale-ledger bootstrap bug.** [S — do this early, it protects every future overnight run]
scripts/ops/hermes-runner.ps1's baked-in `$Prompt` string and docs/ops/hermes/RESUME.md STEP 0 both still point a freshly-launched agent at `handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`. AGENTS.md (updated 2026-08-20) now says of exactly those files: "They are not the live coordination system. Do not resume work from them." Both the runner and RESUME.md were last touched 2026-08-16 03:47 — before that declaration.
The trap: handoff/LEDGER.md STILL EXISTS on disk, so the runner's own preflight file-existence check passes. The launch looks perfectly healthy and silently works a superseded backlog all night. This is precisely the failure class the script's own comments warn about ("A broken launch that LOOKS healthy is worse than one that crashes", RUN-3 2026-08-13).
Fix: repoint both the `$Prompt` string and RESUME.md STEP 0 to `docs/ops/AGENT_LEDGER.md`. Then ACTUALLY LAUNCH the runner on the Windows box and confirm the agent bootstraps against the right ledger. Claude runs Linux-cloud and cannot execute a .ps1 or invoke the `hermes` binary at all.

**A3. Close gap R7 — live-DB integration smoke.** [S]
Bring up docker/docker-compose.yml's Postgres+Redis, OR use the local PG18 that the compose file's own inline comment says already occupies host port 5432. Then run:
  - `npm run test:integration:db` (scripts/integration/db-smoke.mjs)
  - a real `npm run db:migrate` against a DISPOSABLE database
Claude cannot: the `docker` binary exists in the cloud container but the daemon does not (`docker ps` → "/var/run/docker.sock: no such file or directory"). Docker-in-Docker is disabled there.
Why it matters: `test:integration:db` is wired into package.json but appears in ZERO .github/workflows/*.yml files — it has never run in CI, anywhere, since the script was written. R7 is the named gap that apps/web tests run against a stub Prisma, so enum/type round-trips, DB-enforced unique constraints, and the TOCTOU guard have no live coverage at all.
CONSTRAINTS: packages/db/prisma/schema.prisma and migrations/** are SEALED — run existing migrations only, never author or edit one. docker/docker-compose.yml is read-only. package.json's script stays unchanged.
Fix whatever real failures the smoke test surfaces (in application code or the smoke script, never by relaxing the DB constraints). Keep the local DB up — later items are easier with it running.

**A4. Establish ClubElo's live behavior and terms.** [S]
Probe `api.clubelo.com` from your local (non-cloud) network: does it require auth, what rate-limit headers come back, what does robots.txt say, is there any terms notice in the response? Then email maintainer Lars Schiefler requesting explicit terms, as docs/ops/AGENT-COORDINATION.md directs.
Claude cannot: `clubelo.com` (the marketing site) IS reachable from the cloud container (HTTP 200, 596KB), but `api.clubelo.com` — the exact host that packages/ingestion-pipeline/src/build-independent-fair-values.ts:226 calls — is not: 3/3 attempts connection-timeout or reset-by-peer, with a verbose curl trace showing the proxy CONNECT tunnel reaching "200 Connection Established" while the origin TLS handshake never completes. The API subdomain specifically blocks that egress range.
Verified: zero api.clubelo.com entries exist in the registry today. Register it only per what you actually observe and what the maintainer actually replies. Same live pick-confidence exposure as Kalshi.

**A5. Run the Playwright journey suite to green.** [M]
Run apps/web/e2e/{smoke,journey-anonymous,journey-auth,journey-checkout}.spec.ts end-to-end against your local dev server and fix the real failures. Prioritize journey-anonymous.spec.ts — its entire purpose is proving premium picks and confidence scores never reach an unauthenticated browser, i.e. CLAUDE.md Non-Negotiable Rule 3, "No frontend-only paywalls."
To be precise about why this is yours: Chromium DOWNLOADS fine in the cloud container (~90s, not blocked). What fails is running it — two attempts (100s, then 240s) never got past webServer boot; mid-hang, next-server alone had consumed 8m18s of CPU and 6.3GB RSS on a shared 4-vCPU/15GB box with no browser process even spawned. Separately, `grep -rl "playwright|e2e" .github/workflows/` returns nothing — this suite is not in CI and, on repo evidence, has never been run to green anywhere. Your box has a warm .next cache and dedicated hardware.
If a test fails because the APP is wrong, fix the app. If it fails because the TEST is wrong, fix the test — but never by deleting the paywall assertion.

=====================================================================
## LANE B — PARALLEL-SAFE QUEUE. Work top to bottom after Lane A.
=====================================================================
Every item is a new file or an isolated test file. Verified zero collision with Claude's queue.

**B1. [CONFIRMED LIVE BUG — fix first] apps/web/__tests__/dashboard-load-performance.test.ts**
`mockDb()` dispatches count() results by positional index (`keys[idx++]`). The `keys` array has EIGHT entries and is missing `canonicalVoids`. But apps/web/lib/dashboard/load-performance.ts:95-118 issues NINE `db.pick.count()` calls, in this order: canonicalSettled, WIN, LOSS, PUSH, **VOID**, PENDING, bootstrapSettled, recentTotal, recentBootstrap.
Result RIGHT NOW: `canonicalPending` receives the VOID call's value, `bootstrapSettled` receives PENDING's, `recentTotal` receives bootstrapSettled's, `recentBootstrap` receives recentTotal's, and the 9th lookup runs off the end of the array and returns 0. It is green today only because no assertion in the file reads bootstrapSettledCount / recentTotalCount / recentBootstrapCount.
This is the SAME bug shape as the #454/#456 VOID-count shift already documented as a caught-in-prod lesson — it recurred here undetected, in the loader that computes the customer-facing dashboard win-rate.
Fix: rewrite `mockDb` to branch on the actual `where` clause content instead of call order — the `jarvisMemoryEvent` mock in apps/web/__tests__/jarvis-memory-write-gate.test.ts is the house pattern to copy. Add the missing canonicalVoids case. Then ADD assertions covering bootstrapSettledCount, recentTotalCount, and recentBootstrapCount so the fix is provably load-bearing. apps/web/lib/dashboard/load-performance.ts is READ-ONLY for this item.

**B2. [S] NEW packages/prediction-engine/src/honesty/__tests__/placebo-leak.test.ts**
The honesty/ directory has NO __tests__ subdirectory at all — zero coverage. placebo-leak.ts's own docstring documents a prior defect where the leakage gate was mathematically INVERTED: it shuffled a bare number[] and took mean(|CLV|), both permutation-invariant, so real edge FAILED the gate and zero edge PASSED. The rewrite asserts properties nothing verifies. Test all of them:
  (1) bare `number[]` input is rejected fail-closed; (2) n < 20 fails closed; (3) zero-variance modelSignal fails closed with `degenerate_signal`; (4) a genuine label permutation collapses the demeaned association to ~0 and passes; (5) unscrambled structure that survives the scramble fails; (6) `mulberry32` is deterministic for a given seed.

**B3. [S] NEW packages/prediction-engine/src/guards/__tests__/display-substantiated.test.ts**
This is the enforcement point for Non-Negotiable Rule #2 ("no fabricated stats") — it gates every public win-rate/ROI/CLV/confidence number — and it has zero tests. Its own docstring instructs: "Coding agent: wire into Board / Intelligence / marketing / API paths; add tests; do not weaken the required fields."
Cover each of the 6 independent failing branches of isDisplaySubstantiated/assertDisplaySubstantiated: n<1; non-finite LCB; boundLevel outside [0.8, 1]; missing boundMethod; missing provenanceId or walkForwardProtocol; missing CLV for claimTypes that require it; LCB exceeding the observed rate. Plus displayIfSubstantiated returning null vs the value, and wilsonLowerBound against textbook reference values (e.g. n=100, successes=55) including its n<=0 guard. DO NOT weaken any required field to make a test pass.

**B4. [M] NEW packages/prediction-engine/src/nfl/margin-mixture-model.ts + __tests__/margin-mixture-model.test.ts**
Build the NFL margin mixture model, FIRST-PARTY (no ported or copied implementation): a continuous Stern-normal component for the game-margin distribution mixed with discrete point masses at the classic key numbers 3, 7, 6, and 10, fit/calibrated against settled NFL TeamGameLog margins, exposed as a spread/cover-probability estimator alongside the existing kelly/eprocess siblings.
Verified greenfield: packages/prediction-engine/src/nfl/ contains expected-completion, expected-yac, metric-birth-certificate, metric-core, metric-drift, metric-validation, qb-burden, receiver-difficulty, role-volatility, rush-environment — no margin, spread, key-number, or Stern module exists anywhere in the repo.
Read TeamGameLog through the existing prediction-engine data-access pattern (the same shape estimate-phi.ts uses). NO schema changes. Include property/unit tests: the mixture integrates to 1, key-number masses are strictly positive and correctly placed, cover probability is monotone in the spread, and degenerate inputs are handled.

**B5. [S] NEW packages/prediction-engine/src/honesty/__tests__/no-bet-gate.test.ts and glass-receipts.test.ts**
no-bet-gate.ts (`evaluateProductNoBet`, the refuse-default board/logging gate): each of the 9 ProductNoBetCodes fires independently AND in combination, codes de-duplicate via the Set, and `edge = pLo - q` is computed and reported correctly on both PLAY and NO_BET.
glass-receipts.ts (audit chain): fingerprintPayload determinism; buildReceipt/chainReceipts link prevFingerprint correctly; recomputeChain detects a tampered receipt by flipping `ok` to false; ledgerHead's settled-floor gating of winRatePublic/winRate. Two separate PRs is fine here.

**B6. [S] NEW apps/web/lib/api-v1/__tests__/payload-filter.test.ts and apps/web/lib/api/v1/__tests__/payload-rights.test.ts**
Same failure class as the just-merged #458 tier leak, one layer over — #458 fixed the route handlers, not this filter layer. Enumerate the FableUseStatus (allowed / conditional / unknown / blocked) × ApiV1PayloadUse (commercial_display, public_display, derived_feature, raw_storage, partner_sharing) matrix: correct blocker message and `allowed` flag per cell; an unknown sourceId fails CLOSED; `includesRawVendorPayload` with a non-'allowed' storage_status adds its own blocker.

**B7. [M] e-process + robust-Kelly citation-naming and property tests**
MASTER-HANDOFF.md:292-293 scopes this exactly: "e-process, robust-Kelly, calibration-selection check out vs the canon; needs citation-naming + property tests, not a rebuild." Two halves:
  (a) COMMENTS ONLY, zero logic change, in packages/prediction-engine/src/{robust-kelly,forecast-skill-eprocess,bernoulli-eprocess,instrumented-eprocess,kelly}.ts — replace internal-only references like "research spec Part XI" with real academic citations for the techniques actually implemented: Ville's inequality / anytime-valid e-processes (Ramdas, Waudby-Smith testing-by-betting literature); Knightian-uncertainty robust Kelly via a Beta credible-set worst case. Cite what the code does, not what sounds impressive.
  (b) NEW packages/prediction-engine/src/__tests__/robust-kelly-property.test.ts and eprocess-property.test.ts using fast-check. Verified zero fast-check coverage exists today across robust-kelly.test.ts, kelly.test.ts, bernoulli-eprocess.test.ts, forecast-skill-eprocess.test.ts, instrumented-eprocess.test.ts, edge-lab/kelly.test.ts. Mirror the house pattern in packages/prediction-engine/src/__tests__/calibration-property.test.ts — fast-check plus a documented FUZZ config with numRuns and interruptAfterTimeLimit.

**B8. [M] NEW tests under packages/prediction-engine/src/gse-score/__tests__/ for calibration-contract.ts, calibration-action-policy.ts, feature-contract.ts**
(The __tests__ dir exists but none of these three are covered.)
  - assessCalibrationContract: every status transition — INSUFFICIENT_SAMPLE, BLOCKED on missing ECE, DRIFTING, WATCH on ECE-over-max, WATCH on Brier-worse-than-baseline, VALIDATED — and that probabilityClaimsAllowed tracks status correctly.
  - calibrationActionCap / calibrationRequiresHardPass / calibrationRiskSeverity: the full status→value mapping table, INCLUDING that the assertNever default branch actually throws on an invalid status.
  - evaluateFeatureContract: missing-required / stale / blocked-source penalties compose ADDITIVELY into featureHealth; the OK/WARN/BLOCK thresholds; and that staleRequired is exactly the intersection of stale and required.

**B9. [M] NEW tests under packages/prediction-engine/src/metrics/core/__tests__/ for metric-graduation.ts, payload-rights.ts, source-rights-registry-adapter.ts, payload-envelope.ts, metric-asset.ts**
This is the rights-enforcement layer for the platform's OWN derived metrics — structurally analogous to the scraping Clearance Engine, currently unverified end to end.
  - evaluateMetricGraduation: all 8 MetricGraduationStatus outcomes — BLOCKED_SOURCE_RIGHTS, BLOCKED_SAMPLE, BLOCKED_MODEL_CARD, BLOCKED_VALIDATION, BLOCKED_DRIFT, the SHADOW-status API block, REVIEW_READY, APPROVED_FOR_CONTENT, APPROVED_FOR_API.
  - evaluateMetricPayloadRights: per-field exposure-rank blocking; the PROTECTED_WEIGHT / RAW_SOURCE_VALUE / UNSUPPORTED_PROBABILITY_CLAIM field-kind rules; requiredAttribution is deduped.
  - metricSourceRightsPolicyFromRegistryEntry: each of the ~9 MetricSourceRightsStatus values maps to the correct permission booleans — especially that every non-approved status zeroes out EVERY permission.
Split into 2-3 PRs if it runs long.

**B10. [S] apps/web/lib/compliance-scanner/rules.ts + NEW apps/web/__tests__/compliance-scanner-payments-surfaces.test.ts**
MASTER-HANDOFF item #12. The compliance scanner today is wired ONLY to Studio-generated creator content (bot-outbox/plan.ts, journal/compliance.ts, studio/build-assets.ts) — it never touches the real app routes. Add a new rule layer (e.g. `PAYMENTS_SURFACE_RULES` or `LAYER_4_PAYMENTS_UNDERWRITING`) that scans the copy on apps/web/app/{pricing,clv,methodology,dashboard} for gambling/betting-coded vocabulary that could read as underwriting risk to a payment processor.
Severity must be 'warn'/'flag' — NEVER 'block'. This must not change existing behavior or fail any current build. Add the test that runs the new rules against those four pages' copy.

**B11. [S] NEW apps/web/lib/ops/__tests__/compute-live-calibration-metrics.test.ts**
picksToCalibrationSamples and buildDurableMetricsFromSamples feed the publicly documented calibration/track-record surface named in the CLAUDE.md tier table. Verify: empty samples returns status "collecting" with n=0 and NO invented `overall`; a mixed set of modelVersions collapses to the `mixed:v1,v2,...` label and caps at 4 in the joined string; a single modelVersion passes through unchanged; dateRange formats correctly from settledFrom/settledTo including the null case; and overall.mce equals a hand-computed max-absolute-deviation over a small synthetic reliability curve.
NOTE: apps/web/lib/ops/compute-live-calibration-metrics.ts is READ-ONLY for you, and do NOT touch apps/web/lib/ops/scheduler-liveness.ts in that same directory — it is in Claude's open PR #463.

**B12. [S] NEW packages/prediction-engine/src/__tests__/tweedie-aci.test.ts and log-loss-optimize.test.ts**
adaptiveConformalIntervals: per-position state is independent; the finite-sample `quantile` ceil((n+1)*p) correction the source comments describe; alpha adapts toward target coverage on repeated misses/hits and stays clamped to [0.02, 0.5]; `lower` is clamped at 0.
log-loss-optimize: fitTemperatureNewton's refine step is accepted only when NLL actually improves; degenerate-label input returns null; holdoutLogLoss's chronological train/test split respects trainFrac. Also meanLogLossAtTemperature / temperatureLogLossGradient / diagnoseLogLoss.
Lower urgency — this file's own docstring notes it does NOT wire into live scoring.

**B13. [S, filler] apps/web/__tests__/council-ledgers.test.ts (~lines 584-587)**
The chained `db.subagentRun.count` `.mockResolvedValueOnce(12) // total` / `.mockResolvedValueOnce(3) // pending_review` sequence is correct today ONLY because it happens to match the two-call Promise.all order at apps/web/lib/jarvis/ledger-types.ts:145-151. Inserting a third count() between them would silently shift the values — the exact pattern that already produced the live bug in B1. Switch to argument-matching: branch on whether `where.parent_review_status` is present. apps/web/lib/jarvis/ledger-types.ts is READ-ONLY. Preventive hardening only, nothing is currently wrong.

=====================================================================
## PR FORMAT
Branch: `grok/<short-slug>`. One item per PR. PR body must contain:
- What changed and WHY (link the item number).
- Actual pasted output of the scoped test run, typecheck, and lint — real exit codes, not a summary.
- Anything you touched that was not in the item's stated file list, and why.
- For A1/A4: the quoted ToS/terms text, source URL, and retrieval date.

Then open the next item immediately. Do not wait for review.
