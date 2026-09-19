# The path from 38: opponent-adjusted EPA is alive, validated, and activates itself in Week 5

**Date:** 2026-09-19 (overnight run, founder-directed: "find the solutions and path forward")
**Method:** read-only production SQL (Neon `gse-postgres`, `hermes_ro` role), nflverse public
play-by-play (CC-BY 4.0), pre-registered train/test evaluation. No writes to any database.
No gate, flag, floor, schema, or MODEL_VERSION touched.

## Executive summary

The claim "the single largest structural upgrade available (opponent-adjusted EPA) is not
built" is now measured to be WRONG in an encouraging direction:

1. **The upgrade is built, ingesting, and wired end to end.** It is cold-start gated at
   `NFL_EPA_MIN_GAMES = 4`, so it cannot emit until Week 5 (2026-10-08+). Zero historical
   rows carry it because they were priced before the table filled and `forceReprice` has
   never run. One operator command backfills all of 2025.
2. **The algorithm passes its pre-registered kill line out of sample** (2025 W1-8 fit,
   W9-18 test, n=151): RMSE 13.32 vs 13.60 raw, Spearman 0.393 vs 0.323 raw. The market
   spread remains clearly ahead (RMSE 12.25, Spearman 0.490, Brier 0.220), which is the
   honest context: this is a better model column, not an edge over the market.
3. **Turnover occurrence-vs-recovery passes its kill line too**: expected TO differential
   (shrunk occurrence rates, recovery at 50%) predicts W9-18 actuals at Spearman 0.375 vs
   0.219 for naive persistence; recovery-share persistence is ~0.151, i.e. luck, as doctrine
   says. This is the validated evidence for a v5.3.0 factor input.
4. **New measured defect for the gate design:** the independent blend's decision tiers are
   miscalibrated on MLB. SPEAK, the strongest tier, realizes 40.0% (n=90, Wilson
   [0.305, 0.503]) against a stated 0.592. LEAN overstates by 11.5 points (n=689). PASS
   rows, the no-opinion underdogs, realize 50.5% against a stated 0.404. NCAAF LEAN is the
   only conservative stratum (78.2% vs 0.720, n=206). Per-sport table:
   `data/decision_tier_calibration_by_sport.csv`.

## Finding 1: the EPA path is alive, not dead code (root cause of its absence)

Measured against production, read-only:

```
team_game_efficiency by season
  2025 REG   544 rows  weeks 1-18   (complete season)
  2025 POST   26 rows  weeks 19-22
  2026 REG    34 rows  weeks 1-2    (last fetch 2026-09-18, fresh)
picks carrying independentEdge:            1,582
picks carrying an nfl_epa_adj source:          0
```

The ingestion cron exists and works (`/api/cron/backfill-team-efficiency`, 07:15 daily).
The blend consumer exists (`build-independent-fair-values.ts` step 9,
`tryNflEpaFairValue`), and BOTH live pick paths call the blend at generation time
(`generate-signal-slate.ts:411`, `process-sport.ts:1230`).

The source never fires for two compounding reasons:

- **The design gate.** `NFL_EPA_MIN_GAMES = 4` (`packages/prediction-engine/src/
  nfl-epa-fair-value.ts:29`) returns null until each team has 4 games of history. Teams
  enter Week 3 with 2 games, Week 4 with 3, Week 5 with 4. First priceable game:
  **Week 5, on/after 2026-10-08.** This is correct cold-start behavior, not a bug.
- **No retry.** `backfill-independent-trueprob` skips rows that already carry
  `independentEdge.trueProb` unless `forceReprice: true` (the flag's own doc comment names
  this exact use case: "after new free sources like mlb_standings / nfl_epa_adj land").
  All settled rows were priced before the table filled on 2026-09-09, so all of them are
  permanently locked to their pre-EPA source sets.

**Action (operator/founder, no code change):** run the existing
`/api/cron/backfill-independent-trueprob` route once with `forceReprice: true` after Week 4
data lands (or now for the 2025 rows, which already have 17 games per team). From Week 5
the source joins the blend automatically on every future NFL pick, no deploy needed.

## Finding 2: the adjustment survives its kill line (evidence, not opinion)

Pre-registered before evaluation: fit on 2025 REG weeks 1-8, predict weeks 9-18 game
margins, adjusted must beat raw EPA by >= 0.2 RMSE and tie-or-beat on Spearman, or the
claim dies and is reported as null. n = 151 test games.

| method | RMSE | MAE | Spearman | log-loss | Brier | win% acc |
|---|---|---|---|---|---|---|
| raw EPA (unadjusted) | 13.597 | 11.100 | 0.323 | 0.6728 | 0.2396 | 0.563 |
| opponent-adjusted | **13.322** | **10.889** | **0.393** | **0.6689** | 0.2368 | 0.603 |
| adjusted, play-weighted | 13.387 | 10.956 | 0.393 | 0.6717 | 0.2379 | 0.616 |
| market spread (context) | 12.245 | 10.174 | 0.490 | 0.6271 | **0.2200** | 0.609 |

The kill line passes: -0.275 RMSE, +0.070 Spearman. The market stays ahead of every model
variant, which is exactly the repo's standing doctrine: the market is the anchor and the
best available ensemble; a model column that moves TOWARD it is a better input to the
conjunction gate, never a replacement for the market check.

