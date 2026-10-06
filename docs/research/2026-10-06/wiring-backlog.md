# GSE Engine Wiring Backlog — 2026-10-06

**Garrett's directive:** everything gets wired. Everything from research — X, arXiv, Kaggle.
**Audit date:** 2026-10-06. **Method:** every claim grounded by grepping `intelligence/`, `apps/web/lib/`, `apps/web/app/`, `scripts/`, `gse-ml-service/` on `origin/main` (ac4befcae). "Wired" = importable code (3+ files), not a docs mention. "Partial" = 1–2 files (likely mentions, not implementation).

## Executive summary

| Source | Inventoried | Wired | Partial | Not wired |
|---|---|---|---|---|
| X analytics sweeps (33 sections, 221 items) | 35 metric concepts | 23 | 4 | **9** |
| Brain ingestion operators | 15 | 7 | 1 | **7** |
| arXiv BUILD-QUEUE top-20 ADOPT | 20 | 3 | 3 | **14** |
| Kats components | 7 | 0 | 0 | **7 in progress (Jules)** |

**Total backlog: 30 not-wired + 8 partial = 38 items below, in priority order.**
Priority = (engine value) × (1/effort). Size: S = days, M = 1–2 weeks, L = 3+ weeks.

---

## TIER 1 — High value, small effort (wire this week)

### X-1. Robbed Score — @AjayTakes (2026-10-05 PM, item 1)
**What:** Buy-low WR composite: (Route Win Rate − TPRR) + uncatchable target % + (XFPTS − FPTS), mapped vs Separation Score. Fully specified formula, 178.6K-view post, data @FantasyPtsData.
**Wire task:** Implement as a WR buy-low signal in the props/fantasy layer; needs X-2 (Route Win Rate) as a prerequisite input.
**Size:** S (formula is given; inputs are the work).

### X-2. Route Win Rate
**What:** WR route-win % — core input to Robbed Score, inventoried via @AjayTakes 2026-10-05 PM.
**Wire task:** Compute from nflverse/charting data as a receiver feature; expose in the WR evaluation pipeline.
**Size:** S.

### X-3. YPRR (Yards Per Route Run)
**What:** Standard WR/TE efficiency metric. Inventoried 5×: @ScottBarrettDFB 2026-09-30 PM, @DevyEusuf 2026-10-01 PM, @Keeegs2 2026-10-03 AM, @MagicSportsGuy 2026-10-04 AM, @FantasyPtsData 2026-10-05 PM. Only a glossary mention in `apps/web/lib/fantasy/academy.ts` — not computed.
**Wire task:** Compute YPRR from routes-run and receiving yards; add to receiver features.
**Size:** S.

### X-4. Pass Rush Win Rate (incl. True Pass Set variant)
**What:** ESPN pass-rush win rate; @ColeJacksonFB 2026-10-05 PM item 48 specifies the "True pass set" variant (cleaner signal). Also @PFF 2026-09-30 PM, @Anthony_Rivardo 2026-10-03 AM, @arch_ramki 2026-10-04 AM.
**Wire task:** Ingest or compute PRWR (overall + true-pass-set) as a defensive-line feature for QB pressure modeling.
**Size:** S–M (depends on data source: ESPN API vs derived from nflverse).

### X-5. Separation Score
**What:** WR separation metric; the Y-axis Robbed Score maps against. @ScottBarrettDFB 2026-09-30 PM item 14, @DevyEusuf 2026-10-02 PM item 20.
**Wire task:** Compute or ingest separation-at-target/catch as a receiver feature.
**Size:** S.

### B-1. Equalized coverage (arXiv:1908.05428) — TRANSFER
**What:** Brain ingestion §5.5: "NOT EMPTY" — trains inside strata we define (week bucket, QB-change, roof/wind, book, rest, coast-mismatch). Small strata fail closed.
**Wire task:** Implement equalized-coverage conformal intervals stratified by the defined game strata; wire into the calibration layer alongside existing Mondrian/CQR.
**Size:** S–M.

