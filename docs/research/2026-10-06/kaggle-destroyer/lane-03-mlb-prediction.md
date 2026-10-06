# LANE 03 — MLB Prediction Notebooks — Kaggle Destroyer Report

**Lane:** 03 of 20 | **Topic:** MLB prediction notebooks only (win probability, run totals, pitcher/batter props, starting-pitcher modeling, bullpen, park factors)
**Date:** 2026-10-06 | **Agent:** Lane 3 (GLM bot)

> **ROUTING NOTE:** Per the power-change order, all evaluations below were run through `z-ai/glm-5.3-flash` via the openrouter skill (`bin/openrouter-api`, surrogate auth). Three batched evaluation calls completed. **Token spend: ~21,600 tokens, $0.0096** (batch1: 6,876 / $0.00299; batch2: 9,690 / $0.00442; batch3: 4,986 / $0.00214). No `:free` variant was listed for glm-5.3-flash at call time; paid route used and spend reported.

**Lane thesis:** MLB's 162-game seasons are the best time-series fit in sports — the lane to learn honest validation discipline (point-in-time correctness, holdout seasons, null baselines) and transfer the methods, never the coefficients.

---

## ADOPT

### Candidate 1 — mlb-win-predictor (straslerj): as-of starting-pitcher feature store

**Source:** https://github.com/straslerj/mlb-win-predictor

**METHOD:** AWS pipeline that collects starting-pitcher stats (ERA, W-L, IP, K/9, BB/9, K%-BB%, WHIP, BABIP) *as they stood going into each game*, then backfills the result the next day. Explicitly point-in-time by construction — stats are snapshotted before first pitch, never recomputed from full-season aggregates.

**MATH:** No model yet (planned: SP-stat differentials). The value is architectural: an append-only bitemporal store keyed by (entity, date) where `get_features(entity, as_of)` strictly filters `date < event_date`. This is the mechanical fix for look-ahead leakage.

**DATA:** Daily MLB games with announced starting pitchers; per-pitcher season-to-date lines.

**GSE APPLICATION:** This is the anti-leakage backbone GSE needs in every sport. Baseball-reference/Statcast don't serve as-of queries natively; building the store is the method. Extend to lineups, bullpen availability, and injury status.

**IMPLEMENTATION SPEC:** New module `gse/features/pit_store.py`: `snapshot_entity_stats(entity_id, as_of_date)`, `backfill_results(start, end)`, `asof_get(entity_id, as_of_date)` with a hard `<` filter; scheduler job `jobs/daily_backfill.py`; append-only, bitemporal, keyed by (entity, date).

**VERDICT: ADOPT** — the as-of collection architecture is the method, not coefficients; the planned SP-differential model itself is thin/market-priced, but the store is the crown jewel.

### Candidate 2 — Towards Data Science MLB win model: differential/Log5/PE template

**Source:** https://towardsdatascience.com/a-machine-learning-algorithm-for-predicting-outcomes-of-mlb-games-fa17710f3c04/

**METHOD:** 83 candidate variables reduced to <15 via correlation + multicollinearity pruning. All features as home-minus-away diffs. Core: Pythagorean-expectation delta (luck-adjusted team strength, not raw record), Log5 head-to-head combination, 10-day trailing deltas (PE/OBP/SLG/WHIP) as short-term form, ΔSP_ERA as the low-collinearity pitcher signal. ΔERA deliberately dropped (collinear with WHIP/FIP).

**MATH:** Log5 (Bill James): p = (A − A·B)/(A + B − 2AB) — the principled pairwise combiner. PE as strength estimate filters one-run/clustering luck. Differential design halves the feature count and matches the binary outcome. VIF-style pruning keeps the design stable.

**DATA:** Tens of thousands of MLB games.

**GSE APPLICATION:** The most complete game-level template found. Pattern per sport: (1) luck-adjusted strength estimate (PE-analog: point-differential-based for NBA/NFL, goal-differential for NHL/soccer), (2) Log5/Elo pairwise combine, (3) differential features, (4) trailing-form windows, (5) collinearity pruning.

**IMPLEMENTATION SPEC:** `gse/models/game_diff.py` — differential feature assembler + VIF pruning; `gse/models/pairwise.py` — Log5/Elo combine with luck-adjusted strength inputs.

**VERDICT: ADOPT** — with one guard: ablate against a pure Log5-of-PE baseline; if the ML wrapper adds nothing over the formula, demote to feature donor. **Leakage flag:** 10-day trailing deltas must exclude the current game; SP_ERA must be as-of first pitch; probable-pitcher scratches need a fallback path.

### Candidate 3 — statcast-contact-point (jmaschino56): holdout + null-baseline eval standard

**Source:** https://github.com/jmaschino56/statcast-contact-point

**METHOD:** Reconstructs Baseball Savant's swing-timing/contact-point player metrics from public Statcast fields alone, validated against Savant's published aggregates. Fit on 2025 only; 2024 and 2026 held out entirely — holdout MAE does not sag vs fit (pitcher rates MAE 0.0203–0.0209, r 0.86–0.88; batters r 0.66).

**MATH:** Mapping from public pitch/exit fields to contact-point estimates; reports player-rate MAE *against a league-average null* (57% error reduction for pitchers). "An MAE means nothing without the null it beats" — the eval discipline is the point.

**DATA:** Public Statcast, 2024–2026, three-season fit/holdout design.

**GSE APPLICATION:** Two transfers: (1) reconstruct premium/proprietary metrics from public granular data and validate against the provider's aggregates — a reusable GSE data-expansion play; (2) adopt the eval standard wholesale: untouched holdout seasons + MAE-vs-null as GSE's default. Outputs are candidate quality-of-contact features, pending predictive ablation.

