# NGS Signal Weighting — Design

**Date:** 2026-10-01. **Status:** design (not yet executed).
**Scope:** the three NGS signal keys persisted by `ngs-signal-project.ts`:
`ngs.avg_separation` (receiving), `ngs.ryoe_per_att` (rushing), `ngs.cpoe` (passing).
**Authorization:** Garrett delegated NGS weighting to Motif on 2026-09-30
("you take the lead on figuring out how to find those and how to weight those
correctly most intelligently") — the `weight = 0 / "founder-gated"` comments in
`ngs-signal-project.ts` are now stale and should be updated when this design is
adopted.
**Hard constraint:** NGS is INTERNAL-ONLY per the 2026-09-28 doctrine. Weights
feed the internal composite only. No NGS data, metric names, or methodology
reaches any public surface.

## 1. Current state

- 380 NGS signal rows in `signals`, keyed by `entityId = gsisId`, `weight = 0`,
  `confidence = 1`, sample size (targets/attempts) in `rightsSnapshot.sample`.
- The 2026-09-30 scale fit (`docs/brain/signal-ledger-scale-fit.md`) gave all
  four NGS keys weight 0 for a measured reason, not a judgment:
  **"unjoinable-outcome"** — the writer keys NGS rows by `gsisId` while every
  settled outcome is keyed by `playerId`, and **0 of 380** distinct gsis matched
  a playerId. "No join, no fit, no weight. The crosswalk does not exist in this
  repo."
- **That blocker is now gone.** Tier 1 #4 (commit `d824d2b`) shipped
  `apps/web/lib/ops/player-crosswalk.ts` — `resolvePlayerByGsis` maps
  gsisId → internal playerId via the canonical `Player.gsisId` column, with an
  explicit honesty rule (a miss returns null, never a guessed id) and a health
  report for sparse join coverage. The fit the scale table refused is now
  runnable.
- The fit law already exists and is tested:
  `packages/prediction-engine/src/signal-scale-fit.ts` —
  **within-player correlation** of the key against a settled outcome,
  evidence counted in **distinct fixtures** (season × week), 100-fixture floor
  (`MIN_SCALE_FIXTURES`), weight = `clamp(r × √(fixtures/100), −1, 1)`
  (from `multiplierFrom` in `tune-signal-weights-grouped.ts`).
  The established outcome is **next-week `player_game_stats.fantasyPointsPpr`
  above the population median** (base rate 0.4966 — balanced, no class-imbalance
  inflation). Team win/loss was tried and is not joinable; do not retry it.

## 2. Why within-player (the trap this design refuses)

The scale-fit measured the naive between-player correlation at 4x–36x the
within-player number, and the gap is player identity, not forecast
(e.g. `pgs.target_share`: between 0.314 vs within 0.0046 in 2024 alone — 68x).
Weighting NGS by raw correlation would advertise predictive power the data does
not contain. The weight answers one question: *on a week this player looks
unusually good on this metric, do they do unusually well next week?* — with the
player fixed effect removed.

## 3. External evidence, per signal (what the literature says before we fit)

Honest summary: no published study gives a within-player week-to-week
correlation for any of these three metrics against next-week fantasy points.
What exists is trait-stability and marginal-value evidence. It sets priors and
sanity-check ranges — it does not set weights.

### 3a. `ngs.cpoe` — strongest prior of the three

- **Methodology (strongest of the three).** NGS's completion-probability model
  is XGBoost on SageMaker, trained on **36,000+ pass attempts back to 2016**,
  validated on a random 10% holdout; actual completion % vs predicted
  probability correlation **r² = 0.98**
  (amazon.science, Feb 2026; ~6 of 10+ factors named publicly: air distance,
  target separation, sideline separation, pass-rush separation, passer speed,
  time to throw). CPOE = actual − expected. This is the best-validated of the
  three metrics — the underlying model is a measured, calibrated instrument.
- **Stability.** Independent replication (bruddaondabeat/nfl_qb_analysis,
  nflverse PBP 2021–2025, 117 qualified-passer season pairs): **CPOE YoY
  r = 0.375**, in line with EPA/dropback (0.405), passer rating (0.379),
  completion % (0.390). CPOE is a persistent QB trait at roughly the same
  stability as the box-score efficiency stats.
- **Caveats.** (1) Public-proxy CPOE (play-by-play only, no tracking) already
  correlates r² = 0.88 with the NGS version (Baldwin/Hermsmeyer) — some of
  CPOE's information is recoverable without NGS at all, so its *marginal*
  value over `pgs.passing_epa` must be measured, not assumed.
  (2) "CPOE is unstable before week 5; use career CPOE + prior season for
  new/young starters" (nfl_platinum_rose SKILL.md). Early-season weeks need a
  prior blend, not raw weekly values.
- **Expected fit range:** within-player r ≈ 0.02–0.06 → **weight ≈ 0.02–0.07**
  at ~100+ fixtures. This is a sanity-check range for the measured fit, not a
  target.

### 3b. `ngs.ryoe_per_att` — weak prior

- **Methodology.** xRY from the 2D CNN ("The Zoo", Singer & Gordeev), winners
  of the 2020 Big Data Bowl (2,000+ entrants, CRPS scoring); inputs are only
  five vector features (X, Y, S, A, Dir) for all 22 players at handoff;
  xRY = Σ(outcome × probability). Solid, public, reproducible.
- **Stability (the problem).** srsavas42/fantasy-football-research: only
  **2.5% of RYOE carries into the next season (r ≈ 0.16)** vs 8.8% for yards
  before contact. Independent fantasy-factor audit (zesty-fantasy-draft
  position-factors): RYOE-led rushing-efficiency composite rated
  **"low" stability, ~2–2.5% weight**. And the O-line confound is severe:
  removing the focal back's own carries drops the team rushing fit from 5.6%
  to 1.0% of variance — "most of a team's apparent blocking is the back
  running behind it," and RYOE cannot separate the runner from the room.
- **Expected fit range:** within-player r ≈ 0.005–0.03 → **weight ≈ 0.005–0.03**.
  Expect this to earn the smallest of the three weights, possibly zero.

### 3c. `ngs.avg_separation` — weakest prior, measure-don't-assume

- **No published stability or predictiveness numbers exist** for
  target separation in the corpus surveyed. This is a gap, stated plainly.
- **The hostile evidence.** zinkelburger/fantasy-football-tool (HIGH
  confidence, every rosterable player 2017–2025): "Bet on targets, not on
  efficiency stats… The efficiency side was a clean sweep of zeros. Yards after
  catch, catch rate, even catch rate adjusted for how deep the targets were:
  none added anything **once points were known**." And the mechanism: "A stat
  can be stable and useless at the same time. You're not asking 'is this player
  good'; you're asking 'is he better than his points say.'"
  espechtsoftware/nfl-predictions: separation-by-route/break/alignment grids
  carry "the weakest football-motivated prior and the highest
  search-overfitting risk. Do not export them speculatively." Route share
  "remains the larger measured signal."
- **Why it's still worth fitting rather than discarding.** The scale-fit's
  within-player question is exactly the zinkelburger question ("better than
  his points say?"), asked week-to-week instead of season-to-season. If
  separation's within-player r measures ~0 against next-week PPR, the fit
  returns weight 0 honestly — that *is* the finding, per the ledger's own
  doctrine ("Weight 0 means present, honest, and currently not allowed to move
  a score. Not dropped, and never back-filled with a plausible-looking
  constant."). Do not pre-zero it on the literature alone; the corpus rule is
  WE INGEST, WE LEARN.
- **Expected fit range:** within-player r ≈ 0–0.02 → **weight ≈ 0–0.02**.
  The prior says near-zero; the fit gets the final word.

## 4. The plan (in order)

### Step 1 — Backfill NGS weekly history into `signals`
The current 380 rows are recent weeks only. The fit needs seasons of evidence.
Backfill weekly NGS receiving/rushing/passing rows (nflverse
`load_nextgen_stats`, 2016–present) through the existing
`projectNgsSignalRows` projector at `weight = 0`. This is pure evidence
accumulation — weight 0 means nothing moves. (Garrett authorized Odds-API
backfill spend on 2026-09-30; NGS backfill is nflverse-local and costs
nothing but compute.)

### Step 2 — Join via the crosswalk, report the gap honestly
For each NGS row, `resolvePlayerByGsis` → playerId → join to
`player_game_stats` (this week for the reading, next week for the outcome).
Publish the join rate per key (the old measurement was 0/380; the crosswalk
report should show how far the `players` table has come). A key with a sparse
join fails at the fixture floor honestly — "unjoinable-outcome" again, with a
fresh measurement, not a carried-forward verdict.

### Step 3 — Sample-size floors (proposed; the tuner enforces, the writer doesn't invent)
Small-sample weeks are noise wearing a reading's clothes. The
`rightsSnapshot.sample` field exists for exactly this. Proposed floors for the
tuning pass — judgment calls, open to refit evidence:
- `ngs.cpoe`: **≥ 15 pass attempts** in the week
- `ngs.ryoe_per_att`: **≥ 8 rush attempts**
- `ngs.avg_separation`: **≥ 4 targets**
Below the floor, the week contributes no observation (not a zero — an
absence). Early-season (weeks 1–4) CPOE should additionally blend toward the
prior-season/career value rather than using raw weekly readings.

### Step 4 — Run the within-player fit (the existing law, no new math)
For each key, over fixtures with ≥ 100 distinct season×weeks of joined data:
within-player Pearson r of this-week normalized reading vs next-week PPR-above-
median, then `weight = clamp(r × √(fixtures/100), −1, 1)`. Reuse
`signal-scale-fit.ts` directly. Commit the result as a reviewed diff to
`signal-scale-table.ts` — "a refit that moves a weight is a claim change that
belongs in review."

### Step 5 — Redundancy discount (the double-counting guard)
The fit measures each key's value against the *outcome*, not against the
*other signals*. `ngs.cpoe` overlaps `pgs.passing_epa`; `ngs.avg_separation`
overlaps `pgs.target_share`/`pgs.receiving_epa`; `ngs.ryoe_per_att` overlaps
`pgs.rushing_epa`. After fitting, compute the pairwise within-player
correlation matrix between each NGS key and its PGS counterpart. If |r| > 0.5,
the NGS key is mostly restating a signal the composite already has: halve its
fitted weight (documented, not silent) or drop it to 0 with the reason
"redundant-with-<key>". The composite must not pay twice for one fact.

### Step 6 — The drops experiment (FTN finding, operationalized)
FTN's internal research (2026-09-30, via @realfrankbrank): their own CPOE
variant became **more predictive when drops counted as misses** rather than
as attempts. NGS's CPOE treats a drop as a completed-process attempt (the QB
is not blamed for the drop); the FTN variant blames the QB. Neither is
"correct" — they measure different things (pure accuracy vs.
production-relevant accuracy). The experiment: build a companion key
`ngs.cpoe_drops_adj` from play-by-play (drops as misses), fit it through the
same law, and keep whichever earns the larger weight. Do not replace CPOE on
an anecdote; let the fixture count decide.

### Step 7 — Promote from shadow
Weights stay 0 in the writer until Steps 1–6 are done and reviewed. On
promotion: update `ngs-signal-project.ts` (replace the stale "founder-gated"
comments with a pointer to this doc), write the fitted weights through
`signal-ledger-writer.ts` like every other key, and confirm via
`/api/ops/signal-weight-tuning` that the tuner agrees within tolerance. NGS
rows remain internal-only — the fence does not move.

## 5. What the weights will probably look like (expectations, not assignments)

| key | expected within-r | expected weight | basis |
| --- | --- | --- | --- |
| `ngs.cpoe` | 0.02–0.06 | 0.02–0.07 | best-validated model (r²=0.98); YoY r=0.375 trait stability |
| `ngs.ryoe_per_att` | 0.005–0.03 | 0.005–0.03 | 2.5% season carryover; O-line confound |
| `ngs.avg_separation` | 0–0.02 | 0–0.02 | no published numbers; efficiency-adds-nothing evidence |

For scale: the earned PGS weights are `pgs.target_share` 0.102,
`pgs.receiving_epa` 0.028, `pgs.rushing_epa` 0.004. NGS at its best plausibly
lands between `receiving_epa` and `rushing_epa` — a real but junior voice in
the composite, with CPOE leading. If the measured fit disagrees with these
ranges, **the measurement wins** — these ranges are a smell test for bugs in
the join, not a target to steer toward.

## 6. Pitfalls checklist

1. **Early-season noise.** CPOE unstable before week 5; blend to prior-season/
   career for weeks 1–4. Never fit a weight on weeks 1–4 alone.
2. **Double-counting EPA.** See Step 5 — the redundancy discount is mandatory,
   not optional. A composite that sums CPOE and passing EPA without checking
   their overlap pays twice for QB quality.
3. **Separation sample thresholds.** A 1-target week with 4.2 yards of
   separation is not information. The ≥4-target floor is a minimum; check the
   fit's sensitivity at 6 and 8.
4. **RYOE is mostly line.** Do not narrate a high RYOE weight (if earned) as
   runner talent — the evidence says it does not separate runner from room.
5. **The drops nuance.** NGS CPOE and drops-adjusted CPOE are different
   instruments; fit both, keep the earner (Step 6).
6. **Join coverage.** The crosswalk only works where `players.gsisId` is
   populated. If join coverage is thin, the honest verdict is
   "insufficient-fixtures"/"unjoinable-outcome" — not a borrowed weight.
7. **Scale.** NGS raw sds are measured (`avg_separation` 1.020, `cpoe` 7.820;
   `ryoe_per_att` needs its anchor measured on backfill). Values must go
   through `normalizeReading` onto the shared −1..1 scale before any weight
   touches them — the 103x unit-spread defect must not be reintroduced.
8. **Internal-only.** Nothing in this plan moves an NGS metric, name, or
   weight toward a public surface. The fence work (2026-09-30) stays intact.

## 7. Open questions (updated 2026-10-01)

- ~~`ngs.ryoe_per_att` has no measured anchor/spread yet~~ **RESOLVED.**
  Step 1 validation (`docs/research/2026-10-01/ngs-backfill-step1-validation.md`,
  2024 season, n=554): mean=0.366, **sd=1.688**. Use 1.7 as the normalization
  anchor. Separation (sd=1.039) and CPOE (sd=7.644) validated against the
  scale-fit's 1.020 / 7.820 within 2.5%.
- Whether the outcome should stay next-week PPR-above-median or gain a
  second head (e.g. next-week PPR total, or position-specific outcomes for
  CPOE→passing yards). Recommend: keep the single established outcome for
  comparability; revisit after the first fit.
- The `injury.availability` key measured within-r 0.063 (strongest of any
  key) but was refused on 23 fixtures. If its fixture count ever clears 100,
  it outranks all three NGS keys on prior evidence — worth noting so NGS
  enthusiasm doesn't skip the queue.

## Sources

- Repo: `docs/brain/signal-ledger-scale-fit.md` (2026-09-30 fit, raw scales,
  within-vs-between table, join-failure measurement); 
- Repo: `packages/prediction-engine/src/signal-scale-fit.ts`,
  `tune-signal-weights-grouped.ts` (`multiplierFrom`), 
- Repo: `apps/web/lib/ops/player-crosswalk.ts` (commit `d824d2b`),
  `apps/web/lib/nflverse/ngs-signal-project.ts` (keys, samples, weight=0);
- Repo: `docs/research/2026-09-21/nextgenstats-profile/ngs-implementation-playbook-2026-09-21.md`
  (CPOE XGBoost/SageMaker, 36k attempts, r²=0.98; RYOE "Zoo" 2D-CNN, 2020 Big
  Data Bowl);
- Scratch `AGENTS.md` 2026-09-30: FTN drops-as-misses CPOE finding
  (@realfrankbrank), @AjayTakes "Future Top 12" backtest standard;
- Web: CPOE YoY r=0.375 —
  https://github.com/bruddaondabeat/nfl_qb_analysis/blob/HEAD/research/stability_findings.md;
- Web: RYOE 2.5% season carryover, O-line confound —
  https://github.com/srsavas42/fantasy-football-research/commit/9a10e67738a403d9d7eaaed6c20ae65811c60cc7;
- Web: efficiency stats add nothing once points known (2017–2025) —
  https://github.com/zinkelburger/fantasy-football-tool/blob/HEAD/site/posts/17-buy-targets-not-efficiency.md;
- Web: separation grids weakest prior / overfitting risk —
  https://github.com/espechtsoftware/nfl-predictions/blob/HEAD/reports/2026-08-11-fantasy-points-data-utilization.md;
- Web: CPOE model spec —
  https://github.com/sportsdataverse/nfl-data/blob/HEAD/docs/models/cpoe.md.