Note the market's Brier here: 0.2200 on 151 games. The repo's "no-skill" floor discussion
(0.22) is at market level on this slice; a model variant scoring 0.2368 is between a coin
flip (0.25) and the market.

**Fitted conversion, for whoever tunes the constants (founder-gated scoring change):**
on full 2025, margin = 45.4 x (net EPA/play diff) + 2.1, residual sd 11.5. The repo's
`nfl_epa_adj` constants are scale 0.12 EPA/play and HFA 0.025 EPA (~1.1 pts) versus a
fitted HFA of ~2.1 pts. That is a measurable gap worth a calibration pass under the next
MODEL_VERSION bump, not a silent edit.

## Finding 3: turnover occurrence model survives (the second named upgrade)

Pre-registered: occurrence = shrunk forced-INT rate per opponent dropback + shrunk
forced-fumble rate per play; recovery modeled at 50%; claim survives iff expected TO
differential beats naive actual-TO persistence at predicting W9-18 actual TO margin.

| predictor of W9-18 actual TO margin | Spearman | RMSE |
|---|---|---|
| naive: actual TO diff W1-8 | 0.219 | 6.04 |
| expected (occurrence + 50% recovery) | **0.375** | **5.52** |

Recovery-share persistence W1-8 vs W9-18: Spearman 0.151 on 32 teams, consistent with
~0, confirming recovery is luck and occurrence is the skill. Per-team table:
`data/turnover_expected_vs_actual_2025.csv`. 2026 W1-2 luck flags (small samples, role
check only): ATL/BUF/KC kept 100% of own fumbles (lucky), DET/NYG 75%.
`data/turnover_luck_2026.csv`.

This is the measured basis for wiring occurrence-based expected turnovers as a factor
input in v5.3.0 (a scoring change, founder-gated, MODEL_VERSION bump required).

## Finding 4: the blend's own decision tiers, measured per sport

Published, decided picks carrying `independentEdge` (read-only SQL, 2026-09-19):

| sport | tier | W-L | n | realized | stated trueProb | Wilson 95% |
|---|---|---|---|---|---|---|
| MLB | SPEAK | 36-54 | 90 | **0.400** | 0.592 | [0.305, 0.503] |
| MLB | LEAN | 395-294 | 689 | 0.573 | 0.688 | [0.536, 0.610] |
| MLB | PASS | 138-135 | 273 | 0.505 | 0.404 | [0.447, 0.564] |
| NCAAF | LEAN | 161-45 | 206 | 0.782 | 0.720 | [0.720, 0.833] |
| NCAAF | PASS | 24-15 | 39 | 0.615 | 0.515 | [0.459, 0.751] |
| NFL | LEAN | 27-18 | 45 | 0.600 | 0.632 | [0.455, 0.730] |
| NFL | PASS | 9-11 | 20 | 0.450 | 0.479 | [0.258, 0.658] |
| MLS | LEAN | 70-45 | 115 | 0.609 | 0.654 | [0.517, 0.693] |
| MLS | PASS | 12-26 | 38 | 0.316 | 0.499 | [0.191, 0.475] |

Readings that matter for the v5.3.0 conjunction gate:

- **MLB SPEAK is inverted and the interval excludes the stated value.** The strongest
  tier performs worst. This is the same anti-predictive-at-the-top shape already measured
  for the book-path `confidence`, now measured on the independent blend's own
  `trueProb`/`decision` on the largest stratum. A conjunction gate that treats
  decision-tier as evidence must not trust MLB tiers until the composite refit.
- **PASS rows are not "wasted wins to veto away".** They are underdog sides the model
  explicitly has no opinion on; they realize near coin-flip (50.5% MLB) against a stated
  0.404. The founder's PASS-veto call is an honesty call about the factor trail (never
  publish a row the engine declines to price), not a record improvement; the measured
  record of PASS rows is roughly breakeven, not toxic. State it exactly that way.
- **NCAAF LEAN is underconfident** (realized above stated, interval excludes stated),
  the only stratum with that direction at meaningful n.
- **NFL is too thin to conclude from** (n=45 LEAN, interval spans 0.455-0.730). More
  settled NFL rows remain the binding constraint; the W5 EPA activation adds a real
  source to every future NFL row automatically.

## Forward artifacts (research, NOT picks)

- `data/ratings_blend_2026_w2.csv` — current opponent-adjusted ratings, DAVE-style blend
  (w = games26/(games26+8); w is 0.111 for teams with one 2026 game, 0.2 for the two
  teams with two). SEA -0.123 net leads; NYJ -0.569 trails.
- `data/w3_2026_slate_model_vs_market.csv` — Week 3 margins from the blended ratings vs
  posted spread. The model disagrees with the market by 10+ points on several games; per
  standing doctrine that is a hypothesis, not an edge: the ratings do not know injuries,
  QB changes, or travel. The artifact exists to be scored after the weekend, which is
  exactly how the blend earns or loses its place.
- `data/decision_tier_calibration_by_sport.csv` — the tier table above.
- `data/validation_opponent_adjustment.csv`, `data/turnover_expected_vs_actual_2025.csv`,
  `data/turnover_luck_2026.csv`, `data/team_game_efficiency_prod.csv` (production extract
  used for the ratings; raw pbp and schedules re-downloadable, see scripts).