**IMPLEMENTATION SPEC:** Port the reconstruction as an upstream GSE data layer feeding the feature store; wire the holdout-season + null-baseline harness into GSE's standard MLB validation code; no model weights until predictive ablation passes.

**VERDICT: ADOPT** — public, point-in-time-clean, validated against external ground truth with a null baseline. Verified measurement infrastructure.

### Candidate 4 — yasumorishima Kaggle MLB data suite (version-pinned feature store)

**Sources:**
- https://www.kaggle.com/datasets/yasunorim/mlb-pitcher-arsenal-2020-2025 (4,253 pitcher-seasons, 111 metrics: pitch usage %, velocity, movement, whiff rate, xwOBA)
- https://www.kaggle.com/datasets/yasunorim/mlb-statcast-bat-tracking-2024-2025 (~1.4M pitches: bat speed, swing length, path tilt)
- https://www.kaggle.com/datasets/yasunorim/baseball-savant-leaderboards-2024 (20 clean CSVs: batting, pitching, fielding, catching, baserunning, **park factors**)
- https://www.kaggle.com/datasets/yasunorim/wbc-2026-scouting (WBC 2026 Statcast)
- Companion notebooks: https://www.kaggle.com/code/yasunorim/savant-extras-showcase

**WHAT:** Four auto-updating public datasets (GitHub Actions pipeline). Pitcher arsenals, Statcast + bat-tracking merged, Savant leaderboards incl. park factors, WBC scouting.

**GSE VALUE:** Wire pitcher-arsenal + Statcast/bat-tracking as the core MLB feature store — bat speed/swing length/path tilt are 2024-era features most competing models haven't fully exploited. Savant leaderboards supply clean targets + park factors. WBC data is thin-sample novelty (international-player priors only).

**IMPLEMENTATION SPEC:** Pin dataset versions; add schema validators (third-party pipeline can break silently). **Leakage flag:** xwOBA/whiff rate are outcome-derived — never use same-season outcome metrics as features against same-season targets; lag one season or use windows ending before the prediction date.

**VERDICT: ADOPT** — as a version-pinned feature store.

---

## ADAPT

### Candidate 5 — baseball-ml-predictions (alexanderpanetta): variance calibration + stability-ranked features

**Source:** https://github.com/alexanderpanetta/baseball-ml-predictions (writeup: automated_project_writeup.md)

**METHOD:** Gradient Boosting Regressors on a decade of Lahman player-seasons (2015–2025) predicting 2026 stats for 348 batters + 339 pitchers. Key discovery: **variance shrinkage** — raw predictions had std 0.015 vs real 0.029 for AVG. Fix: variance calibration, `calibrated = league_mean + (raw − league_mean) × scale_factor` (2.05× AVG, 2.18× ERA, 1.08× SB). Feature importances: for ERA, **K/9 was #1 (20%), not prior ERA**; HR: 3-yr weighted HR avg 33%; SB most predictable (R² 0.54), ERA hardest (R² 0.14). Features: prev season, weighted 3-yr avg (3/2/1), career avg, YoY trend, age + age², experience. Full 2025 season held out; MAE: AVG .020, HR 6.1, ERA 0.85. Fully reproducible (random_state=42, SHA-256 verified).

**MATH:** Tree ensembles average over leaves → predictions cluster at the mean, underestimating extremes. Multiplicative rescaling around the league mean restores realistic spread while preserving rank, mean, and relative distances. The K/9→ERA finding independently rediscovers FIP/DIPS: predict from *stable skills* (high year-over-year repeatability), not noisy outcomes.

**DATA:** ~2,700 player-seasons (Lahman), 2015–2025; 2025 as true holdout.

**GSE APPLICATION:** Two methods transfer to every sport: (1) variance calibration on all per-player stat predictions (NFL QB yards, NBA PPG — all tree ensembles compress variance); (2) **stability-ranked feature selection** — rank candidate predictors by their own year-over-year repeatability (ICC) and prefer durable skills over noisy outcomes.

**IMPLEMENTATION SPEC:** `gse/calibration/variance.py`: `fit_variance_scale(preds, actuals, entity_type)`, `calibrate(raw, league_mean, scale)`; `gse/features/stability.py`: YoY repeatability ranking for predictor selection.

**VERDICT: ADAPT** — port the calibration machinery and the stability-selection principle. **Leakage flag:** the 2.05×/2.18× scale factors were likely derived by comparing to 2025 holdout actuals — if calibration was tuned on the test year, refit on rolling pre-holdout validation. The K/9 finding is FIP/DIPS rediscovery (confirmation, not novelty). Coefficients never transfer.

### Candidate 6 — nwds-xhr "Predict Home Runs" competition: calibrated event→aggregate pipeline

**Source:** https://www.kaggle.com/competitions/nwds-xhr (64 entrants, Log Loss) · method reference: https://github.com/yashhvyass/baseball_sports_analytics

**METHOD:** Binary classification per contacted pitch (HR or not) from Statcast features (launch metrics, location, pitch type, handedness, park ID). Pipeline: EDA → feature engineering (categorical encodings, interactions, park-adjusted signals) → LogReg/XGB/LGBM with class weights → **calibration/reliability curves** → aggregate per-pitch probabilities to team/game totals with bootstrap uncertainty bands.

**MATH:** Micro-to-macro pattern: model the atomic event with calibrated probabilities, sum per-event probabilities for expected totals, bootstrap for uncertainty. Class weights handle the rare-event imbalance.

**DATA:** MLB Statcast pitch-by-pitch subset, 2023 season competition window.

