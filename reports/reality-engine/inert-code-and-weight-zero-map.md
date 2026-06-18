# Reality Engine — Inert Code & Weight-Zero Activation Map

**Date:** 2026-06-18 · **By:** Claude (Opus 4.8)
**Status:** DOCS ONLY — no code/schema/gate changes. Companion to
`workstream-k-activation-audit.md`.

**Purpose:** for every piece of intelligence that is built and tested but does **not**
affect a decision today, document the EXACT activation path — the data sample, the
`MODEL_VERSION` + `CalibrationProposal` discipline, the tests, and the rollback — so
that activation is never a silent flip. The governing rule
(`scripts/guardrails/model-freeze.mjs` + `docs/calibration-proposals/FROZEN.md`,
frozen at `v5.0.0`) is that any change to scoring weights or the meaning of the
confidence number re-labels historical picks and therefore requires an audit trail.
"Just turn it on" is, by design, impossible without one.

---

## The activation discipline (applies to every section below)

Three doors must all be open before an inert engine moves a real decision. Skipping
any one is a CLAUDE.md hard violation (fabricated/unvalidated numbers):

1. **Data door — the sample exists.** For learned numbers: ≥ 100 settled, canonical
   (`isBootstrap=false`), `eligibleForLearning=true`, decisive WIN/LOSS picks
   (`MIN_SETTLED_PICKS_FOR_LEARNING`, `platform-config.ts:187`). For CLV-gated tiers:
   ≥ 20 graded CLV picks per segment.
2. **Audit door — MODEL_VERSION + CalibrationProposal.** Any scoring-weight or
   confidence-meaning change bumps `MODEL_VERSION` in `constants.ts` and adds EITHER a
   `CalibrationProposal` row (`seed.ts`, `status: IMPLEMENTED`) OR a
   `docs/calibration-proposals/<slug>.md` with `status: IMPLEMENTED` front-matter,
   OR updates the `frozen:` line in `FROZEN.md` (cosmetic-only bumps).
   `model-freeze.mjs` enforces this in CI.
3. **Gate door — the env flag, in the right order.**
   `OUTCOME_LEARNING_ENABLED` (data collection) must precede
   `CALIBRATION_ADJUSTMENTS_ENABLED` (applying learned numbers), and the latter also
   requires the path-to-70 §7 held-out validation. `check-deploy-readiness.mjs:385,392`
   enforce the ordering (`CALIBRATION_ADJUSTMENTS_ENABLED` requires
   `OUTCOME_LEARNING_ENABLED` + audited activation).

Offline analysis is always safe: `scripts/calibration/fit-and-validate.mjs` reads the
sample and reports, but "does NOT bump MODEL_VERSION, does NOT flip
CALIBRATION_ADJUSTMENTS_ENABLED or any gate, never sets eligibleForLearning, never
relabels picks."

---

## 1. Edge engine surfaced at weight 0 — `edge-engine.ts` + `scoring.ts`

**Current state:** `assessIndependentEdge` runs in moneyline scoring
(`scoring.ts:856`) and produces a full `IndependentEdgeSummary`, but it is attached
as a factor with `weight: 0` and `priced: false` (`scoring.ts:874`, `:177`). It
appears in the glass-box factor trail and the reasoning string; it contributes
exactly 0 to confidence. `scoring-independent-edge.test.ts` asserts the confidence
is byte-identical with vs without it.

**Activation path:**
- **Data door:** populate `context.independentFairValues` with a real independent
  estimate. `poisson.ts` is the in-repo candidate (no new source); Kalshi-as-referee
  requires a source-rights decision. Until a feed exists, `assessEdge` correctly
  returns `PASS` (`independents.length === 0`), so there is nothing honest to price.
- **Audit door:** giving the edge a non-zero weight changes the confidence formula →
  `MODEL_VERSION` bump (e.g. v5.1.0) + `CalibrationProposal` documenting the
  observed CLV-vs-edge relationship that justifies the weight. The weight must be
  *earned* from Loop-3 data (does a SPEAK edge actually beat the close?), not picked.
- **Tests required:** extend `scoring-independent-edge.test.ts` to assert the new
  weighted contribution; add a regression that a `CONTRADICTS`/`PASS` edge still
  contributes 0; assert the `expectedClv` is graded against realized CLV.