### B-2. Jackknife+ — conformal
**What:** Brain ingestion §5.3. Leave-one-out conformal intervals; stronger than split conformal on small samples.
**Wire task:** Add Jackknife+ as a UQ option in the calibration module next to CQR/split conformal.
**Size:** S.

### X-6. Contested Catch Rate
**What:** WR contested-target conversion. Inventoried across sweeps; zero code hits.
**Wire task:** Add as a receiver feature (hands/50-50 ball skill).
**Size:** S.

### X-7. Double Team Rate (pass rush)
**What:** OL/DL double-team % — pass-rush context. Zero code hits.
**Wire task:** Ingest as a defensive-line feature (explains PRWR: high double-team + high PRWR = elite).
**Size:** S.

### X-8. Stuff Rate (run defense)
**What:** % of runs stopped at/behind the line. Zero code hits.
**Wire task:** Compute from play-by-play as a run-defense feature.
**Size:** S.

### X-9. Off-Target Throw %
**What:** QB accuracy metric independent of receiver. @PattonAnalytics 2026-10-01 AM item 8. Zero code hits.
**Wire task:** Add as a QB accuracy feature (complements CPOE).
**Size:** S.

---

## TIER 2 — High value, medium effort (wire this month)

### A-1. Engine residual mining — `2608.05207` (BUILD-QUEUE #4, INVENT)
**What:** Freeze the pick engine, mine residuals (actual − predicted) for corrective features. The engine finds its own blind spots.
**Wire task:** Build a residual-mining pipeline: freeze current engine, compute residuals on historical games, run feature discovery over the residual series.
**Size:** M.

### A-2. SportsAlpha signal miner — `1601.00991v1` (BUILD-QUEUE #3, INVENT)
**What:** Grammar-based miner generating/testing thousands of formulaic signals ("factor zoo"). Gate: mean |IC| ≥ 2× hand-built baseline, mean pairwise |corr| ≤ 0.25.
**Wire task:** Implement the formulaic-alpha grammar + backtest harness; run against 2023–2025.
**Size:** M–L.