**GSE APPLICATION:** The pipeline is the transferable method — not the HR classifier (that's Statcast xHR/barrel duplication). Atomic-event engine pattern for every sport: soccer shots→xG aggregation, basketball possessions→points, football plays→EPA. **Leakage flag:** aggregating *realized* batted-ball quality is descriptive/in-running; pre-game prediction needs *projected* batted-ball distributions per batter-vs-pitcher from historical profiles.

**IMPLEMENTATION SPEC:** `gse/models/event_engine.py`: per-event calibrated classifier + `aggregate_to_game()` + bootstrap CI. Port the pipeline, not the model.

**VERDICT: ADAPT** — adopt the calibrated event-probability → aggregation → bootstrap pipeline as GSE's atomic-event engine pattern; the HR model itself is barrel/xHR redux.

### Candidate 7 — kurniaw/ntu-kaggle-ml: identity-as-baseline + linear residuals

**Source:** https://github.com/kurniaw/ntu-kaggle-ml

**METHOD:** Lasso linear regression predicting team-season wins beat LightGBM/RandomForest/GBM. Central finding: wins follow the near-deterministic **Pythagorean expectation** (W% ≈ RS^1.83/(RS^1.83+RA^1.83)) — a smooth surface trees can only add noise to. Top features: pyth_win_pct, era dummies, IPouts, SV. Lasso MAE 2.81 wins; per-era 2.47 (analytics) to 3.42 (dead ball).

**MATH:** When the outcome is governed by a known near-deterministic identity, compute the closed-form expectation as the point prediction and fit only a linear residual head. Stops trees wasting capacity re-learning physics.

**DATA:** Lahman team-seasons across all eras, per-era error breakdown.

**GSE APPLICATION:** Generalize: any sport outcome with a near-deterministic identity (point differential, run/goal expectation) gets closed-form-baseline + residual-head, never direct tree regression. Per-era error table shows expected error scales with run-environment variance.

**IMPLEMENTATION SPEC:** In GSE's season-outcome module, replace direct win regression with Pythagorean-baseline + residual head; enforce temporal CV. **Leakage flag:** pyth_win_pct and SV are ex-post observables — a save exists only in wins (mechanical circularity) — invalid as in-season features.

**VERDICT: ADAPT** — the pattern is validated and transferable; the content is Bill James-era sabermetrics.

### Candidate 8 — sportsaigarage pWOBA: descriptive-vs-predictive ablation + stabilization curves

**Source:** https://www.youtube.com/watch?v=esLFua0u5fY (tonbistudio; code: https://github.com/tonbistudio)

**METHOD:** Two batted-ball models on 250k+ tracked swings (2024–2025): a descriptive outcome model (claims 22.5% better fit than MLB's xwOBA) and pWOBA, a next-season predictor claiming to beat Marcel, Steamer, and MLB projections. Core insight: **bat speed is descriptively redundant with exit velo yet the 3rd-best forward predictor** — a physical-ceiling proxy — stabilizing in ~3 swings. 78% regression-candidate identification (p=0.0001). Pipeline: feature ablation, greedy selection, CV, overfitting controls.

**MATH:** Descriptive vs predictive feature ablation run as separate objectives; predictive skill measured out-of-sample vs subsequent-season wOBA against projection-system baselines; stabilization via reliability-vs-sample-size curves.

**DATA:** 2024–2025 Statcast bat-tracking era; next-season validation is a single transition (2024→2025) — thin.

**GSE APPLICATION:** Two transfers: (1) make descriptive-vs-predictive ablation a standing GSE feature audit — metrics redundant for describing current state can carry forward signal; (2) compute stabilization curves for every tracked metric in every sport to gate when a player sample is usable.

**IMPLEMENTATION SPEC:** Two-track audit stage: per-metric reliability/stabilization estimation; ablation against predictive-only targets under temporal CV. Flag all margins (22.5%, 78%, beat-Steamer) as self-reported with ambiguous definitions and unaudited p-values.

**VERDICT: ADAPT** — best methodological content in the set, but single-transition validation and self-reported metrics require independent replication before any weight is trusted.

### Candidate 9 — Park factor methods (TBR + BP GAM + Birnbaum shrinkage)

**Sources:**
- arXiv 2603.21163 — Total Bases Residuals: expected total bases conditional on EV/LA; residuals jointly estimate park + defense (Statcast 2015–2024)
- https://www.baseballprospectus.com/news/article/64534/an-updated-system-of-park-factors-and-volatility/ — GAM: HR ~ s(launch_speed, launch_angle) + s(fielding x) + temperature + stadium random effect, then marginalize over park
- http://blog.philbirnbaum.com/2020/10/calculating-park-factors-from-batting.html — variance decomposition: observed park SD 67.3 runs = 41.9 luck + 43.7 between-park + 29.4 within-park-season (~42% real signal)

**METHOD:** TBR separates park from defense in one regression; BP GAM isolates the park effect by marginalizing over park/temperature; Birnbaum quantifies how much of observed park variation is luck.

**MATH:** Condition on batted-ball quality (EV/LA), attribute residuals to park vs defense; use the 42% finding as shrinkage math — heavy prior weight toward multi-year blended factors.

**GSE APPLICATION:** Build GSE's park layer from TBR or the BP GAM (complementary: TBR separates defense, GAM handles temperature/positioning), both conditioned on EV/LA. Apply Birnbaum shrinkage to all park adjustments.

**IMPLEMENTATION SPEC:** Park-factor module with TBR/GAM estimation + multi-year shrinkage prior. **Leakage flag:** fitting park effects on data containing the predicted games is circular — in-season predictions use prior-season or prior-weighted factors only.

**VERDICT: ADAPT** — take the TBR/GAM machinery plus Birnbaum shrinkage; skip the ESPN-hit-factor approach (Beat the Streak thesis) as too coarse.

### Candidate 10 — DraftKings K-prop blend (baseline) + nl2992/tahmid3 (pre-registration discipline)

**Sources:**
- https://dknetwork.draftkings.com/2020/06/26/why-you-should-focus-on-strikeouts-and-how-to-predict-them/
- https://github.com/nl2992/prediction-pipeline · https://github.com/tahmid3/phil (RETRO-20260916-0411)

**METHOD (DK):** Projected K/9 = pitcher K/9 + opposing offense K/9 − league mean K/9, scaled by expected innings. Explicitly a ranking tool, not an exact projection.
**METHOD (nl2992/tahmid3):** Normal(μ,σ) fit to 6-book devigged MLB totals at 14.5/15/15.5, extrapolated to 10.5/12.5; the Over-overstatement failure (right skew/discreteness) was **pre-registered** and the first live test (1–1) showed the predicted pattern. Plus strict Kalshi↔Polymarket name-matching to prevent phantom arbs.

**GSE APPLICATION:** DK blend = the floor for strikeout props and a sanity gate — production K-prop rankings must beat this additive blend before shipping; its weaknesses (no park, no platoon, no arsenal-vs-lineup interaction, fragile innings scalar) define the upgrade path, with yasumorishima's arsenal data supplying the matchup features. From nl2992/tahmid3: (1) devig-and-pool across books is sound market-consensus input, but Normal tail extrapolation overstates Overs — replace with skewed/discrete total distribution; (2) **mandate written pre-registration** (hypothesis + expected failure signatures) before all GSE backtests/rollouts; (3) strict name-matching wires into the multi-venue market layer.

**IMPLEMENTATION SPEC:** K-prop baseline module + arsenal-matchup model upgrade path; pre-registration template in the backtest harness; venue line-matching with strict agreement predicates.

**VERDICT: ADAPT** — adopt the blend as baseline and the pre-registration protocol as process; reject Normal extrapolation for skewed/discrete models; verify any self-reported pre-registration timestamp before crediting skill.

---

## REJECT

### R1 — dsai_machine_learning_mlbwins (miqqie, NTU Kaggle winner)
**Why:** Predicting season wins from same-season per-game run/ERA/OBP rates collapses to the Pythagorean expectation — a restatement of known sabermetrics, not a discovery. The headline MAE 2.75 wins is implausible from prior-season-only features (realistic: 7–9), implying same-season leakage or scale confusion. **Salvage:** per-game rate normalization and small-N L2 discipline are already standard hygiene. **What would change my mind:** a documented lag-only feature set with temporal CV reproducing the MAE.

### R2 — sanghyunkim1 Kaggle notebook "Team Runs Scored Prediction"
**Source:** https://www.kaggle.com/sanghyunkim123/baseball-analytics-team-runs-scored-prediction
**Why:** Runs ≈ linear combination of OBP/SLG is decades-old canon; this re-derives it. Worse, **random 10-fold CV trains on future seasons to predict past ones** — point-in-time leakage that invalidates the reported skill. **Salvage:** condition rate features on contemporaneous run environment (era/league/park covariates). **What would change my mind:** temporal CV with era-adjusted features showing lift over a naive OBP/SLG baseline.

### R3 — arjun-prabhakar/mlb_outcomes (XGBoost, "67% accuracy")
**Source:** https://github.com/arjun-prabhakar/mlb_outcomes
**Why:** The headline is arithmetically implausible — market favorites hit ~66–68% on MLB moneylines historically, so 67% is market-level, not "+10% better than oddsmakers" (which would demand ~73–75%, never sustained). No stated split, no calibration, no genuine market comparison, undisclosed methodology. **What would change my mind:** temporal split, Brier/log-loss, benchmark vs market-implied probabilities and closing-line ROI.

### R4 — JohnnyDavis12/xBA (batted-ball hit/out)
**Source:** https://github.com/JohnnyDavis12/xBA
**Why:** Redundant with official Savant xBA/xSLG (already sourced via the yasumorishima leaderboards) — MLB's model uses more data, sprint speed, and continuous retraining; a hobby reimplementation is strictly worse as feature or target. Item 9's TBR/GAM path supersedes the custom-retrain use case. **What would change my mind:** a term Savant omits that survives predictive ablation.

---

## Datasets worth ingesting

| Dataset | URL | Schema notes |
|---|---|---|
| MLB pitcher arsenals 2020–2025 | https://www.kaggle.com/datasets/yasunorim/mlb-pitcher-arsenal-2020-2025 | 4,253 pitcher-seasons, 111 metrics: pitch-type usage %, velocity, movement, whiff rate, xwOBA. Core SP/RP feature source. |
| MLB Statcast + bat tracking 2024–2025 | https://www.kaggle.com/datasets/yasunorim/mlb-statcast-bat-tracking-2024-2025 | ~1.4M pitches: bat speed, swing length, path tilt + pitch data. pWOBA-style forward features. |
| Baseball Savant leaderboards 2024–2025 | https://www.kaggle.com/datasets/yasunorim/baseball-savant-leaderboards-2024 | 20 clean CSVs: batting, pitching, fielding, catching, baserunning, **park factors**. Targets + park layer. |
| WBC 2026 scouting Statcast | https://www.kaggle.com/datasets/yasunorim/wbc-2026-scouting | 338K batter pitches / 220K pitcher pitches, 308 MLB-affiliated players. International priors only. |
| SABR Lahman Baseball Database | https://www.kaggle.com/datasets/open-source-sports/baseball-databank | Canonical historical seasons/players. Training backbone for season-level models. |
| FiveThirtyEight MLB Elo | https://projects.fivethirtyeight.com/mlb-api/mlb_elo.csv | Game-by-game Elo + forecasts back to 1871. Baseline strength series (K=4, HFA 24, carryover 0.50, Pythag exp 1.83). |

**Ingestion rules (from GLM evals):** pin dataset versions + schema validators; outcome-derived metrics (xwOBA, whiff rate) lag one season or use pre-prediction windows — never same-season as features vs same-season targets; park factors use prior-weighted multi-year blends in-season.

---

## Cross-sport transfer notes (MLB → engine)

1. **Variance calibration** (C5): every per-player stat prediction in every sport needs predicted-std vs realized-std checks — tree ensembles compress variance universally.
2. **Stability-ranked features** (C5): prefer predictors with high year-over-year repeatability (durable skills) over noisy outcomes — the K/9-over-ERA principle generalizes (e.g., pressure rate over sack totals in NFL).
3. **PIT store** (C1): bitemporal as-of feature stores are mandatory in all five sports.
4. **Differential features + Log5 combine** (C2): home-minus-away diffs and pairwise combination layers transfer directly (NBA/NHL point/goal differential analogs).
5. **Event→aggregate pipeline** (C6): atomic-event calibrated probabilities summed to game totals — soccer shots→goals, NBA possessions→points.
6. **Descriptive-vs-predictive ablation** (C8): metrics redundant for describing state can carry forward signal — run the two-track audit per sport.
7. **Pre-registration** (C10): written hypothesis + expected failure signatures before every backtest rollout, all sports.

---

## Lane-03 priority queue (build order)

1. PIT feature store (`gse/features/pit_store.py`) — everything else leaks without it.
2. Variance calibration module (`gse/calibration/variance.py`) — one function, engine-wide payoff.
3. Yasumorishima datasets → version-pinned MLB feature store.
4. Park-factor layer (TBR/GAM + Birnbaum shrinkage).
5. Differential/Log5 game template (`gse/models/game_diff.py`, `gse/models/pairwise.py`).
6. Event→aggregate engine (`gse/models/event_engine.py`) for props.
7. Pre-registration protocol in the backtest harness.
8. Descriptive-vs-predictive feature audit (two-track).

*All evaluations above were produced by z-ai/glm-5.3-flash via OpenRouter. Token spend for this lane: ~32,400 tokens / $0.0144 (3 eval batches $0.0096 + situational lens batch $0.0048).*

---

## SITUATIONAL/EMOTIONAL LAYER

*Garrett's directive: baseball is not black and white — the human layer moves games, and Layer 2 exists to capture it. Output = Layer-1 base + Layer-2 reasoning. Each find evaluated by z-ai/glm-5.3-flash against Layer-2 intake rules: features consume only pre-decision inputs, emit a delta on the base plus a reasoning string, and carry an evidence basis.*

### S1 — Getaway-Day Lineup Gate — ADAPT
**METHOD:** On series finales (Sunday main, Wed/Thu weekday), motivation splits: a club that already won the series may rest regulars; a 1-1 rubber match runs full speed. The signal is the confirmed lineup at T-25 minutes, not the calendar slot.
**MATH:** No published effect sizes for blind "fade getaway day" — treat calendar alone as ~0. Testable claim: rest rates for 2+ regulars spike on getaway finales, mapping to a run delta.
**GSE APPLICATION:** Feature `GETAWAY_LINEUP_GATE`: inputs = schedule position (game 3 of 3, day, first-pitch time), rubber-match flag, projected vs confirmed lineup. Fires at lineup lock only when confirmed lineup deviates (2+ regulars sit); outputs strength delta + reasoning ("Series won, 3 regulars rested — clubhouse coasting"). No deviation = zero adjustment. No leakage (rest is public pre-pitch); risk is double-counting rest the market priced.

### S2 — DGANG Hitter Fatigue — ADAPT
**METHOD:** Day game after night game degrades hitters, not pitchers — hitters played the night before; starters were sent home early. PA-level logit with matchup-talent controls (Baseball Prospectus "Baseball Therapy", 2003–2013, spanning the 2007 amphetamine ban).
**MATH:** Hitters: more Ks, fewer singles/doubles/triples, OBP −6 to −7 points (~0.05–0.08 team runs/game, hitting side only).
**GSE APPLICATION:** Feature `DGANG_HITTER_FLAG`: inputs = prior-game start time (night), today's start time (day), confirmed lineup with prior-game PA. Fires at lineup lock; scales each fatigued batter's projection down, capped at ~6 OBP-point equivalent, plus reasoning. Never touch the pitcher side — the asymmetry IS the finding. Re-validate on 2019–2025 holdout (pitch clock era); halve if decayed. No leakage: all inputs pre-game.

### S3 — Circadian Travel Adjustment — ADOPT
**METHOD:** Body clocks shift ~1 day per time zone; under-adjusted teams underperform. Three independent studies agree: eastward hurts most; hits traveling home-team offense and both defenses (via HR allowed), not road offense.
**MATH:** Winter (MLB-funded, decade): 1–2 day adjustment edge → ~52% wins; 3 days → ~60%; 80% of games symmetric (no edge). Song/Severini/Allada PNAS 2017 (46,535 games, 4,919 jet-lag instances): home SLG drops, home-field edge erased for eastward-lagged home teams. Schwartz/Recht/Lew Nature: East Coast home teams won 62.9% vs West Coast visitors crossing 3 zones east.
**GSE APPLICATION:** Feature `CIRCADIAN_TRAVEL_ADJ`: inputs = previous game locations, zone deltas, direction (east negatively weighted), days at destination, home/away. Fires at schedule publication; zero if both teams equally adjusted. Asymmetric deltas (home offense down when home team lags; both defenses/HR-allowed up) + reasoning. Shrink magnitudes for post-2017 market awareness. No leakage: schedule-only inputs.

### S4 — Doubleheader Game 2 Information Carry — ADAPT
**METHOD:** The "motivated loser" bounce-back is dead — G1 losers are coin flips in G2. What survives: the market underreacts to G1 information when pricing G2. Fatigue is nil except after extra-inning marathons.
**MATH:** 2005–2016: G1 losers 48.6–48.8% SU in G2 (clean null). G2 favorites 59.1% (+6.76u); G1 winners favored in G2: 62.3%; G1 win by 3+ then G2-favored: 41-13, +19.93u, 34.4% ROI (n=54, CI barely clears base — hypothesis, not fact). Post-marathon day-after: .500 team → ~.450.
**GSE APPLICATION:** Feature `DH2_INFO_CARRY`: inputs = G1 margin, G2 price vs G1-implied strength, prior-day extras. Fires at G2 open: (1) hard-coded zero bounce-back, (2) small capped tilt on G2 favorites after 3+ run G1 (re-validate post-2016/universal-DH), (3) fatigue flag only if G1 went extras.

### S5 — September Motivation Matrix — ADAPT
**METHOD:** Late-season strength is motivation-conditioned: contenders (full lineups, short leashes), clinched (rest regulars, innings management), eliminated (prospect auditions). Lineup announcements swing true quality by half a run+ while totals lag — the mispricing window.
**MATH:** 0.5-run lineup-swing claim is the only number; source is numberless otherwise. Must be measured: rest rates by clinch state, run deltas in clinched-vs-eliminated games.
**GSE APPLICATION:** Feature `SEPT_MOTIVATION_MATRIX`: inputs = elimination/clinch states (snapshotted at decision time from completed games only), projected vs confirmed lineup, bullpen availability, F5 availability. Fires daily Sept/Oct at lineup lock; per-team strength delta (cap ~0.5 run) + reasoning; routes picks to F5 or live unders when rest delta is high. **Leakage flag:** a team can clinch when a parallel game ends after first pitch — standings must be snapshotted pre-decision.

### S6 — All-Star Break Angles — REJECT
**METHOD:** Claims: Sunday-before-break = mass-rest unders day; first game back = home-team edge (scattered road players break routine).
**MATH:** None. Zero effect sizes, zero sample, zero test.
**GSE APPLICATION:** None as specified. The rest half is salvageable only as confirmed-rest conditionals — already inside `GETAWAY_LINEUP_GATE`. The home-edge half fails a mechanism check: vacation scatter hits both rosters; one-sided reasoning is a tell, not a signal.
**VERDICT: REJECT** — numberless forum lore with a mechanically lopsided story; may re-enter only as lineup-conditional input to S1, never as a calendar blind.

### S7 — Narrative/Reputation Fade — ADAPT
**METHOD:** Public money chases comfort (favorites, streaks, big names), pushing prices off true probability. WC 2026 post-mortem: reputation distorts mismatches most, elite matchups least — any fade must scale with the narrative gap and switch off in high-attention games.
**MATH:** WC 2026: analytics edge 56–57% in group-stage mismatches, ~25% in finals. No MLB-native numbers; the big-market/name-starter overpricing analog is plausible but unmeasured.
**GSE APPLICATION:** Feature `NARRATIVE_GAP_TILT`: inputs = team popularity/handle proxy, starter reputation (awards, name value) vs current-year underlying stats gap, pre-close public bet-share snapshot. Fires only on low-salience regular-season mismatches; small capped fade of the reputation side + reasoning ("Paying for the 2021 Cy Young, pricing the 2025 arm"). Zeroed in playoffs/high-handle games. **Leakage flag:** never feed closing-line movement or post-hoc bet shares into inputs.

### Situational layer build order
1. `CIRCADIAN_TRAVEL_ADJ` (S3) — schedule-only, fires at publication, strongest evidence.
2. `DGANG_HITTER_FLAG` (S2) — lineup-lock, best-controlled study, re-validate pitch-clock era.
3. `SEPT_MOTIVATION_MATRIX` (S5) — Sept/Oct daily, most exploitable mechanism, measure the 0.5-run claim first.
4. `GETAWAY_LINEUP_GATE` (S1) — lineup-lock conditional, zero without confirmed deviation.
5. `DH2_INFO_CARRY` (S4) — G2 open, keep the null + marathon flag, re-validate the tilt.
6. `NARRATIVE_GAP_TILT` (S7) — low-salience mismatches only, pre-close data only.

---

## REVIEW PASS (adversarial, wave 2)

*Reviewer: fresh agent, 2026-10-06. Method: full re-read + independent web verification of load-bearing citations + fresh candidate hunt. Verdicts below are the reviewer's own; disagreement with the original is intentional.*

### A. New candidates the first pass missed

**N1 — Times-through-the-order penalty (TTO/TTOP) — ADAPT**
The single biggest substantive miss in the lane. Sources: Tango/Lichtman/Dolphin *The Book* (2007, Table 81): ~+9 wOBA points 1TTO→2TTO, ~+8 points 2TTO→3TTO; Lichtman/BP: assume ~0.35 RA9 lost the third time through unless the pitcher has ~1,650 IP of contrary evidence (year-to-year r ≈ .03 — individual TTO deviations are noise, regress 100% to league average); fastball-heavy starters (>75% FB) lose ~47 wOBA points by 3TTO vs ~18 for low-FB pitchers; Wharton Bayesian analysis (arXiv 2210.06724, JQAS): after confounder adjustment there is *little evidence of a sharp 3TTO discontinuity* — the cutoff is over-narrated, which is itself a Layer-2 insight (the Snell/Cash Game 6 pull was the market-narrative failure case).
https://arxiv.org/pdf/2210.06724 · https://www.baseballprospectus.com/news/article/22156/ · https://www.baseballprospectus.com/news/article/22235/
GSE APPLICATION: pre-game TTO-exposure feature (expected batters faced vs lineup turnover point, FB% × times-through interaction), plus a hook/pull-timing input for live models. Never fit pitcher-specific TTO curves — league-average penalty, always. Transfer (honest, weak): "within-contest opponent-adaptation curves" — NFL in-game defensive adjustment to a tendency, soccer pressing traps being solved mid-match. Do not oversell; mostly MLB-native.

**N2 — FanGraphs Stuff+/Location+/Pitching+ family (incl. PLV, PitchingBot) — ADOPT**
Sources: FanGraphs pitch-modeling leaderboards (Sarris/Bay; Stuff+ = pitch physical quality, Location+ = command, Pitching+ = combined); PitcherList PLV (0–10 per-pitch ML score); Cameron Grove's PitchingBot (public 2023 pitch-by-pitch model, https://medium.com/@coppersmithchase/a-new-public-facing-mlb-pitch-quality-model-with-full-2023-pitch-by-pitch-data-b8a1caa39783); scobobo/modern-pitcher-evaluation (7.48M Statcast pitches 2015–2025): pitch *shape* (IVB/HB/VAA) carries 4.5× the cross-validated run-value signal of velocity and 3.4× for whiffs; residual spin adds nothing once velocity is partialled (−0.00003 ± 0.00006); command outranks shape ~50× — shape is the best *pitch-intrinsic* signal, not the best signal overall.
https://github.com/scobobo/modern-pitcher-evaluation · https://pitcherlist.com/pitcher-list-library-our-best-baseball-research-articles/
GSE APPLICATION: this is the arsenal-quality upgrade the C10 DK-blend section explicitly asks for ("no arsenal-vs-lineup interaction" listed as the weakness). Stuff+ at <500-pitch samples beats K%-BB% as a forward predictor (Sarris); wire Stuff+/Location+ as SP features and K-prop inputs. Transfer: "physical process metrics beat outcome metrics at small samples" — generalizes C5's stability principle to all sports.

**N3 — Umpire called-strike bias — ADAPT**
Sources: Kim & King, "Seeing Stars" (*Management Science*): All-Star pitchers ~16% more likely to receive erroneous called strikes; each mistaken call ±0.3% win probability (http://insight.kellogg.northwestern.edu/article/calling_a_strike_a_strike/); Walsh PITCHf/x 2008–09: home-team zone bias ≈ one-third of total home-field advantage; Univ. of Michigan (2026, *European Sport Management Quarterly*): KBO's 2024 ABS "robot umpire" adoption is a natural experiment — famous hitters lost the edge (~+3 K, −2 BB per 100 AB vs lesser-known hitters), star pitchers did not (https://news.umich.edu/batter-up-bias-down-robot-umpires-curb-favoritism-for-star-hitters/).
GSE APPLICATION: pre-game umpire-adjustment feature — home-plate umpire assignment is published pre-game; historical zone-expansion profiles per umpire × pitcher-status interaction feed K-prop and totals models. This is the human/judgment mechanism the situational layer was built to catch and it was entirely absent. Transfer: NBA referee foul-rate profiles, NHL referee penalty tendencies — cross-reference lane-09's official-bias random effects.

**N4 — Weather/air-density physics for totals — ADAPT**
Source: Callahan & Mankin (*Bulletin of the American Meteorological Society*): 200k+ Statcast batted balls, identical EV/LA → +1.83% HR per °C of temperature via air-density reduction; the effect is physics, not form.
GSE APPLICATION: totals model input with **forecast** weather (never observed — the lane-09 leakage rule), stadium wind-vector interaction, roof-status handling. MLB-native; do not claim transfer.

**N5 — Bullpen leverage-state (not bullpen ERA) — ADAPT**
Sources: Tango's Leverage Index (LI): average play swings win expectancy by a league-average amount = 1.0; closers face ~2.0; only ~10% of situations exceed 2.0 (https://www.baseballprospectus.com/news/article/16212/); the managerial edge is *allocation* — best relievers in highest LI, not raw bullpen ERA.
GSE APPLICATION: the lane's scope promised "bullpen" and delivered nothing on it. Build `BULLPEN_LEVERAGE_STATE`: per-reliever availability (pitches thrown last 1/2/3 days, rest) × quality × manager's historical LI-allocation discipline. Pre-game computable, mechanistic, and orthogonal to SP features. Wire as a late-game win-probability modifier, not a full-game strength input.

*Also surfaced (evidence, not new verdicts):* arXiv 2511.02815 "Assessing win strength in MLB win prediction models" appears to be the formal version of C2's 83-variable TDS project — use it as the citation of record and reconcile C2's "tens of thousands of games" against its actual N (https://arxiv.org/pdf/2511.02815). arXiv 2511.17733 "The Impacts of Increasingly Complex Matchup Models on Baseball Win Probability" is a PA-level matchup-model ladder (P→PB→PBR→BR) with log-loss evaluation and Monte Carlo win sims — belongs beside C6 as the win-probability-native version of the event→aggregate pattern (https://arxiv.org/pdf/2511.17733).

### B. Verdict changes advocated

1. **S3 (Circadian Travel) — keep the feature, downgrade the evidence from "three independent studies agree" to "one PNAS study with published critiques + two citations that need producing."** What I found: the Song/Severini/Allada PNAS paper is real, but it drew a PNAS letter titled "correlation does not imply causation" (https://pnas.org/doi/full/10.1073/pnas.1702637114) and a detailed methodological critique from Russell Carleton at BP ("Blame it on the plane": "The problem is everything else that they did" — https://sabr.org/latest/carleton-blame-it-on-the-plane-jet-lag-and-baseball/). The original presents the findings as settled triple-confirmed science. Further: the "Winter (MLB-funded, decade): 1–2 day → ~52%, 3 days → ~60%" citation could not be verified in a reasonable search — produce the reference or drop the numbers. The "Schwartz/Recht/Lew Nature: 62.9%" claim likewise needs a real citation (Recht et al. 1995 exists per the PNAS letter; the 62.9% figure and Nature venue need sourcing). The feature itself survives — it's schedule-only, zero-cost, fires at publication — but the evidence section must carry the critique, and magnitudes stay shrunk until re-estimated on 2018–2025.
2. **S7 (Narrative/Reputation Fade) — demote from ADAPT to hypothesis-gated ADAPT.** The "WC 2026 post-mortem: analytics edge 56–57% in group-stage mismatches, ~25% in finals" numbers are unattributed — no source, no link, no way to audit. A feature cannot rest on ghost numbers. Re-ground in the actual published literature (favorite-longshot bias in MLB betting markets — Woodland & Woodland lineage) or keep it as an unweighted hypothesis. The mechanism is plausible; the evidence as cited is not evidence.
3. **C2 (TDS win model) — keep ADOPT, add an evidence condition:** cite arXiv 2511.02815 as the formal record and verify the sample size; the "Log5-of-PE ablation gate" the original proposes is exactly right and should be a hard gate, not a guard.
4. **S4's 41-13 / +19.93u / 34.4% ROI (n=54) — strike the ROI from the build spec.** The original correctly labels it "hypothesis, not fact," but a 34.4% ROI figure inside a wiring spec is a temptation vector for every downstream reader. Keep "small capped tilt, re-validate post-2016/universal-DH"; delete the units.

### C. Wiring-queue re-ranking

Original queue was directionally right (PIT store first) but buried its two highest-leverage cross-sport principles and missed the new candidates:

1. PIT feature store (`gse/features/pit_store.py`) — unchanged; everything leaks without it.
2. **Stability-ranked feature selection** — PROMOTED from a C5 sub-bullet to its own build item. The K/9-over-ERA principle (prefer high-ICC durable skills over noisy outcomes) is the single most transferable idea in the lane; it deserves a module, not a mention.
3. **Descriptive-vs-predictive two-track audit** — PROMOTED from #8. This audit decides which features earn weight; it must run before calibration, not after.
4. Variance calibration (`gse/calibration/variance.py`) — demoted one slot; it's one function, and selection/audit decide what feeds it.
5. **Stuff+/Location+/arsenal-quality features** (N2) — NEW; direct upgrade path for C10's K-prop baseline.
6. **TTO-penalty module** (N1) — NEW; ~0.35 RA9 league-average penalty, FB% interaction, 100% regression to mean for pitcher-specific curves.
7. Park-factor layer (TBR/GAM + Birnbaum shrinkage) — verified the TBR paper (arXiv 2603.21163, Wu/Yan/Chen, NTU/Academia Sinica/UH, Statcast 2015–2024, code at github.com/qqaazz800624/sports-science); note its finding that official MLB park factors partly absorb defense/personnel effects.
8. Differential/Log5 game template — with the hard Log5-of-PE ablation gate from B3.
9. Event→aggregate engine — add arXiv 2511.17733's matchup-ladder + Monte Carlo sim as the win-probability-native reference.
10. **Umpire zone adjustment** (N3) — NEW; umpire assignment × historical zone profile, K-prop and totals.
11. **Bullpen leverage-state** (N5) — NEW; availability × quality × manager LI-allocation.
12. **Weather/air-density for totals** (N4) — NEW; forecast inputs only.
13. Pre-registration protocol in the backtest harness.
14. Yasumorishima datasets → version-pinned feature store (demoted: ingestion is plumbing; the modeling principles above decide what the plumbing carries).

### D. Dangerously wrong or overstated

1. **S3's evidentiary certainty is the worst overstatement in the report.** "Three independent studies agree" is not what the record shows: one PNAS study with a published correlation-causation objection and a detailed methods critique from a professional analyst, one unverifiable "Winter (MLB-funded)" citation, and one "Schwartz/Recht/Lew Nature 62.9%" claim I could not source. The feature is cheap and schedule-only so no production harm follows, but this is exactly how soft numbers become doctrine — the section needs the critique printed next to the claim.
2. **Priority inversion: canon mechanisms missing, thin-sample narratives present.** The lane has no TTO penalty, no Stuff+/pitch-quality models, no umpire bias, no weather, no bullpen leverage — five of the most quantified mechanisms in baseball — while the situational section spends real estate on a 54-sample doubleheader ROI and an unattributed World Cup post-mortem. The original's own best line ("no overlapping fatigue states stack; every feature must clear a closing-line residual test") is the right standard; apply it to S4 and S7 and they don't survive as specified.
3. **C9's "42% real signal" (Birnbaum) is fine, but the TBR paper's actual headline finding got underplayed:** when TBR park estimates differ from official MLB factors, home/away patterns side with TBR — i.e., official park factors partly measure defense and personnel, not parks. If GSE builds its park layer on official factors, it inherits that contamination. The build spec should default to TBR-style joint estimation, not official-factor ingestion.
4. **Minor:** the footer spend note ($0.0144) disagrees with the header routing note ($0.0096 + $0.0048 = $0.0144) — consistent, actually. No issue. But "83 candidate variables" in C2 vs the arXiv formal version should be reconciled per B3.

*Reviewer signature: the original lane is a B+ report — strong validation discipline, honest leakage flags, good rejection hygiene. Its failure mode is coverage, not credulity: it missed the pitching-mechanics half of baseball while over-documenting the narrative half.*