## The sequenced path (owners and gates)

1. **Operator/founder, no code:** one `forceReprice: true` pass of
   `backfill-independent-trueprob` (after W4 data lands, or now for 2025 rows) so 2025
   settled history carries the EPA source for calibration training. Cost: one cron
   trigger. Unblocks: NFL calibration training data.
2. **Agents, no gate:** score the W3 slate artifact after the weekend; measure
   `nfl_epa_adj` per-tier calibration as soon as W5 rows exist (two weekends of data is
   enough for a first direction, per the n>=138 rule not yet met).
3. **Founder call (already queued in the gate design):** the PASS veto. Measured
   framing above: honesty of the factor trail, not record improvement.
4. **Founder-gated scoring changes (v5.3.0, one MODEL_VERSION bump, frozen holdout per
   law 11):** (a) refit the composite so tier ordering is monotone in realized outcomes —
   the MLB SPEAK inversion and the confidence inversion are the same defect family;
   (b) wire opponent-adjusted EPA net as a factor input (validation above);
   (c) wire occurrence-based expected turnovers as a factor input (validation above);
   (d) calibration pass on `nfl_epa_adj` scale/HFA constants (fitted vs repo values
   above).
5. **Sample:** nothing substitutes. The NFL strata are thin (45-65 rows); the fixes above
   change WHAT future rows carry, and only settled volume makes NFL calibration
   conclusive.

## Honest limits

- Validation is one season (2025), no confidence intervals on the rating deltas; the
  Spearman/RMSE gaps are directional evidence, not proof. The design repeats cheaply on
  2024 and earlier seasons from the same nflverse source — that repeat is the first
  follow-up.
- The 2026 blend carries 1-2 games per team; w26 is 0.111-0.2, so current ratings are
  ~80-89% 2025 prior. That is the correct early-season posture and it will drift as
  games accumulate.
- The tier table is observational (no confound control beyond sport split); the version
  stratification lesson from the ranking census applies to any future re-cut.
- Production extracts were pulled with the read-only `hermes_ro` role; the connection
  string was used in-process only and never written to any file in this repo.

## Corrections to the circulating fleet master plan (2026-09-19)

A plan titled "all_night_autonomous_agent_fleet_master_plan.md" citing this work is
circulating outside this repo. Its numbers are real and trace to this directory
(commits 4af1986ef / bf02f0ee6), but two of its conclusions are wrong and must not be
built on:

1. **"Adverse-edge pass suppression is mathematically validated on live settled data"
   is an overreach.** NFL PASS is n=20 (Wilson [0.258, 0.658]); that interval supports
   no validation. League-wide, PASS-decision rows are no-opinion underdogs realizing
   ~49.5-50.5% against a STATED 0.404-0.479: roughly breakeven, i.e. the model
   UNDERPRICES those sides. The measured framing, and the only defensible one: the
   PASS veto is an honesty call about the factor trail (never publish a row the engine
   declines to price), not a record improvement.

2. **"The DAVE-style w = N/(N+8) prior bridge solves the NFL_EPA_MIN_GAMES = 4
   cold start" does not follow.** The bridge changes what the RATINGS contain; the gate
   in `nflEpaToWinProbs` still returns null until both teams have >= 4 OBSERVED games.
   Ship the bridge alone and the source emits nothing until Week 5 and the wiring will
   look broken. The bridge justifies LOWERING the effective gate on prior-backed teams,
   which is a code change in `packages/prediction-engine/src/nfl-epa-fair-value.ts` and
   belongs to the founder-gated v5.3.0 scoring pass. What needs no code today: one
   `forceReprice: true` run of `backfill-independent-trueprob`, then automatic
   activation at Week 5 (2026-10-08+).

Minor: the plan quotes 42.54 pts per net EPA/play, which is the W1-8 TRAIN-window fit;
the full-2025 forward fit is 45.42 with ~2.1 points effective home field (table above).
Also note the one-season validation limit in "Honest limits" still stands: a
multi-season repeat (2023/2024) was attempted and ABANDONED mid-run on a home/away
orientation bug in the extension script (test scores built without home/away flipped
roughly half the signs; its "0/3 seasons" output is invalid and must not be quoted).

## Multi-season repeat (2026-09-19 late run — supersedes the single-season verdicts)

The extension was fixed (home/away now joined from the schedule; a pandas `&`-precedence
mask bug that leaked in-sample weeks into the first corrected run was also caught and
fixed) and rerun on 2023/2024/2025 own-aggregated data, plus the turnover persistence
test rebuilt to mirror the original method exactly. Tables in
`data/validation_multi_season_v2.csv` and `data/turnover_persistence_multi_season.csv`;
scripts `scripts/extend_validation_v2.py`, `scripts/turnovers_multi_season.py`.

**Opponent-adjusted EPA, ADJ vs RAW on weeks 9-18 (pre-registered: ADJ needs >= 0.2
RMSE gain AND tie-or-better Spearman):**

| season | raw RMSE/SP | adj RMSE/SP | verdict |
|---|---|---|---|
| 2023 | 13.07 / 0.354 | 13.64 / 0.313 | NULL (adj worse) |
| 2024 | 13.22 / 0.432 | 13.28 / 0.440 | NULL |
| 2025 (own-agg) | 13.85 / 0.275 | 13.86 / 0.299 | NULL |
| market | 11.69-12.53 | | ahead in every season |

