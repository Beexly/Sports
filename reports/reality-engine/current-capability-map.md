# Reality Engine — Current Capability Map (by loop)

**Date:** 2026-06-18 · **By:** Claude (Opus 4.8)
**Status:** DOCS ONLY — no code/schema/gate changes. Companion to
`workstream-k-activation-audit.md`; same verified ground truth, organized as
narrative depth across the five loops the Reality Engine is meant to close.

The Reality Engine is five feedback loops. A loop is "closed" only when there is a
real input, a real computation, a real decision, and a real measurement of whether
that decision was right. Below, each loop is rated on how much of that chain exists
**today** in the live path — not on paper.

---

## Loop 1 — Market-Replay (de-vig → fair price → edge vs the line)

**Completeness: ~70% — the read is real and live; the independent referee is not fed.**

This is the most complete loop. The chain from posted prices to a fair, vig-free
probability is wired and runs every 30 minutes:

- **Input (real):** multi-book American odds land in `Odds` rows on each refresh
  cycle (`workers/data-refresh/src/index.ts`, 30-min interval; throws without
  `THE_ODDS_API_KEY`).
- **Computation (real):** `shin-devig.ts` recovers fair probabilities (Shin's `z` by
  bisection, plus the closed-form `gotoConversion`). `market-read.ts`
  `noVigFromAmericanPrices` / `consensusNoVig` produce a multi-book median fair prob
  and a `homeProbDispersion` (MAD) disagreement measure. The live scorer uses the
  lighter `removeVig` on averaged implied probs (`scoring.ts:39`).
- **Decision (real):** the de-vigged fair prob anchors the pricing-edge component
  (0–25), the ML selection threshold (`fairProb < 0.58 → drop`), and the consensus
  floor (`CONSENSUS_MIN_PCT 0.55`). The sub-vig guard
  (`twoSidedImpliedSum < 1 && rawEdge > 0 → 0`) refuses to credit edge from a crossed
  or stale book.
- **Where the loop breaks:** "edge vs the line" only becomes *real* edge when an
  **independent** estimate that the market hasn't absorbed disagrees with the fair
  price. The machinery for that — `edge-engine.ts` `assessEdge` — exists, but it is
  fed `independentFairValues` only when present, and in practice that feed is empty,
  so it returns the honest `PASS` and rides at `weight: 0`. The replay loop reads the
  market accurately but does not yet *replay it against a model the market can't
  see.* The Poisson estimator (`poisson.ts`) is built but not threaded into the live
  context; Kalshi as an exchange referee requires a source decision.

**What closes it:** a populated independent-estimate feed (Poisson first, since it is
in-repo) → then, separately, a MODEL_VERSION bump to price the edge. The measurement
half (does the edge predict CLV?) is Loop 3.

---

## Loop 2 — Edge-Genome (which signal types actually earn, by segment)

**Completeness: ~10% — the scorer emits a glass-box factor trail, but nothing grades
factor-type reliability.**

The "genome" is the idea that each contributing factor (consensus, depth, line
movement, rest, H2H, venue, cross-market, schedule) has its own historical
reliability, and the model should weight factors by what they've earned.

- **Input (real):** every pick carries a full `FactorBreakdown` with per-factor
  weights and impacts (`scoring.ts` `factorBreakdown`), and `PickSignalSnapshot`
  persists the prediction-time signal state (`schema.prisma:554`).
- **Computation (absent):** there is no module that joins settled outcomes back to
  factor contributions to ask "did the line-movement factor actually predict
  covers?" The weights in `constants.ts` are hand-tuned and frozen at v5.0.0; their
  comments explicitly say the model "does not claim to know how fatigue translates to
  ATS outcomes until calibrated."
- **Decision (none):** factor weights are static.
- **Measurement (none):** edge-type reliability is exactly the metric this loop
  exists to produce, and it has no data source until `OUTCOME_LEARNING_ENABLED` is on
  and the sample accrues.

**What closes it:** the same sample unlock as calibration, *plus* a settled-outcome ⇄
factor-attribution join (a new analysis, gated like calibration behind a
MODEL_VERSION change if it ever re-weights). Until then the genome is documented
ambition, not a loop.

---

## Loop 3 — Autopsy (CLV + significance: were we right for the right reason?)

**Completeness: ~50% — CLV is measured and stored; significance is built; neither
feeds a decision and neither is surfaced.**

This is the loop that proves edge *before* enough games settle for a win-rate, by
measuring whether our locked price beat the close.

- **Input (real):** the immutable lock-time line/price plus the timestamped `Odds`
  history. `clv-capture.ts` `deriveClosingSnapshotFromOdds` reconstructs the close as
  the last pre-kickoff batch; `gradePickClv` grades it.
- **Computation (real):** `clv.ts` `computeSpread/Total/MoneylineClv` + `summarizeClv`
  produce per-pick CLV and an aggregate beat-rate. `edge-significance.ts` runs a
  Monte-Carlo null to ask whether the hit rate beats luck.
- **Persistence (real):** `Pick.clvLockLine/clvLockPrice/clvCloseLine/clvClosePrice/
  clvValue/clvVerdict/clvCapturedAt/clvGradedAt` (`schema.prisma:385-393`).