- **Rollback:** revert the MODEL_VERSION bump → the weight-zero surfacing (the current
  safe state) returns; no data migration.

**What could go wrong:** pricing an edge weight before confirming (via CLV) that the
independent estimator actually anticipates the close. That would be confidence theater.

---

## 2. Conviction tier — `conviction-tier.ts`

**Current state:** `convictionTier` is not called by any live path (`scoring.ts` does
not import it). It is the "70% tier" selector, written and tested so it is ready the
moment its three inputs become real.

**Activation path — all three inputs must be real first:**
- **Calibrated probability:** depends on §4 (calibration) being live. Until then the
  honesty guard rejects any out-of-[0,1] input → PASS, so passing the raw 0–100 by
  mistake cannot certify a fake CONVICTION.
- **Edge decision = SPEAK:** depends on §1 (a fed, then priced, edge engine).
- **CLV beat-rate ≥ 0.5 over ≥ 20 graded picks per segment:** depends on Loop-3 CLV
  aggregation existing as a live query (it does not yet; CLV is graded per-pick and
  stored, but not summarized by segment in a live consumer).
- **Audit door:** wiring `convictionTier` into selection/tiering is a scoring change →
  MODEL_VERSION bump + proposal.
- **Tests required:** `conviction-tier.test.ts` already pins the honesty guards
  (n=1 CLV → PASS, out-of-range prob → PASS, price-specific break-even). Add an
  integration test that the live selector only reaches CONVICTION when calibration is
  active AND the CLV sample ≥ 20.
- **Rollback:** revert the version bump; the tier returns to inert.

**Note on `confidenceBand` (SIGNAL/EDGE/SHARP/APEX):** this is a *separate*,
access-control-only partition of the raw 0–100 range. Its header states it is
"INFRASTRUCTURE ONLY and UNCALIBRATED" and "No band carries a win-rate claim." It may
gate which tier sees which picks **without** any of the above doors, *provided* no
band is ever labeled with a win rate. Do not conflate band activation (access control,
safe) with conviction-tier activation (a learned claim, gated).

---

## 3. Edge significance — `edge-significance.ts`

**Current state:** built and tested (`edge-significance.test.ts`, injectable RNG, +1
smoothing so p-value is never exactly 0). Not called in any live or public path;
introspection-only.

**Activation path:**
- **Data door:** a settled sample with per-pick `{won, nullProb}` (the market-implied
  no-edge probability). Same sample blocker as calibration.
- **Surface (safe):** running it on the **operator** cockpit (non-public) needs no
  MODEL_VERSION bump — it does not change scoring, it reports on it.
- **Public claim (gated):** any public "statistically significant edge" statement is
  founder-gated and must clear `check-claims` / `trust-gate.mjs`. The audit door here
  is the copy/claim governance, not MODEL_VERSION.
- **Tests required:** the unit test exists; add a guard that no public surface renders
  a significance verdict without the readiness gate + claim clearance.
- **Rollback:** remove the operator surface; the math stays inert.

**What could go wrong:** p-hacking by re-segmenting until something clears α. The
defense is to fix the segments before looking, and to gate any public claim.

---

## 4. Probability calibration + calibrator — `probability-calibration.ts` + `calibration-apply.ts`

**Current state:** the toolkit (isotonic/PAVA, ECE, Brier, reliability curve) and
`buildCalibrator` are built and tested. `buildCalibrator` is self-gating: inactive
(identity passthrough, `calibrated: false`) unless `sampleSize ≥ 100` AND
`calibratedEce ≤ rawEce`. The live gate `canApplyCalibrationAdjustments` reads
`CALIBRATION_ADJUSTMENTS_ENABLED` (default false, `readiness.ts:142`).

**Activation path — this is THE bottleneck, in strict order:**
1. **Data door (step 1):** keep `THE_ODDS_API_KEY` attached → 30-min runner accrues
   picks. Then, after `PERFORMANCE_STATS_ENABLED`, set `OUTCOME_LEARNING_ENABLED=true`
   so settlement stamps `eligibleForLearning=true`. (`check-deploy-readiness.mjs:385`
   enforces that learning requires performance.) Wait for ≥ 100 settled, canonical,
   decisive picks (~84 more than the ~16 referenced today).