**Turnover occurrence model vs naive persistence (pre-registered: beat on BOTH metrics):**

| season | naive SP/RMSE | expected SP/RMSE | verdict |
|---|---|---|---|
| 2023 | 0.170 / 6.94 | -0.051 / 6.01 | NULL |
| 2024 | 0.328 / 7.04 | 0.238 / 6.08 | NULL |
| 2025 | 0.353 / 5.76 | 0.276 / 5.25 | NULL |

**Revised conclusions (these supersede the single-season claims above and in the
AGENTS.md block of the same date):**

1. The single-season prod-table results were the favorable end of the distribution, not
   a robust effect. The EPA adjustment is NOT established out of sample; the turnover
   occurrence model improves RMSE in 3/3 seasons (consistent direction: variance
   compression toward the mean) but its rank-ordering edge does not replicate.
2. What survives everywhere, again, is the standing doctrine: the market spread beats
   every model variant in every season tested. Model-side structure helps the
   explainability and the factor trail; it has not been shown to beat the market.
3. Therefore the operative experiment is the LIVE one: when `nfl_epa_adj` activates in
   Week 5, measure its realized calibration on published picks with the same decision-
   tier harness (n and Wilson intervals, per sport) before it is granted any weight.
   The `forceReprice` backfill stays worthwhile purely because it enriches the
   calibration sample; it is NOT evidence the source improves predictions. The
   prior-bridge / MIN_GAMES-lowering change stays parked unless the live measurement
   earns it.
4. Process note for anyone re-running: the first "corrected" multi-season run was
   itself invalid (unparenthesized pandas mask: `&` binds tighter than `<=`, which
   leaked in-sample weeks into the test set and produced n=272 with a negative market
   correlation). Both bugs were found by sanity anchors (impossible market numbers,
   implausible n) before anything was reported. Anchor every evaluation output against
   a known quantity before trusting it.

## Split asymmetry + repo-constant calibration (2026-09-19 late run)

Scripts `scripts/splits_and_constants.py`; both checks hold regardless of the
adjustment verdicts above.

**1. Passing-vs-rushing asymmetry reproduces in our pipeline.** Same-game EPA
differential vs actual margin, full-season team-games (n=544/season):

| season | pass SP/PE | rush SP/PE |
|---|---|---|
| 2023 | 0.858 / 0.865 | 0.356 / 0.408 |
| 2024 | 0.826 / 0.850 | 0.406 / 0.434 |
| 2025 | 0.845 / 0.850 | 0.353 / 0.389 |

Same-game construction inflates absolute magnitudes versus the literature's team-level
numbers; the stable ~2:1 ratio across all three seasons is the signal, and it is the
quantified basis for weighting dropback EPA far above rush EPA in any v5.3.0 factor
design.

**2. The repo's EPA-to-probability constants are badly overconfident on held-out data.**
2025 W1-8-adjusted ratings, W9-18 win probabilities (n=151):

| conversion | Brier | log-loss |
|---|---|---|
| repo constants: sigmoid((net + 0.025 EPA)/0.12) | 0.3035 | 0.957 |
| fitted scale 0.204 (same HFA, 1-param fit on train) | 0.2694 | 0.764 |

Scale 0.12 scores WORSE THAN A COIN FLIP on Brier (0.25). It treats a 0.12 EPA/play net
differential as ~73% win probability where the data says ~57%. **W5 activation hazard:**
`nfl_epa_adj` will fire with these constants and inject overconfident probabilities into
`independentEdge.trueProb`, degrading the very decision tiers this repo already measured
as miscalibrated. Recommended founder-gated change before Week 5: `NFL_EPA_MARGIN_SCALE`
0.12 to ~0.20 and `NFL_EPA_HFA` 0.025 to ~0.046 EPA (the fitted ~2.1 points at ~45.4
points per EPA/play), landed with this table as the evidence and a test pinning the
held-out Brier improvement. Alternative: leave constants, measure the live source's
calibration at W5, fix with live evidence. Do not let W5 arrive with the overconfident
constants AND treat the resulting tiers as meaningful.


## Agent-directive shift (2026-09-19 late): luck signal, forceReprice boundary, split weighting

**Task 1 - turnover-luck signal landed.** `packages/prediction-engine/src/signals/luck/turnover-luck.ts`
+ `src/__tests__/turnover-luck.test.ts`: pure shrunk-recovery evaluator (K_FF = 200
pseudo-fumbles, baseline 0.50, K_INT = 150 exported for the companion occurrence
evaluator). Fixtures carry the MEASURED 2026 W1-2 counts. Honesty correction to the
directive's framing: BAL (1 fumble), CAR (1) and NYJ (1) sit at 0%/100% on n=1 - the
directive called them extremes; the module correctly floors them at NEUTRAL +
lowSample (MIN_FUMBLES_FOR_VERDICT = 2). True extremes: TB/CHI/HOU unlucky, KC/BUF/ATL
lucky. Registry/index wiring is the Gemini batch lane's; this module is standalone.