- **Where the loop breaks:** CLV affects **no decision** today. The conviction tier
  that would consume `clvBeatCloseRate` (≥0.5 over ≥20) is inert. The significance
  test has no sample. And the "close" is *derived* from the last refresh, not a true
  closing marker — so its fidelity depends on the final pre-kickoff refresh landing
  close to kickoff. Nothing is surfaced (public CLV is gated behind readiness;
  operator CLV is not yet on a cockpit surface).
- **The autopsy of *losses* specifically:** the broader audit noted the pre-mortem
  loss taxonomy maps only a subset of root causes — so even when we lose, the loop
  learns from a fraction of the reasons.

**What closes it:** (a) a kickoff-aligned final refresh for a faithful close; (b) an
operator-only CLV + significance dashboard (safe, non-public, measurement-only); (c)
the sample, before the conviction tier can read CLV beat-rate as a gate.

---

## Loop 4 — No-Bet (the discipline of declining, and grading the declines)

**Completeness: ~30% — declining is real and active; it is completely unmeasured.**

The product's restraint is real: most markets are declined. The problem is that the
declines are invisible.

- **Decision (real):** three silent `return null` sites at `MIN_PUBLISH_CONFIDENCE =
  50` (`scoring.ts:542, 726, 898`), plus the earlier consensus-floor and ML-threshold
  drops. The `assessEdge` honest-default PASS is the same discipline at the edge
  layer. `forceNoBetIfStale` (default false) is a read-boundary stale-data
  suppression gate.
- **Measurement (absent):** there is **no ledger** of what was declined or why. We
  publish the survivors and can audit them; we keep no record of the markets we
  passed on. This is survivorship bias, and it has a second-order cost: any future
  calibration sample is silently conditioned on "confidence ≥ 50," so the learned
  curve will be blind to the declined region.
- **Why this is the highest-leverage measurement gap:** "no-bet quality" — did the
  markets we declined actually go the way we'd have lost? — is unanswerable without
  the ledger. It is also the cheapest to add: a write-only table, no public surface,
  no scoring change.

**What closes it:** a No-Bet Ledger (one row per considered (game, market) with a
reason code). Additive, `safe-to-activate-now`. Then a backtest that replays declined
markets against outcomes to score the discipline.

---

## Loop 5 — Hypothesis (calibration: turn the confidence number into a real probability)

**Completeness: ~40% built, ~0% live — fully built, fully gated, fully data-starved.**

This is the loop the whole platform thesis ("calibrated, not just confident") rests
on, and it is the one blocked by the #1 finding.

- **Input (blocked):** `(forecastProbability, outcome)` samples from settled,
  canonical, learning-eligible picks. `eligibleForLearning` is only set when
  `OUTCOME_LEARNING_ENABLED` is on (`settle-sport.ts`, gated on
  `canLearnFromOutcomes`). Today the sample is ~16 (the figure
  `conviction-tier.ts:170` cites); the floor is 100.
- **Computation (real, tested):** `probability-calibration.ts` (isotonic/PAVA, ECE,
  Brier/Murphy, reliability curve) and `calibration-apply.ts` `buildCalibrator`,
  which self-suppresses below 100 samples AND refuses any map that worsens ECE.
- **Decision (gated off):** `canApplyCalibrationAdjustments =
  CALIBRATION_ADJUSTMENTS_ENABLED` (default false, `readiness.ts:142`). Even with the
  sample, flipping it requires *out-of-sample* held-out validation + a MODEL_VERSION
  bump + a `CalibrationProposal` audit row (`path-to-70.md §7`).
- **Measurement (real, tested):** ECE/Brier/reliability are exactly how this loop
  grades itself — once it has data.

**What closes it, in order:** (1) attach `THE_ODDS_API_KEY` and keep accruing; (2)
flip `OUTCOME_LEARNING_ENABLED=true` after `PERFORMANCE_STATS_ENABLED`; (3) wait for
~84 more canonical picks; (4) run the held-out fit-and-validate offline; (5) only then
the MODEL_VERSION bump + `CALIBRATION_ADJUSTMENTS_ENABLED`. Steps 1–3 are owner
actions and time; nothing in code shortcuts them.

---

## Loop completeness at a glance

| Loop | Real input | Real compute | Real decision | Real measurement | Net |
|---|---|---|---|---|---|
| 1 Market-Replay | Yes | Yes | Yes | partial (no independent referee fed) | **~70%** |
| 2 Edge-Genome | Yes (trail) | No | No | No | **~10%** |
| 3 Autopsy (CLV/sig) | Yes | Yes | No | Yes (stored, unsurfaced) | **~50%** |
| 4 No-Bet | n/a | n/a | Yes | No (no ledger) | **~30%** |
| 5 Hypothesis (calib) | Blocked | Yes | Gated off | Yes (needs data) | **40% built / 0% live** |

**The through-line:** Loops 1, 3, and 4 already *act* or *measure* in the live system;
they are bottlenecked on a referee feed (1), a surface (3), and a ledger (4). Loops 2
and 5 are bottlenecked on the same thing — the settled-outcome learning sample — which
is the single owner unlock. The engines are not the constraint. The data is.
