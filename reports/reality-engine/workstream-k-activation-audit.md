# Workstream K — Reality Engine Activation Audit (MASTER)

**Date:** 2026-06-18 · **By:** Claude (Opus 4.8) · **Scope:** measurement-first truth
audit of the existing win-rate / edge machinery.
**Status:** DOCS ONLY. No code, schema, dependency, or gate was changed. Every code
claim below was verified by opening the named file this session.
**Method:** read the engine source (`packages/prediction-engine/src/*`), the live
scoring/worker path, the Prisma schema, the readiness gates, and the doctrine docs.
Classifications are assigned against one question: *does this piece move a real
decision today, and if not, exactly what unblocks it?*

---

## The #1 finding (read this first)

**The win-rate pillar is not blocked by missing engines. It is blocked by a missing
sample, behind a single owner-controlled flag.**

Everything needed to *learn* a calibrated win probability is already built and
unit-tested: isotonic/PAVA calibration, ECE/Brier, the reliability curve, the
self-suppressing calibrator, the conviction tier, the edge engine, CLV grading, and
the edge-significance test. None of them can produce a real number yet, because the
data they consume does not exist in sufficient quantity.

The gate that opens the tap is `OUTCOME_LEARNING_ENABLED` (default `false`,
`platform-config.ts:186`; surfaced as `canLearnFromOutcomes` in `readiness.ts:141`).
While it is off, settlement does **not** mark settled canonical picks
`eligibleForLearning=true`, so no calibration sample accrues. The only sample
referenced anywhere in code is the 16-pick figure noted honestly in
`conviction-tier.ts:170` ("the 70–79% bucket currently wins 0% on a 16-pick
sample"). The activation floor is `MIN_SETTLED_PICKS_FOR_LEARNING = 100`
(`platform-config.ts:187`). That is roughly **84 more canonical, decisive,
learning-eligible picks** before any of the learned engines can switch from inert to
real.

**The single owner unlock** is therefore a sequenced, two-part action — not a code
change:

1. Attach `THE_ODDS_API_KEY` so the 30-minute data-refresh runner
   (`workers/data-refresh/src/index.ts:31-35`, which *throws* without the key) keeps
   accruing real picks; and
2. After `PERFORMANCE_STATS_ENABLED` is on and a real record exists, set
   `OUTCOME_LEARNING_ENABLED=true` so settlement begins stamping
   `eligibleForLearning=true` (`settle-sport.ts`, gated on `canLearnFromOutcomes`).

Then wait for ~84 more canonical picks to settle. **No engine substitutes for this
wait.** Calibration, the conviction tier, and edge-type reliability are all
data-starved, not code-starved. Activating any *learned* surface before the sample
exists would be fabricating a number — the exact thing the platform's guardrails
exist to prevent.

A subtle but important second-order point: `CALIBRATION_ADJUSTMENTS_ENABLED`
(the flag that actually feeds a calibrated probability into a decision) is a
*separate, later* gate. Even with 100 settled picks, flipping it requires a
held-out validation that `calibratedEce ≤ rawEce` out-of-sample plus a
`MODEL_VERSION` bump with a `CalibrationProposal` audit row
(`platform-config.ts:116-130`, `docs/path-to-70.md §7`). Sample first, then learning
flag, then — only after audited validation — the adjustment flag.

---

## Classification table — every piece

Each row is tagged with exactly one status from the agreed vocabulary. "Today" means
the live `scoreGame` path + the public surfaces as they ship now.

| Piece | Status |
|---|---|
| De-vig (Shin + goto + consensus no-vig) | **wired-active** |
| Confidence scorer (weighted-sum, tiering) | **wired-active** |
| No-bet gate (`MIN_PUBLISH_CONFIDENCE`) | **wired-active** (but unlogged → see below) |
| CLV grading + persistence | **wired-but-shallow** |
| Independent edge engine (`assessEdge`) | **weight-zero** |
| Conviction tier + confidence bands | **implemented-inert** |
| Probability calibration toolkit | **implemented-inert** + **requires-more-data** |
| Calibrator application (`buildCalibrator`) | **implemented-inert** + **requires-more-data** + **requires-tests** (held-out) |
| Edge significance (Monte-Carlo null) | **implemented-inert** + **requires-more-data** |
| Market Gravity Index (`marketGravityIndex`) | **implemented-inert** (exported/read-only, not persisted) |
| Market Gravity (temporal, doctrine) | **doctrine-only** + **requires-schema-approval** |
| Player usage / tracking ingestion → scorer | **requires-source/legal-approval** + **requires-schema-wiring** |
| Line-movement event time-series | **requires-schema-approval** |
| Signal Ledger | **doctrine-only** + **requires-schema-approval** |
| No-bet ledger | **requires-schema-approval** |

---

## Per-piece detail

### 1. De-vig — `shin-devig.ts` + `market-read.ts` · **wired-active**
- **What it does:** turns posted American prices into fair, vig-free outcome
  probabilities. `shinDevig` solves Shin's `z` by bisection; `gotoConversion` is the
  closed-form alternative; `noVigFromAmericanPrices` de-vigs one book;
  `consensusNoVig` de-vigs each book independently, takes the per-outcome median,
  renormalizes, and reports `homeProbDispersion` (MAD across books). In the live path
  the scorer uses the simpler `removeVig` (`scoring.ts:39`) on averaged implied probs.
- **Data consumed:** multi-book American odds (`Odds.homePrice/awayPrice/spread/
  total` prices), per market.
- **Data NOT captured:** nothing missing for the basic read; the *richer* consensus
  read (`consensusNoVig` median + dispersion) is computed only in the web read helper
  `apps/web/lib/market/game-market-read.ts`, not inside `scoreGame`.
- **Decision it affects:** the fair probability that the edge component and the ML
  selection threshold (`fairProb < 0.58`) are measured against. The baseline of
  everything.
- **Affects published picks today?** Yes (via `removeVig`). **No-bet today?** Yes
  (a thin/inconsistent market changes the fair prob and can fail the consensus floor).
  **CLV today?** Indirectly (the close is de-vigged the same way). **Calibration
  today?** No.
- **Next improvement:** route the live scorer through `consensusNoVig` (median +
  Shin) instead of `removeVig`-on-averages, so the published fair prob is robust to a
  single stale book. This is a scoring change → MODEL_VERSION bump territory.
- **Test that proves it:** `__tests__/shin-devig.test.ts`, `__tests__/market-read.test.ts`.
- **What could go wrong:** sub-vig (crossed/stale/mixed-format) books manufacture
  spurious positive edge — already guarded in `computeEdgeScore` (`twoSidedImpliedSum
  < 1 && rawEdge > 0 → 0`) and in `assessEdge` (`marketConsistent`).
- **Rollback:** n/a (already live; a consensus-read swap would roll back by reverting
  the MODEL_VERSION bump).

### 2. Confidence scorer — `scoring.ts` + `constants.ts` · **wired-active**
- **What it does:** confidence = clamped weighted sum of: consensus (0–30), market
  depth (0–20), pricing edge (0–25), volatility penalty (−15..0), line movement
  (±15), rest (±10 via context), form (±10), data-quality penalty, H2H (±5), venue
  (±5), uncertainty (−8), cross-market (+4/−3), schedule stress (±5), plus a flat +10
  baseline (`scoring.ts:532-540`, `718-724`, `889-896`; weights in `constants.ts:23-66`).
  `confidence ≥ 70 → PREMIUM`, else `FREE`.
- **Data consumed:** odds, derived game context, opening lines.
- **Data NOT captured:** none of the player/injury/weather/referee signals; the
  confidence is a hand-tuned additive heuristic, **not** a calibrated win probability
  (stated plainly in `conviction-tier.ts` and `calibration-apply.ts` headers).
- **Decision it affects:** the published confidence number, the FREE/PREMIUM tier,
  the pick grade, and ranking.
- **Affects published picks today?** Yes. **No-bet today?** Yes (`< 50 → null`).
  **CLV today?** No. **Calibration today?** No (it is the *input* a future calibrator
  would map, not a calibrated output).
- **Next improvement:** wrap the published confidence through `buildCalibrator` — but
  only after the sample + audit (see #8). Until then the honest move is the current
  `CONFIDENCE_DISPLAY_MODE` posture.
- **Test that proves it:** `__tests__/scoring.test.ts`, `__tests__/composite-score.test.ts`.
- **What could go wrong:** presenting the raw 0–100 as a win probability. Guarded by
  trust-claims / `check-claims` and the `confidenceDisplayMode` gate.
- **Rollback:** frozen at `MODEL_VERSION v5.0.0` (`FROZEN.md`); any change trips
  `model-freeze.mjs`.

### 3. No-bet gate — `scoring.ts` `MIN_PUBLISH_CONFIDENCE = 50` · **wired-active (unlogged)**
- **What it does:** at three sites (`scoring.ts:542`, `726`, `898`) a sub-50
  confidence yields a silent `return null` — the market is dropped. The consensus
  floor (`CONSENSUS_MIN_PCT 0.55`) and the ML `fairProb < 0.58` check are additional
  silent drops earlier in each scorer.
- **Data consumed:** the computed confidence / consensus / fair prob.
- **Data NOT captured:** **the rejection itself.** There is no row, no reason, no
  count of markets that were considered and dropped. This is survivorship bias: we
  can audit what we published, never what we declined.
- **Decision it affects:** which markets become picks at all.
- **Affects published picks today?** Yes (it removes the bottom). **No-bet today?**
  Yes — it *is* the no-bet decision, but invisibly. **CLV today?** No. **Calibration
  today?** No (and it silently biases any future calibration sample toward the
  surviving high-confidence picks).
- **Next improvement:** a No-Bet Ledger (see `data-capture-gap-matrix.md`) — one row
  per (game, market) considered, with the reason it was dropped. This is the single
  highest-leverage *measurement* gap, because without it "no-bet quality" can never
  be scored.
- **Test that proves it:** a future `no-bet-ledger.test.ts` asserting every
  `return null` path emits exactly one ledger row with a reason code; today the drops
  are covered only implicitly by `scoring.test.ts`.
- **What could go wrong:** the ledger must never leak declined picks to public
  surfaces (they are unvalidated).
- **Rollback:** ledger is additive write-only; drop the table.

### 4. CLV — `clv.ts` + `clv-capture.ts` + Pick schema · **wired-but-shallow**
- **What it does:** `computeSpread/Total/MoneylineClv` + `summarizeClv` are pure
  primitives; `deriveClosingSnapshotFromOdds` reconstructs the close as the last odds
  batch at/before kickoff; `gradePickClv` compares the locked line/price to that
  close. Persisted on `Pick`: `clvLockLine/clvLockPrice` (bet-time),
  `clvCloseLine/clvClosePrice` (close), `clvValue`, `clvVerdict`, `clvCapturedAt`,
  `clvGradedAt` (`schema.prisma:385-393`).
- **Data consumed:** the immutable lock-time line/price, and the timestamped `Odds`
  history before `commenceTime`.
- **Data NOT captured:** the close is *derived* from the last pre-kickoff snapshot,
  not a vendor "closing line" marker — accuracy depends on how close to kickoff the
  last refresh landed. There is no per-snapshot line-movement event series to audit
  *how* the line got there.
- **Decision it affects:** **none today.** CLV is measured and stored, but it does
  not feed selection, confidence, or tier. It is evidence for a future conviction tier
  and a future public proof surface.
- **Affects published picks today?** No. **No-bet today?** No. **CLV today?** It *is*
  the CLV measurement (wired). **Calibration today?** No (the conviction tier that
  would consume `clvBeatCloseRate` is inert).
- **Next improvement:** capture a true closing snapshot via a kickoff-aligned final
  refresh, and surface aggregate CLV on the operator cockpit (not public until the
  readiness gate allows).
- **Test that proves it:** `__tests__/clv.test.ts`, `__tests__/clv-capture.test.ts`.
- **What could go wrong:** grading CLV against a stale "close" that is hours old reads
  as a beat/loss that the market never offered. Mitigated by `capturedAt` and the
  null-return when no pre-kickoff odds exist.
- **Rollback:** stop writing the `clv*` fields; they are nullable.

### 5. Edge engine — `edge-engine.ts` (`assessEdge`) · **weight-zero**
- **What it does:** the only piece that compares an *independent* estimate (Poisson,
  Kalshi exchange) to the de-vigged market and refuses to manufacture edge from the
  market's own price. Decisions `SPEAK (≥0.025)` / `LEAN (≥0.012)` / `PASS`;
  agreement `CONFIRMS / SPLIT / SOLO / CONTRADICTS / NONE`; `expectedClv = shrunkEdge`.
- **Data consumed:** `marketFairProb` from the de-vig + any
  `context.independentFairValues` threaded in.
- **Data NOT captured:** in practice, the independent estimators — the live path
  passes `independentFairValues` only when present, which today is rarely/never
  populated, so most markets hit the honest `independents.length === 0 → PASS`.
- **Decision it affects:** **nothing priced.** Surfaced in moneyline scoring at
  `weight: 0`, `priced: false` (`scoring.ts:856-877`, `941-946`) — it appears in the
  glass-box factor trail and the reasoning string, but contributes 0 to confidence.
- **Affects published picks today?** Only as displayed prose, never as a number.
  **No-bet today?** No. **CLV today?** No (its `expectedClv` is not graded against
  realized CLV). **Calibration today?** No.
- **Next improvement:** wire a real independent estimator feed (Poisson is already
  built in `poisson.ts`; Kalshi requires a source decision), then — separately — give
  the edge a non-zero weight via a MODEL_VERSION bump.
- **Test that proves it:** `__tests__/edge-engine.test.ts`,
  `__tests__/scoring-independent-edge.test.ts` (asserts the scorer is byte-identical
  with vs without the independent edge present).
- **What could go wrong:** pricing in an unvalidated edge weight is a scoring change
  that re-labels history. Guarded by `model-freeze` + FROZEN.md.
- **Rollback:** the weight-zero surfacing is already the safe state; activation rolls
  back by reverting the version bump.

### 6. Conviction tier + bands — `conviction-tier.ts` · **implemented-inert**
- **What it does:** `convictionTier` certifies a CONVICTION pick only when ALL hold:
  calibrated prob ≥ max(0.65, price-specific break-even), edge = SPEAK, CLV beat-rate
  ≥ 0.5 over ≥ 20 graded picks. `confidenceBand` partitions 0–100 into
  SIGNAL/EDGE/SHARP/APEX for *access control only* (explicitly uncalibrated,
  infra-only).
- **Data consumed:** a *calibrated* probability, an edge decision, a CLV beat-rate +
  sample size, the price.
- **Data NOT captured:** all three inputs are downstream of blocked engines — there
  is no calibrated probability (calibration inert), and CLV beat-rate by segment is
  not aggregated anywhere live.
- **Decision it affects:** **none.** No live path calls `convictionTier`
  (confirmed: not imported by `scoring.ts`).
- **Affects published picks today?** No. **No-bet today?** No. **CLV today?** No.
  **Calibration today?** No.
- **Next improvement:** see `inert-code-and-weight-zero-map.md` — it activates only
  after calibration is real and a 20+ CLV sample per segment exists.
- **Test that proves it:** `__tests__/conviction-tier.test.ts` (the honesty guards:
  out-of-range prob → PASS, n=1 CLV → PASS, price-specific break-even).
- **What could go wrong:** passing the raw 0–100 confidence as the "calibrated"
  probability — guarded by the `[0,1]` range rejection.
- **Rollback:** never wired; nothing to roll back.

### 7. Probability calibration toolkit — `probability-calibration.ts` · **implemented-inert + requires-more-data**
- **What it does:** isotonic/PAVA mapping, Brier + Murphy decomposition, ECE,
  reliability curve. Pure math, fully tested.
- **Data consumed:** `(forecastProbability, binaryOutcome)` samples from settled,
  canonical, learning-eligible picks.
- **Data NOT captured:** the samples themselves — `eligibleForLearning` is only set
  when `OUTCOME_LEARNING_ENABLED` is on; today the sample is ~16.
- **Decision it affects:** none.
- **Affects published / no-bet / CLV / calibration today?** No to all four.
- **Next improvement:** nothing to *build* — wait for the sample.
- **Test:** `__tests__/probability-calibration.test.ts`.
- **What could go wrong:** fitting on <100 samples and trusting it; guarded by #8.
- **Rollback:** never wired.

### 8. Calibrator application — `calibration-apply.ts` (`buildCalibrator`) · **implemented-inert + requires-more-data + requires-tests**
- **What it does:** fits an isotonic map and marks it active ONLY when
  `sampleSize ≥ minSample (100)` AND `calibratedEce ≤ rawEce`. Otherwise it is a
  labeled identity passthrough (`calibrated: false`). This is the self-gating
  safety mechanism.
- **Data consumed:** the same settled learning-eligible sample.
- **Data NOT captured:** a **held-out** sample. `buildCalibrator` checks ECE on the
  *same* data it fit on; the path-to-70 §7 requirement of *out-of-sample*
  `calibratedEce ≤ rawEce` is a process step, not yet enforced in code.
- **Decision it affects:** none today (gate `canApplyCalibrationAdjustments` =
  `CALIBRATION_ADJUSTMENTS_ENABLED`, default false, `readiness.ts:142`).
- **Affects published / no-bet / CLV / calibration today?** No to all four.
- **Next improvement:** a held-out validation harness
  (`scripts/calibration/fit-and-validate.mjs` exists for offline analysis and does NOT
  flip any gate) before the adjustment flag is ever set.
- **Test:** `__tests__/calibration-apply.test.ts` (self-suppression below 100,
  no-worsen rule).
- **What could go wrong:** in-sample over-fit certified as "improved." The held-out
  step is the guard; do not skip it.
- **Rollback:** revert `CALIBRATION_ADJUSTMENTS_ENABLED` to false + revert the
  MODEL_VERSION bump.

### 9. Edge significance — `edge-significance.ts` · **implemented-inert + requires-more-data**
- **What it does:** Monte-Carlo permutation test — under the null that each pick wins
  only at its market-implied (no-edge) probability, how often would we see ≥ the
  observed wins? Low p-value = evidence of real skill.
- **Data consumed:** `{won, nullProb}` per settled pick.
- **Data NOT captured:** the settled outcomes + null probs at scale (same sample
  blocker).
- **Decision it affects:** none (introspection-only; any public "significant edge"
  claim is founder-gated and must clear the copy scanners).
- **Affects published / no-bet / CLV / calibration today?** No to all four.
- **Next improvement:** run it on the operator cockpit once the sample exists; never
  publish a significance claim without `check-claims` clearance.
- **Test:** `__tests__/edge-significance.test.ts` (injectable RNG, +1 smoothing).
- **What could go wrong:** p-hacking by re-segmenting until something is "significant."
- **Rollback:** never wired.

### 10. Market Gravity Index — `market-read.ts` `marketGravityIndex` · **implemented-inert (exported/read-only)**
- **What it does:** `index = conviction × quality × 100`, where conviction = distance
  of the consensus fair prob from a coin flip, quality = `0.6 + 0.25·agreement +
  0.15·liquidity`. STATIC per snapshot (no temporal/movement-speed term). Its own
  header is honest: it measures the market's *conviction*, never whether the market is
  *right*.
- **Data consumed:** a `ConsensusMarketRead` (from `consensusNoVig`).
- **Data NOT captured:** it is computed in the web read helper
  `apps/web/lib/market/game-market-read.ts:127` and **never persisted** — no DB write,
  `Game.currentEdgeIndex` is not set from it. So there is no gravity time-series.
- **Decision it affects:** display-layer only; not in `scoreGame`, not in tiering.
- **Affects published / no-bet / CLV / calibration today?** No to all four.
- **Next improvement:** persist a per-snapshot gravity reading so movement can be
  measured (this is the bridge to the temporal doctrine version, #11).
- **Test:** covered inside `__tests__/market-read.test.ts`.
- **What could go wrong:** reading gravity as a pick reason — forbidden by the
  doctrine's "no sharp money" language rules.
- **Rollback:** read-only; remove the helper call.

### 11. Market Gravity (temporal) — `docs/brain/market-gravity.md` · **doctrine-only + requires-schema-approval**
- **What it does (on paper):** the *richer* gravity — movement size/speed, book
  agreement over time, news/injury correlation, liquidity proxy. Explicitly "Doctrine
  only. Implementation requires approved change proposal."
- **Why distinct from #10:** the implemented index is a single-snapshot scalar; the
  doctrine version is a temporal signal that needs a line-movement event table and
  news/injury timestamps that do not exist.
- **Affects anything today?** No. **Blocked by:** schema approval + missing
  news/injury/movement ingestion.

### 12. Player usage / tracking → scorer · **requires-source/legal-approval + requires-schema-wiring**
- **What it does (in schema):** `PlayerGameStat` (targets, targetShare, EPA),
  `SnapCount`, `Injury`, `DepthChartEntry`, `NextGenStat`, `PfrAdvStat`,
  `TeamGameEfficiency` — all present with a `rightsSnapshot Json` field
  (`schema.prisma:1933-2360`).
- **Data NOT captured into the scorer:** none of these feed `scoreGame`.
  `opponent-adjusted.ts` and `player-projection.ts` reference player efficiency, but
  they are exported utilities (`index.ts:199-213`), not imported by `scoring.ts`.
- **Decision it affects:** none today.
- **Next improvement:** these are the richest dormant signal in the system, but
  wiring them is gated on (a) source-rights clearance per CLAUDE.md scraping posture
  and (b) a MODEL_VERSION bump to introduce new scoring factors. Both are
  owner/legal decisions, not autonomous changes.
- **What could go wrong:** ingesting account-gated/proprietary player data without a
  RightsSnapshot — a CLAUDE.md hard violation.

### 13–15. Line-movement series / Signal Ledger / No-bet ledger · **requires-schema-approval**
- **Line-movement series:** `Game.lineMovementSpread/Total` are single Float deltas
  (`schema.prisma:213-214`); `Odds` history is queryable per snapshot, but there is no
  `LineMovement` event model (confirmed absent). Movement *velocity* cannot be
  measured.
- **Signal Ledger:** `docs/brain/signal-ledger.md` — "Status: Doctrine only. Schema
  implementation is BLOCKED pending approval." Today only `PickSignalSnapshot`
  (prediction-time signal state) + `PerformanceSummary` (aggregates) exist.
- **No-bet ledger:** does not exist (see #3).

---

## What is SAFE to activate now vs BLOCKED, and why

### Safe to activate now (no learned-number risk, additive/measurement-only)
- **A No-Bet Ledger** (write-only): record every `return null` drop with a reason
  code. Measurement, not a published claim. Highest-leverage and the only way to ever
  score no-bet quality. (`safe-to-activate-now`, additive schema.)
- **Persisting the static Market Gravity Index per snapshot:** turns a display scalar
  into a time-series input. Read-only signal, never a pick reason. (`safe-to-activate-now`.)
- **Operator-only (not public) CLV and edge-significance dashboards:** the
  measurement is already wired; surfacing it to the cockpit (gated, non-public) is an
  honest internal proof step. (`safe-to-activate-now` for the operator surface.)
- **Continuing accrual:** keep `THE_ODDS_API_KEY` attached so the 30-min runner keeps
  growing the sample. This is the prerequisite for everything else.

### Blocked, and exactly why
- **Calibrated win probabilities in any decision** — blocked by *sample* (~16 of 100)
  AND by the audited held-out validation + MODEL_VERSION step
  (`CALIBRATION_ADJUSTMENTS_ENABLED`, path-to-70 §7). Unsafe to flip early.
  (`unsafe-to-activate-now`.)
- **Conviction tier live** — blocked by calibration + a 20+ per-segment CLV sample.
  (`requires-more-data`.)
- **Pricing the edge engine (non-zero weight)** — blocked by (a) a real independent
  estimator feed and (b) a MODEL_VERSION bump. (`weight-zero` → `requires-tests`.)
- **Player/injury/weather/referee signals in scoring** — blocked by source-rights
  clearance + schema wiring + MODEL_VERSION bump.
  (`requires-source/legal-approval`.)
- **Temporal Market Gravity, Signal Ledger** — blocked by schema approval.
  (`requires-schema-approval`.)

---

## Discrepancies found vs the ground-truth brief (verified against code)

1. **`canApplyCalibrationAdjustments` is env-flippable in current code, not a hard
   literal.** `readiness.ts:142` reads `config.calibrationAdjustmentsEnabled`
   (`CALIBRATION_ADJUSTMENTS_ENABLED`, default false, `platform-config.ts:188`). The
   brief stated this correctly, but note several *older* docs
   (`AUTONOMOUS_OPERATING_SYSTEM.md`, `PHASE_9_REPORT.md`, references to `jarvis.ts:52`)
   still describe it as a hardcoded `false`. The live source is the env-flippable
   version; those docs are stale on this point. Either way it ships `false`.
2. **`marketGravityIndex` does not take a separately-computed "conviction × quality"
   input — it computes conviction internally from a `ConsensusMarketRead`.** The brief's
   formula is right in spirit (`market-read.ts:163-184`); the inputs are a consensus
   read, and conviction/agreement/liquidity are derived inside the function.
3. **`opponent-adjusted.ts` / `player-projection.ts` do reference player-efficiency
   types**, so "player data entirely untouched by the engine package" is too strong —
   but the brief's load-bearing claim holds: **none of them feed `scoreGame`**
   (`scoring.ts` imports neither). They are exported-only future utilities.
4. **The "16 of 100" figure** is grounded: the 16-pick sample is the one cited in
   `conviction-tier.ts:170`; the 100 floor is `MIN_SETTLED_PICKS_FOR_LEARNING`. No
   single line says "16 eligible picks accrued" — treat 16 as the honest illustrative
   sample the code itself references, and 100 as the hard floor.

Everything else in the brief verified accurate against the named files.