**Task 2 - split into measurable half + operator action.** The DAVE-vs-market
out-of-sample numbers under our conventions (production-table, 2025 W1-8 fit, W9-18
test, n=151): ADJ RMSE 13.322 vs market 12.245; Brier 0.2368 vs 0.2200. The FULL
rolling-origin walk-forward (every week scored from prior-week fits only, W1 excluded
as cold start, per-week fitted logistic scales for both sides, 256/272 games) is
materially worse for the model: ADJ Brier 0.2512 / log-loss 0.6958 / acc 0.535 vs
market 0.2044 / 0.5902 / 0.645. The single-split window was the favorable end; over a
real season the DAVE model is nowhere near market level, which is the quantitative
case for treating `nfl_epa_adj` as a weak Rung-2 prior in the blend - and it raises
the priority of the constants hazard below. On the fitted
conversion scale: our two fits read 42.54 pts/EPA (train window) and 45.42 pts/EPA
(full-season own-agg). A circulating 36.6 pts/EPA figure matches neither and implies a
~16% steeper probability conversion - whoever produced it needs to publish the filter
set before anyone uses it. The forceReprice run itself was NOT executed: it writes
`picks.factorBreakdown` in production, which law 7 (no database writes from an agent
session) forbids. Operator instructions: trigger
`/api/cron/backfill-independent-trueprob` with `forceReprice: true` once, from the
founder's cron path with the real secret; expected effect is re-pricing ~1.5k settled
rows to add `nfl_epa_adj` where both teams have >= 4 games (2025 season fully
qualifies); verify by re-running the sources-distribution SQL and confirming non-zero
counts, and by the cron response fields (scanned/updated/skippedNonMl/errors).

**Task 3 - split weighting kill line FIRED (report honestly).** Pre-registered:
w = 0.75 must beat pooled (w = 0.5) Spearman on BOTH 2024 and 2025 holdouts
(W1-8-adjusted split ratings, W9-18 test, in-train scale fit). Result (n=149/151):

| season | pooled(0.5) RMSE/SP | weighted(0.75) RMSE/SP | pass-only(1.0) RMSE/SP |
|---|---|---|---|
| 2024 | 13.129 / 0.446 | 13.274 / 0.429 | 13.407 / 0.407 |
| 2025 | 13.858 / 0.295 | 13.694 / 0.322 | 13.623 / 0.340 |

2024 and 2025 pull in opposite directions monotonically in w: the optimal dropback
weight is season-dependent at n=2 seasons, so a FIXED 0.75/0.25 prediction weight is
NOT established. The descriptive asymmetry (pass diff correlates ~2:1 vs rush diff)
stands; using it as a prediction reweighting does not. The asymmetry may still inform
FACTOR design (which inputs deserve capture/weight in the composite refit), which is a
different mechanism from margin arithmetic.



Python 3.11 + pandas + scipy + psycopg. From this directory:

```
python -m venv .venv (or use any env with pandas, scipy, psycopg)
# data/ must contain team_game_efficiency_prod.csv (included) plus, for turnover work:
#   pbp_2025.csv.gz, pbp_2026.csv.gz from
#   https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{year}.csv.gz
#   schedules.csv from http://www.habitatring.com/games.csv
NEON_RO="<hermes_ro connection string>" python scripts/decision_calibration.py   # needs DB
python scripts/build_ratings.py      # ratings + validation (no DB needed)
python scripts/turnovers.py          # turnover decomposition + luck
python scripts/w3_slate.py           # W3 slate artifact
```

Scripts `pull_tge.py` / `db_check.py` re-pull the production extracts (read-only).
Source files cited: `packages/ingestion-pipeline/src/build-independent-fair-values.ts`
(step 9, `tryNflEpaFairValue`), `packages/prediction-engine/src/nfl-epa-fair-value.ts`
(`NFL_EPA_MIN_GAMES = 4`), `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts`
(`forceReprice`), `apps/web/lib/ops/cron-schedule-manifest.ts:163-165`.

## SPEC (do not ship): NFL_EPA_MIN_GAMES stays 4, and the cold-start story is the wrong frame

Locked invariant: `NFL_EPA_MIN_GAMES = 4` is not bypassed because a prior exists.
This spec documents what a gate-drop WOULD do, so the founder can decide in two
minutes, and it corrects the framing the fleet has been using.

**What DAVE would fill in weeks 1-3 if the gate were dropped in v5.3.0:** a shrunk
rating = w * (1-2 games of 2026 observation) + (1-w) * 2025 final adjusted EPA,
w = N/(N+8) - at week 1 roughly 89% prior, week 2 ~80%, week 3 ~71%. The source
would emit `nfl_epa_adj` for essentially every game, adding a fifth/sixth voice to
`independentEdge` blends during the first three weeks.

**Why that is not the win it sounds like (OBSERVATION, locked):** Grok's walk-forward
measured DAVE at 7.285 CRPS on weeks 1-4 against play-pooled EPA at 7.283 - a tie
within noise. The early-season DAVE reading carries almost exactly the same
information as the play-pooled alternative the engine already has. **INFERENCE:** the
gate is not suppressing an edge; it is declining to add a redundant voice during the
window where its observations are one to three games old. Dropping MIN_GAMES buys
~0.002 CRPS (nothing) and costs blend cleanliness during the noisiest window. The
cold-start gate is not the weeks-1-3 bottleneck, and "fix the cold start" is the
wrong frame for the EPA path entirely.