2. **Validation door (step 2):** run `scripts/calibration/fit-and-validate.mjs`
   offline. The in-code `buildCalibrator` checks ECE *in-sample*; path-to-70 §7
   additionally requires **out-of-sample** `calibratedEce ≤ rawEce` on a held-out
   split. This is a *process* requirement not yet enforced in code — so it must be
   done by hand and recorded in the proposal.
3. **Audit door (step 3):** MODEL_VERSION bump + `CalibrationProposal` row
   (`status: IMPLEMENTED`) capturing the fitted map, the in/out-of-sample ECE, the
   sample size, and the date. Update `FROZEN.md` to the new version.
4. **Gate door (step 4):** unpin/confirm `canApplyCalibrationAdjustments` reads the
   flag, then set `CALIBRATION_ADJUSTMENTS_ENABLED=true`, redeploy. Update the pinning
   tests in `calibration-apply.test.ts` to reflect the active map.

- **Tests required:** the self-suppression and no-worsen tests already exist
  (`calibration-apply.test.ts`); add a held-out validation assertion and a test that
  the conviction tier / display only treats the number as calibrated when the gate is
  on AND the calibrator `isActive`.
- **Rollback:** set `CALIBRATION_ADJUSTMENTS_ENABLED=false` (instant, identity
  passthrough resumes) and revert the MODEL_VERSION bump (history re-labels back).

**What could go wrong:** the single biggest trap is treating the in-sample ECE check
as sufficient. A map fit on 100 points can look "improved" in-sample and be over-fit.
The held-out step is non-negotiable. Second trap: flipping the adjustment flag while
`OUTCOME_LEARNING_ENABLED` is still off — there would be no validated map and the
deploy-readiness check would (correctly) fail.

---

## 5. Market Gravity Index (static) — `market-read.ts` `marketGravityIndex`

**Current state:** computed in the web read helper
`apps/web/lib/market/game-market-read.ts:127` from a `ConsensusMarketRead`. Static per
snapshot (`conviction × quality × 100`); **not persisted** (no DB write,
`Game.currentEdgeIndex` is not sourced from it) and **not** in `scoreGame`.

**Activation path (two independent options, neither touches scoring):**
- **Option A — persist it (safe, measurement-only):** write the per-snapshot gravity
  reading to a new column/table so movement can be measured over time. This is
  additive schema (`requires-schema-approval` for the column) but NOT a scoring
  change, so no MODEL_VERSION bump. It is the bridge to the temporal doctrine version
  (§6).
- **Option B — feed it into scoring (gated):** if gravity ever modulates confidence
  (the doctrine says it may "adjust confidence and risk scores when corroborated by
  Tier 1–3 evidence"), that is a scoring change → MODEL_VERSION bump + proposal, and
  it must respect the doctrine's forbidden "sharp money" language.
- **Tests required:** for Option A, a persistence test that one reading is written per
  snapshot with the source `fetchedAt`; for Option B, the full scoring-change test
  battery.
- **Rollback:** Option A — stop writing the column (nullable); Option B — revert the
  version bump.

**What could go wrong:** surfacing gravity as a *reason* for a pick. The doctrine
(`docs/brain/market-gravity.md`) forbids "sharp money / smart money" language and
states gravity "measures the market's CONVICTION, never whether the market is RIGHT."

---

## Summary — what can move without the sample, and what cannot

| Inert piece | Needs the 100-pick sample? | Needs MODEL_VERSION bump? | Safe partial step available now |
|---|---|---|---|
| Edge engine (price the weight) | Indirectly (via CLV proof) + a fed estimator | Yes | Keep at weight 0; feed Poisson into context (no bump) |
| Conviction tier | Yes (calib + 20 CLV/segment) | Yes (to wire) | Activate `confidenceBand` for access only (no bump) |
| Edge significance | Yes | No (operator surface) | Operator-only dashboard (claim-gated) |
| Calibration / calibrator | Yes (the bottleneck) | Yes | Offline `fit-and-validate.mjs` (no bump, no flip) |
| Market Gravity (static) | No | Only if it feeds scoring | Persist per-snapshot reading (additive schema) |

The pattern is consistent: every learned number is gated on the same settled-outcome
sample, and every scoring change is gated on the MODEL_VERSION + proposal discipline.
The pieces that can move *now* are the measurement-only ones — persist gravity, run
significance/calibration offline, surface CLV to operators — none of which assert a
win rate.
