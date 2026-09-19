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


## Reproduction

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