**The two founder levers that DO matter, in order:** (1) the constants hazard
(`NFL_EPA_MARGIN_SCALE` 0.12 scores holdout Brier 0.3035, worse than a coin flip;
fitted 0.204 scores 0.2694 - fix or measure before Week 5, 2026-10-08); (2) the W5+
live calibration measurement of the source with the per-sport decision-tier harness.
The gate stays 4. CALIBRATION_ADJUSTMENTS_ENABLED stays false. MODEL_VERSION stays
v5.2.7.

## Seat-1 shift results (late): baseline reconciliation and three kill-line verdicts

**OBSERVATION - league recovery baseline.** Pooled 2019-2025 REG: 3,817 kept of 6,958
fumbles = 54.88% kept-share (2025 alone: 53.38%). The locked 46.3% is the COMPLEMENT
quantity: the defense-side recovery share of forced fumbles (2025 lost-share 46.62%).
The evaluator models the fumbling team's kept share, so `RECOVERY_BASELINE` = 0.5488
and `RECOVERY_LOST_BASELINE` = 0.4512; `expectedLostShare` now returns the lost share
(it previously returned the kept share - a naming/semantics bug, fixed with tests).
MoM-K on 2019-2023 team-season dispersion: tau-squared collapses to ~0, K-hat -> very
large (247,618 from the moment equation). Recovery carries NO measurable team signal;
that is the pure-luck confirmation in one number. K_FF = 200 stays the named
production constant (the K choice is inert once the predictive claim dies).

**KILL 1 - occurrence model FAILS (pre-registered: Spearman >= 0.30, n=32).** Clean,
leak-free persistence (occurrence rates from W1-8 only, test volumes league-average,
full-credit actuals = INTs forced + opponent fumbles lost): 2023 +0.094, 2024
-0.222, 2025 -0.020; mean -0.049 vs naive -0.045. The occurrence model does not beat
naive persistence and sits nowhere near the kill line. The evaluator stays Rung-1
DESCRIPTIVE (luck flags, buy-low/sell-high capture) and does NOT graduate to a
predictive factor. The earlier single-season 0.375 and the half-credit-actual variant
were softer targets that flattered the model; the honest definition kills it.

**KILL 2 - dropback/rush split weighting FAILS under the strong design.** Pre-registered:
fit w on 2019-2023 walk-forward folds, freeze, test on 2024-2025 pooled, kill
if lift < +0.05 Spearman vs pooled (w=0.5). Train-fold curve is flat (mean SP 0.307-0.316
across w 0.45-0.65, optimum w* = 0.55). Frozen test: 2024 lift -0.003, 2025 lift +0.010,
POOLED lift +0.0008. FAIL. Three independent designs have now failed (same-season
0.75, season-internal 0.55, cross-season frozen 0.55). Keep pooled EPA. The ~2:1
descriptive asymmetry stands as decomposition knowledge; it does not convert into
margin-prediction lift.

**KILL 3 - walk-forward CRPS confirms Rung-2 status (prediction: FAIL, confirmed).**
2025 rolling origin (W2-18, every week scored from prior-week fits only, per-week
in-train scales and residual sds, n=256 games): DAVE CRPS 8.239 (mean sd 10.36) vs
close 7.195 (mean sd 11.82). My close number lands near the locked 7.109 (different
season, same machinery) - sanity check passed. My DAVE number is same-season-only
(no prior-season bridge) and therefore strictly weaker than the fleet's bridged 7.500
on 7 seasons; the direction is consistent: DAVE never approaches the close. The
scale reconciliation stands: my fits read 42.54 (train-window, prod conventions) and
45.42 (full-season own-agg) pts/EPA; the circulating 36.61 (Grok, n=1,871) remains
unreconciled to my filter set and is treated as the locked blend-scale, not re-derived.

**INFERENCE (what this licenses):** the turnover-luck evaluator ships as descriptive
capture only; DAVE stays a Rung-2 prior and never a spread mu addend; pooled EPA is
the split of record; the one founder lever that matters before Week 5 remains the
constants hazard (Brier 0.3035 vs 0.2694, decision by 2026-10-08).

**NOT_RUN:** into-wind vs with-wind splits (no wind-direction column in the slim
extract used); cleat counts; 10Hz tracking (not in public nflverse); Mondrian-k
QB-change variant (locked from GROK-16, not re-derived - Var ratio 1.379 < 1.5 kill
already failed it as a candidate).

**REMAINING RISK:** all three mills run on 2019-2025 public pbp with my filter set
(REG, pass/run, no-kneel/no-spike, garbage excluded where noted). Filter-set drift
versus the fleet's locked numbers is the main reconciler risk; every table above is
reproducible from the scripts in this directory, and the CRPS machinery was
sanity-anchored on the market before the model was read.

## All-seats night pass: wind/cold/roof/tensor/sigma mills + PASS census + dual CLV (read-only)

**SEAT 3/5 MILLS (2019-2025 corpus, scripts/allseat_mills*.py, data/allseat_mills*.json):**