### A-3. Conformalized selective regression — `2402.16300` (BUILD-QUEUE #9)
**What:** Regression with a learned "don't predict" gate — abstention for low-confidence props.
**Wire task:** Add selective-regression abstention to the props pipeline (pairs with the already-wired conformal selective prediction #8).
**Size:** M.

### A-4. Weather-aware conformal coverage — `2606.19642` (BUILD-QUEUE #11)
**What:** Conformal intervals conditioned on weather (wind/temp) for outdoor games.
**Wire task:** Extend the conformal calibration layer with weather-conditioned coverage; wire to the weather ingest.
**Size:** M.

### A-5. In-play calibration evaluation — `2010.00781v1` (BUILD-QUEUE #10)
**What:** Framework for evaluating calibration of live/in-play probabilities.
**Wire task:** Build the in-play calibration eval harness (needed before any live-betting calibration claims).
**Size:** M.

### B-3. Skellam margin — STRUCTURE-ONLY, legal bake-off
**What:** Brain transfer operators: Skellam on scoring events (drives that score), then a learned map from event-difference to points (FG/TD/safety mixture). Pre-register against the Gaussian close; if it loses, it stays in the library.
**Wire task:** Implement Skellam event model + points-mixture map; run the pre-registered bake-off vs Gaussian-close CRPS 7.109.
**Size:** M.

### B-4. Hawkes at event grain — STRUCTURE-ONLY
**What:** Brain transfer operators: intensity λ(t)=μ+Σα·exp(−β(t−tᵢ)) on explosive plays/scores/turnovers after EPA is accounted for. Estimate α, β on nflverse.
**Wire task:** Fit marked Hawkes on nflverse event sequences (explosive plays, scores, turnovers); use as a tempo feature, never on the game mean.
**Size:** M.

### B-5. Karlis–Ntzoufras bivariate Poisson — STRUCTURE-ONLY
**What:** Brain ingestion §3.3. Bivariate Poisson for correlated scores.
**Wire task:** Implement as a library model for the bake-off suite (margin/total joint modeling).
**Size:** M.

### B-6. James–Stein / Efron–Morris — finish the TRANSFER
**What:** Brain transfer operators: positive-part shrinkage on player EPA, catch rate, success rates. Currently PARTIAL (2 files). Banned on the game mean (the close is already the shrinkage); legal on rates.
**Wire task:** Complete the JS shrinkage module for player-level rate features; wire into the player projection layer.
**Size:** S–M.

### A-6. Bet timing as optimal stopping — `2105.08877v2` (BUILD-QUEUE #13, DECIDE)
**What:** When to place the bet (not just what to bet) as an optimal-stopping problem.
**Wire task:** Build the timing model on historical line-movement data; output: bet-now vs wait signal.
**Size:** M.

### A-7. Hybrid season simulation — `2304.09918v2` (BUILD-QUEUE #16, MODEL)
**What:** Season simulator combining statistical models with structural components.
**Wire task:** Build the season-sim engine for futures/props simulation.
**Size:** M.

### X-P1. Explosive Play Rate — finish (PARTIAL, 2 files)
**What:** Already referenced in 2 files but not a first-class feature.
**Wire task:** Promote to a computed feature in the offense/defense evaluation layer.
**Size:** S.

### X-P2. True Pass Set PRWR — finish (PARTIAL, 2 files)
**What:** @ColeJacksonFB's cleaner PRWR variant; mentioned in trust-signals but not computed.
**Wire task:** Implement true-pass-set filtering on pass-rush snaps, then compute PRWR on the filtered set.
**Size:** S–M.

---

## TIER 3 — Strategic, large effort (quarter-scale)

### A-8. Neural-head symbolic distillation — `2602.21307v2` (BUILD-QUEUE #1, INVENT)
**What:** Distill the neural win-probability head into a ≤10-term closed-form equation (torch-symbolic + PySR). Garrett's "machine-invented stats" flagship — a publishable proprietary GSE metric.
**Wire task:** Wrap the neural head, run distillation, validate ≤10 terms + 0.01 MAE on held-out 2025 W1–4 + 20% MAE beat vs linear baseline.
**Size:** L.

### A-9. PySR equation discovery on nflverse — `2305.01582v3` (BUILD-QUEUE #2, INVENT)
**What:** Symbolic regression over nflverse play-by-play to discover closed-form football metrics. First target: a passer metric beating passer rating/QBR.
**Wire task:** Set up the PySR pipeline on nflverse; gate: discovered equation beats passer rating/QBR by ≥0.05 Pearson r on held-out 2024–2025, ≤15 tree nodes.
**Size:** L.

### A-10. Offline RL for the bet slate — `2006.04779v2` CQL (BUILD-QUEUE #12, DECIDE)
**What:** Conservative Q-Learning for sequential bet decisions.
**Wire task:** Build the offline-RL slate optimizer on historical bet outcomes.
**Size:** L.

### A-11. Chronos/Moirai TSFM backbone — `2503.12107v1` (BUILD-QUEUE #17, MODEL)
**What:** Time-series foundation model backbone for cross-sport series.
**Wire task:** Evaluate Chronos/Moirai as the global time-series backbone (complements the Kats per-series work currently in flight).
**Size:** L.

### A-12. flexBART tabular learner — `2211.04459v3` (BUILD-QUEUE #18, MODEL)
**What:** Drop-in Bayesian additive regression trees for the tabular engine.
**Wire task:** Benchmark flexBART vs current XGBoost/tabular stack on the harness.
**Size:** M–L.

### A-13. DID + synthetic-control causal toolkit — finish (BUILD-QUEUE #14, PARTIAL)
**What:** Causal inference toolkit (difference-in-differences + synthetic control). 1 file currently.
**Wire task:** Complete the toolkit: pre/post intervention analysis for coaching changes, injuries, trades.
**Size:** M.

### A-14. SportSQL NL-query layer — `2508.17157v1` (BUILD-QUEUE #19, INFRA)
**What:** Natural-language query over the sports data warehouse.
**Wire task:** Build the NL→SQL layer on the engine's data marts.
**Size:** M–L.

### A-15. MinervaScore — finish (BUILD-QUEUE #5, PARTIAL, INVENT)
**What:** Statistical "seal of approval" separating real signals from backtest luck. 2 files currently. The quality gate for the whole INVENT pipeline.
**Wire task:** Complete the MinervaScore harness; require it for every invented metric before it touches the GSE score.
**Size:** M.

### A-16. Uncertainty-under-shift harness — finish (BUILD-QUEUE #7, PARTIAL)
**What:** 1 file currently. Evaluate uncertainty quantification under distribution shift (season transitions, rule changes).
**Wire task:** Complete the shift-eval harness.
**Size:** M.

### B-7. Maher 1982 independent Poisson — baseline (library)
**What:** Brain ingestion §3.1. The independent-Poisson baseline everything else beats. Not wired because it's a baseline, not a feature — but the bake-off suite should include it.
**Wire task:** Add to the model bake-off suite as the null baseline.
**Size:** S.

### A-17. ATB adaptive retry for data-fetch — `2510.04516v3` (BUILD-QUEUE #20, INFRA)
**What:** Adaptive retry logic for the data-fetch harness.
**Wire task:** Wire into the ingestion pipeline's fetch layer.
**Size:** S.

---

## IN FLIGHT (Jules, 2026-10-06)

7 Kats sessions fired 2026-10-06 ~00:30 CDT, all AUTO_CREATE_PR + requirePlanApproval:
1. `13463920610983184482` — TSFeatures adapter (multi-sport, short-safe NFL subset)
2. `17463099635810618051` — Changepoint suite BOCPD/CUSUM/StatSig (regime engine)
3. `4359843619815500288` — Walk-forward backtest harness (as-of fencing)
4. `13259057878932902078` — Prophet multi-seasonality + regressors
5. `555049571595214187` — VAR multivariate (cross-book lines, SGP edge)
6. `18061195739075984095` — Harmonic regression (gappy series)
7. `3379668559860493307` — Simulators (synthetic anomaly injection)

Plus: arXiv 11-lane candidate extraction `635851656400117425` (extraction only, no verdicts).

## ALREADY WIRED (verified, not in backlog)

**X metrics (23):** EPA (+dropback/target/rush/play/total variants), TPRR, CPOE, Air Yards, YAC, ADOT, Target Share, First Read Target Share, Play Action, Motion Rate, Tempo, Blitz Rate, Pressure Rate, 4th Down Aggressiveness, Red Zone, Win Expectancy, CLV, DVOA, Snap Counts/Share, Success Rate, Broken/Missed Tackles, Time to Throw, Checkdown Rate.

**Brain operators (7):** Dixon-Coles τ/ξ, Venn-Abers intervals, Mondrian conformal, CQR, Split conformal, ACI/DtACI/AgACI, Empirical Bayes.

**arXiv BUILD-QUEUE (3):** CRPS + log-score doctrine (#6), Conformal selective prediction / no-bet gate (#8), Causal SOP estimand-first protocol (#15).

**Intentionally not wired:** DAVE (library-only by founder directive — may enter as a covariate with as-of timestamp, never on μ).

## Wiring methodology (for future audits)

1. Grep code dirs (`intelligence/`, `apps/web/lib/`, `apps/web/app/`, `scripts/`, `gse-ml-service/`), excluding tests, fixtures, `.next/`, docs.
2. ≥3 files with substantive (non-import) references = WIRED. 1–2 files = PARTIAL (usually a mention). 0 = NOT WIRED.
3. Check abbreviations and alternate phrasings (PRWR, "yards per route", etc.) before declaring NOT WIRED.
4. Re-run this audit after each Jules wave lands — the backlog shrinks as PRs merge.
