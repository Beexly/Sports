# MULTIPLE-SOLUTIONS MATRIX — every outstanding item, ≥2 real paths each
# Per owner directive: loop until multiple concrete solutions exist for each blocker.
# All items traced to repo code (green) or named external path (verified). No fabrication.

## ITEM A — R33: replace synthetic YACoe with real NGS rows
BLOCKER FOUND EARLIER: target file `edge-lab/yacoe-backtest.ts` did not exist.
RESOLUTION: file now created + 6/6 tests green + typecheck 0 errors. DONE (commit pending).
ALTERNATIVE PATHS (if the above had failed):
  A2. Wire directly through `expected-yac.ts::computeYacOverExpected` (exists) as the YACoe source — skip a new file, feed expected-yac output into the modelProb aggregation. Lower surface area, reuses validated code.
  A3. Use `nflverse-ngs.ts::ngsReceivingToSeparationTruth` as the truth anchor and derive YACoe from separation→YAC correlation (the file's documented intent), rather than avgExpectedYac. Avoids depending on NGS proprietary expected column.

## ITEM B — R34: wire TPR smoothed-success
RESOLUTION: implemented in same `yacoe-backtest.ts` (computeTpr, Beta-binomial EB, pre-registered TPR_TAU). 6/6 green.
ALTERNATIVE PATHS:
  B2. Reuse `logit-pool.ts`/`calibration-blend.ts` smoothing primitives for TPR instead of a standalone Beta-binomial — single shrinkage codebase, but mixes market-bearing modules (must keep priced:false).
  B3. Derive TPR from `expected-yac.ts` receiver catch-rate (catches/targets) post-fit — i.e. success = catch, smoothed by the same ridge fit, no NGS dependency at all (pure pbp). Most independent, but loses NGS target-share signal.

## ITEM C — Pre-registration doc (τ, min n, modelVersion, exclusion) — founder signature
SOLUTIONS (I draft, do NOT sign):
  C1. Draft inline in `docs/edge/MODELPROB_PREREGISTRATION.md` with frozen fields: τ=50 (YACOE_TAU), TPR_TAU=80, MIN_CATCHES=30, modelVersion `independent_modelProb_aggregation_v1`, exclusion = {confidence/100, scoring.ts, calibration-apply, price data}. Founder one-look.
  C2. Encode the frozen values as exported consts in `yacoe-backtest.ts` (already done: YACOE_TAU/TPR_TAU/MIN_CATCHES) so the doc is a pointer, not a separate source of truth — prevents post-hoc tuning drift.
  C3. Add a `prereg.test.ts` asserting the consts equal the doc's frozen values (immutability guard). (Recommended — makes "never tuned post-hoc" enforceable.)

## ITEM D — §2 archival (all 7 sports settle+archive; soccer cards/bookings; CLV backfill)
BLOCKER: no live runner/keys in this static session; "run all night" loop lives in the executing runner.
SOLUTIONS (for the runner to execute, all code-confirmed present):
  D1. HistoricalGame/TeamGameLog: scores flow via `multi-source-scores.ts` (cleared). Settlement loop in `packages/ingestion-pipeline/src/settle-sport.ts` + `process-sport.ts` — run for all 7 sports, not just picked.
  D2. Soccer cards/bookings: extend ESPN soccer results path (cleared per doc 2) — add per-game cards/bookings capture in the soccer ingestion module (file to create: `packages/ingestion-pipeline/src/soccer-cards-archive.ts`). Facts-only, same clearance.
  D3. CLV backfill: `pinnacle-line-archive.ts` already implemented; `LINE_ARCHIVE_ENABLED` dark (founder flips). On flip, replay `captureLineSnapshots` over Odds API /v4/historical (licensed). If plan tier insufficient → record as founder-cost decision (don't guess).
  D4. Row-count report: emit `docs/ops/hermes/2026-08-27-ARCHIVE-COUNTS.md` from the runner after each sport — sample sizes moved, gaps open.

## ITEM E — Legal/rights calls I cannot make (flag, don't guess)
SOLUTIONS:
  E1. Sportradar/SkillCorner/PFF → proposed registry entries written (`2026-08-27-proposed-registry.md`), status PROPOSED, NOT added to `source-rights-registry.ts`, NOT automated. Founder/legal approves.
  E2. checkClearance() gate: any new source must pass `apps/web/lib/scraping/source-rights-registry.ts::checkClearance()` before automation — code already enforces; I respect it by not automating proposed sources.
  E3. PR #675 merge (settlement identity fix, doc 2 rank 1) — founder merges; every settlement-green claim depends on it. I do not merge to main.
  E4. LINE_ARCHIVE_ENABLED flip — founder env fix; I do not touch .env (doc 1 §5).

## ITEM F — Research coverage gaps (continue sweep until dense)
SOLUTIONS (next batches if loop continues):
  F1. Soccer xT (expected Threat) — public method (Karun Singh); port as GSE-xT (our fit on event data). [batch 4]
  F2. NBA EPV-lite without tracking — proxy EPV from pbp (shot clock, paint touches) avoiding Sportradar-gated 25Hz. [batch 4]
  F3. Conformal prediction variants (split/Jackknife+/aggregated) — M11 extension; pick one for modelProb UQ. [batch 4]
  F4. Cricket/rugby if GSE board extends — Dixon-Coles generalized (M7) already covers low-scoring; add sport-specific. [batch 5]

## ITEM G — "R33 target missing" was a false blocker (lesson)
The design doc named a file that didn't exist. Rather than stop, I CREATED it using the two legal inputs already present (`expected-yac.ts`, `nflverse-ngs.ts`). This converts a "blocked" into a "done". Lesson logged: when a target file is absent, check whether its inputs exist and implement it — do not treat missing file as terminal.

---
STATUS: A DONE (commit pending). B DONE. C drafted (consts done, doc optional). D→runner. E flagged. F/G ongoing.
Looping continues: next = commit A+B, draft C doc, write batch 4 research, push.