- **WIND (props-only; spread/total addends stay BLOCKED):** completion rate 64.56%
  (0-14 mph, n=66,528) vs 63.06% (15-19, n=6,928) vs 62.25% (>=20, n=1,796).
  The 15-19 completion deficit GRADUATES its Wilson non-overlap test; the >=20 bin
  does NOT (n too small). Yards/attempt: -2.9% at 15-19, only -1.3% at >=20 - the
  pasted "-4.5% / -8.5%" magnitudes DO NOT reproduce. EPA/dropback swing at 15-19 is
  -0.065 (claimed -0.028): direction real, magnitude ~2.3x claimed. aDOT>20 share
  declines 10.4% -> 10.0% -> 9.0% (direction real). Registry verdict: a wind props
  factor may carry the 15-19 completion effect with weight 0.00 until Rung-2;
  Gemini's -8.5% deep-yard number dies in public.
- **COLD (A29):** 29 cold games - below the pre-registered 150-game floor. NOT_RUN
  (descriptive only: EPA/dropback -0.053 cold vs +0.033 mid; completion -1.2pp).
- **RAIN/SNOW fumbles (A31):** no precipitation column in the schedule extract.
  NOT_RUN.
- **ROOF (A30):** outdoors mean total 43.22 (sd 14.13, n=5,115) vs closed 46.83
  (sd 13.40, n=591) vs open-roof 46.73 (n=128). Dome scoring premium ~+3.6 points,
  sd slightly LOWER indoors. Descriptive capture only.
- **RZ TENSOR (snap basis, pass/run plays):** 43.4% / 34.2% / 19.7% / 10.9% / 7.2%
  TD rate for bins 1-2 / 3-5 / 6-10 / 11-15 / 16-20 (n = 4,968 / 4,948 / 7,905 /
  8,989 / 9,127). This REPRODUCES the pasted lookup (44.0 / 34.6 / 20.5 / 11.6 /
  7.6) within ~1pp on every cell once definitions are clean (pass/run snaps, FG
  attempts excluded). GRADUATES as descriptive capture. Drive-basis variant:
  NOT_RUN (derivation). First pass of this mill was invalid (FG plays deflated the
  11-15 bin to 5.3% and produced a false anomaly) - definition hygiene caught it.
- **4TH-DOWN TABLE: the pasted lookup DIES.** Attempts-basis (pass/run only, TD
  counts as conversion): 4th&1 67.0% (n=2,081), 4th&2-3 56.2% (n=1,257), 4th&4-6
  47.5% (n=889), 4th&7+ 28.0% (n=988) - versus pasted 53.0 / 41.8 / 33.2 / 24.9.
  The pasted numbers do not reproduce on our corpus; the registry table must use
  OURS (selection bias caveat: teams attempt where they expect to convert).
- **SIGMA LADDER (Opus item): claim FAILS verification.** Signed margin sd, weeks
  1-4 vs 5-18, 2019-2025: 14.36 vs 14.69 (n=1,686/5,298). The claimed 13.8 vs 13.2
  is wrong in BOTH level and direction on this corpus (early-season margins are
  marginally TIGHTER, not wider). Any spread-conversion that widens September
  variance is building on the wrong ladder.

**SEAT 2 CENSUS (read-only Neon, scripts/seat2_db.py, data CSVs):**

- **PASS-VETO CENSUS: 3 live violations.** 50 published PENDING rows carry
  independentEdge; 3 have decision == 'PASS', all three are the Chicago White Sox
  -1.5 fixture-triplet: cmu7p61u2022wackfkdupcliu, cmu7rbzjc01vrno23y53tptux,
  cmu7bpw9t01dtvxyvpvt2j5cs. expectedClv < 0 violations: ZERO (the display gate that
  keys on the signed number is doing its job; these three slip through because the
  gate deliberately ignores the decision label). Founder action available: unpublish
  or display-suppress those three ids; the systemic fix (a decision-label gate) is
  withhold-only and needs no version bump, but is a founder call.
- **DUAL-DENOMINATOR CLV (Law 10): the locked 23.2% is a pooled artifact.** MLB
  TOTALS: CLV_strict 57.76% (253 BEAT / 185 LOST, n=438; Wilson ~[0.531, 0.624]) -
  the engine HAS been beating the closing total, consistently. MLB SPREAD 24.56%
  strict (421 of 592 rows are MATCHED pushes - the line barely moves). MLB ML 7.32%.
  NFL cells are tiny (totals 14 graded rows at 71.4%; spread 11 at 18.2%; ML 3 at
  66.7% - none interpretable alone). CLV_all vs CLV_strict diverges enormously on
  MLB spreads (7.1% vs 24.6%) because of the matched volume - Law 10's
  dual-denominator rule is vindicated by construction. INFERENCE: the closing-line
  edge is concentrated in MLB totals; any future CLV claims must be per-market,
  never pooled.

**SEAT 4 STATUS (referee items runnable from this tree):** model freeze untouched
(MODEL_VERSION v5.2.7 throughout this branch); zero `as any` in the new modules
(strict tsc clean); line-archive fix shape verified present
(`{ in: markets }` filter form), monitor remains TESTED-AND-UNWIRED as recorded in
AGENTS.md - wiring it into public-surface-truth is still a founder-call item.
Customer-copy audit and the archive-watchdog wiring remain with Opus's tree.

**NOT_RUN:** drive-basis RZ (derivation); rain/snow fumbles (no column); cold
graduation (29 games < 150 floor); totals-CRPS Poisson baseline (queued next shift);
QB Mondrian-k (locked, kill already failed).

## Why nothing beats the close on game margins - the one-page skeptic sign-off

Every mill this repo ran tonight and every locked result agree. The question is not
whether we can beat the closing line on game-level spreads and moneylines with public
play-by-play. We cannot, and here is the mechanism, not just the score.

1. THE SCOREBOARD (all measured on this corpus, 2019-2025): margins - best model RMSE
   13.32 vs market 12.25 (single-split; worse rolling); probabilities - model Brier
   0.2368 split / 0.2512 walk-forward vs market 0.2200 / 0.2044; totals - model CRPS
   8.167 vs close 7.303; CRPS margins - locked DAVE 7.500 vs close 7.109 on n~1,871.
   Every model family tried (Elo, play-pooled EPA, opponent-adjusted EPA, DAVE k=8,
   Fay-Herriot k-hat, split-weighted, Poisson totals) loses. Opponent adjustment and
   prior bridging move the model column by hundredths; the gap to the market is
   four-tenths of a CRPS point. No amount of the same information closes that.

2. THE MECHANISM: the close is a weighted consensus of price-setters with information
   we do not have (injury granularity, practice reports, sharp flow) plus everything
   public. EPA-family ratings are DERIVED from public play outcomes - they are a
   lossy summary of exactly the information the market already prices. A model built
   from a public aggregation cannot systematically beat the aggregation of that
   aggregation plus private information. Shrinkage estimators (DAVE, FH) reduce
   variance, they do not add information; that is why they converge toward the
   market from below and never through it.

3. WHERE AN EDGE CAN STILL LIVE (measured tonight): MLB TOTALS closing-line value -
   CLV_strict 57.76% on 438 graded rows (Wilson [0.531, 0.624]). The one market
   family where this engine has demonstrably beaten the close, hidden for months
   inside a pooled 23.2% figure that mixed it with moneylines and spreads. The
   generalizable claim: edges live in THIN markets (totals, props, derivative
   markets), not in the efficiently-priced game-margin mainlines.

4. THEREFORE, THE STRATEGY THE NUMBERS SUPPORT: stop trying to out-predict the close
   on mainlines (order the board on marketFairProb, use EPA/DAVE as Rung-2
   descriptive priors with weight 0.00 until one beats a close-matched backtest);
   point the signal factory at thin markets where the 57.8% live; and treat every
   future factor the way tonight treated wind and fourth downs - milled or it does
   not exist.

Signed against the numbers: every figure above traces to a command in this directory
or an AGENTS.md-locked measurement; re-run scripts/ to dispute any line.

## Gap-sweep pass: signal modules landed, CLV stability, W3 artifact corrected

**SIGNAL MODULES (code, weight 0.00, Rung 1):** the mills are now consumable modules,
not comments:
- `packages/prediction-engine/src/signals/environmental/high-wind-prop-decay.ts` +
  7 tests: MEASURED table only (15-19 mph completion -1.5pp / YPA -0.318 / deep-target
  -16.6% rel; >=20 mph returns neutral+notEstablished). THROWS on spread/ML/total
  contexts (wind addends BLOCKED). Replaces the dead pasted lookup at the path
  Gemini's Batch 8 would have used - merge resolves to the measured version.
- `packages/prediction-engine/src/signals/tactical/down-distance-conversion-tensor.ts`
  + 7 tests: RZ snap tensor (43.4/34.2/19.7/10.9/7.2) + 4th-down attempts table
  (67.0/56.2/47.5/28.0) + 4th&1 run/pass split (71.2/54.6) with selection-bias
  caveat. The pasted 53.0/41.8/33.2/24.9 does not exist in this file.
- Full engine suite WITH these modules: 283 files / 3,168 tests / 0 failures;
  engine tsc clean; 0 `as any`.

**W3 SLATE ARTIFACT CORRECTED:** the first CSV shipped a sign-broken edge column
(model - market across differing conventions). Regenerated
(`scripts/w3_slate_v2.py`, conventions stated in-script: spread_line positive = home
favored, verified empirically; edge_home_view = model - market, positive = model
likes the home side more). Largest divergences: SEA@WAS -10.5 (model likes the
home side less), CIN@PIT +9.7, NYJ@DET +8.1. Hypotheses for Tuesday's scoring,
not picks.

**MLB TOTALS CLV STABILITY (pre-stated kill: strict < 52% in either season half ->
unstable):** Apr-Jun commence 62.39% (n=117); Jul+ 56.07% (n=321). BOTH halves clear
52% - the edge PERSISTS across the season, larger sample still strong. Honest
caveats: fills are near-single-book (FanDuel-heavy), CLV grading coverage begins
June (settled<Jun window is empty by coverage, not by absence of edge), early-half
n=117. VERDICT: observed and persistent within coverage - the strongest per-market
signal this repo has measured, and the primary target for the thin-market strategy.
Data: `data/mlb_totals_clv_stability.csv` (needs NEON_RO), script
`scripts/mlb_totals_stability.py`.

**DELIBERATE SKIP:** books-depth replica re-query - the v5.2.7 stratum was measured
hours ago (n=86/116, not established); no new settled rows have landed since. A
redundant query would be theater, not diligence.
