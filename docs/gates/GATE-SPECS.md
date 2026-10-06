# GSE Research Corpus — Acceptance-Gate Specifications

Documentation only. This file transcribes and specifies the acceptance gates **as written in
each module's own JSDoc header**. Nothing here was executed, no module was modified, and no gate,
threshold, or result has been invented, tightened, or loosened. Where a header states a gate, the
threshold language is quoted verbatim.

## Scope and method

- **Corpus.** `packages/prediction-engine/src/<family>/*.ts` files whose names match
  `NNNN-NNNNN[vN]-<slug>.ts`, excluding `*.test.ts` and excluding the engine root (top-level
  `src/*.ts`). That yields **179 modules across 23 families**.
- **Reading rule.** For each module only the JSDoc/`//` header block (the first ~30-80 lines) was
  read. No module body was read, no code was run, and no test was executed.
- **Gate status taxonomy used in the table below.**
  - `NOT EVALUATED` — the header carries the literal line `Gate status: NOT EVALUATED`. This is a
    *finding about the state of the corpus*, not a failure: the header itself explains the gate
    "requires historical walk-forward data not available in this environment; it is documented here
    for future evaluation."
  - `gate stated, no status line` — the header states an `ACCEPTANCE GATE` but carries **no**
    `Gate status:` line at all. There is no recorded evaluation state either way.
  - `NO GATE STATED` — reserved for headers with no `ACCEPTANCE GATE` block. **Zero modules in this
    corpus fall into this bucket** (verified by a full-text scan of all 179 files).
- **Tally.** 179 gates specified: **116 `NOT EVALUATED`**, **63 gate stated with no status line**,
  **0 `NO GATE STATED`**.
- **Family split of the 63 status-less gates:** `decision` 44, `invention` 7, `experimental` 6,
  `causal` 1, `ensemble` 1, `injuries` 1, `markets` 1, `metalearning` 2, `rl` 2. The `decision`
  and `invention` families use a `//`-comment header (and often an `ENABLED = false` banner) rather
  than the `wiring-wave2` JSDoc template, and therefore never carry the `Gate status:` line.

## Summary table

| arXiv id | file | family | gate status |
|---|---|---|---|
| `2003-06505v1` | `automl/2003-06505v1-autogluon-tabular-search.ts` | automl | NOT EVALUATED |
| `2003-10865v2` | `automl/2003-10865v2-async-hpo-service.ts` | automl | NOT EVALUATED |
| `1210-1016` | `bayesian/1210-1016-dependent-bradley-terry.ts` | bayesian | NOT EVALUATED |
| `1503-07642` | `bayesian/1503-07642-ordinal-structure-select.ts` | bayesian | NOT EVALUATED |
| `1812-05170` | `bayesian/1812-05170-hierarchical-ar1-shrinkage.ts` | bayesian | gate stated, no status line |
| `1908-05745` | `bayesian/1908-05745-nmf-target-archetypes.ts` | bayesian | NOT EVALUATED |
| `1911-08138` | `bayesian/1911-08138-sparse-form-hmm.ts` | bayesian | NOT EVALUATED |
| `1911-08791` | `bayesian/1911-08791-three-module-score-factorization.ts` | bayesian | NOT EVALUATED |
| `2002-01193` | `bayesian/2002-01193-copula-hmm-momentum.ts` | bayesian | NOT EVALUATED |
| `2004-03019` | `bayesian/2004-03019-dshdp-hmm-regimes.ts` | bayesian | NOT EVALUATED |
| `2005-09024v1` | `bayesian/2005-09024v1-workload-availability-model.ts` | bayesian | NOT EVALUATED |
| `2012-14949` | `bayesian/2012-14949-bivariate-poisson-home-advantage.ts` | bayesian | NOT EVALUATED |
| `2104-07537` | `bayesian/2104-07537-dynamic-probit-vb.ts` | bayesian | NOT EVALUATED |
| `2203-10706` | `bayesian/2203-10706-dfs-monte-carlo-gamma.ts` | bayesian | NOT EVALUATED |
| `2207-05114` | `bayesian/2207-05114-wp-blender-beta-prior.ts` | bayesian | NOT EVALUATED |
| `2210-11010` | `bayesian/2210-11010-efficient-vb-statespace.ts` | bayesian | NOT EVALUATED |
| `2303-12401v2` | `bayesian/2303-12401v2-hierarchical-live-probit.ts` | bayesian | NOT EVALUATED |
| `2304-01538` | `bayesian/2304-01538-doubly-self-exciting-scores.ts` | bayesian | NOT EVALUATED |
| `1905-07886` | `calibration/1905-07886-conformal-ncp-intervals.ts` | calibration | NOT EVALUATED |
| `1803-01422v2` | `causal/1803-01422v2-notears-dag.ts` | causal | gate stated, no status line |
| `2001-04197v4` | `causal/2001-04197v4-rcd-quarantine-layer.ts` | causal | NOT EVALUATED |
| `2003-03685v2` | `causal/2003-03685v2-pcmci-team-panel.ts` | causal | NOT EVALUATED |
| `2007-00267v1` | `causal/2007-00267v1-regime-dependent-causal-discovery.ts` | causal | NOT EVALUATED |
| `2110-00637v4` | `causal/2110-00637v4-ml4c-supervised-orienter.ts` | causal | NOT EVALUATED |
| `1612-00796v2` | `continual/1612-00796v2-ewc-feature-anchoring.ts` | continual | NOT EVALUATED |
| `1904-10644v1` | `continual/1904-10644v1-certainty-weighted-continual-updates.ts` | continual | NOT EVALUATED |
| `2304-01239v1` | `continual/2304-01239v1-teacher-student-continual.ts` | continual | NOT EVALUATED |
| `0903-2910v1` | `decision/0903-2910v1-ou-line-mean-reversion-sizing.ts` | decision | gate stated, no status line |
| `1011-3177v3` | `decision/1011-3177v3-data-replication-abstention.ts` | decision | gate stated, no status line |
| `1710-01787` | `decision/1710-01787-kelly-saturation-hardening.ts` | decision | gate stated, no status line |
| `1710-04818` | `decision/1710-04818-drawdown-risk-frontier.ts` | decision | gate stated, no status line |
| `1801-06737` | `decision/1801-06737-bet-cadence-policy.ts` | decision | gate stated, no status line |
| `1803-08355v2` | `decision/1803-08355v2-structured-leg-abstention.ts` | decision | gate stated, no status line |
| `1806-05293` | `decision/1806-05293-multivariate-slate-sizer.ts` | decision | gate stated, no status line |
| `1807-05265` | `decision/1807-05265-dominance-screen.ts` | decision | gate stated, no status line |
| `1812-10371` | `decision/1812-10371-robust-kelly-uncertainty-set.ts` | decision | gate stated, no status line |
| `1901-09192v4` | `decision/1901-09192v4-selectivenet-selection-head.ts` | decision | gate stated, no status line |
| `1905-10964v2` | `decision/1905-10964v2-dac-abstention-cleaning.ts` | decision | gate stated, no status line |
| `1907-00208v2` | `decision/1907-00208v2-gambler-reservation-filter.ts` | decision | gate stated, no status line |
| `1911-11253v1` | `decision/1911-11253v1-hostile-market-abstain.ts` | decision | gate stated, no status line |
| `2001-09097v1` | `decision/2001-09097v1-gap-stat-ratings.ts` | decision | gate stated, no status line |
| `2002-03448v1` | `decision/2002-03448v1-levy-kelly-staking.ts` | decision | gate stated, no status line |
| `2003-02743` | `decision/2003-02743-temporal-correlation-kelly.ts` | decision | gate stated, no status line |
| `2004-12099` | `decision/2004-12099-kelly-kkt-certificate.ts` | decision | gate stated, no status line |
| `2005-11698` | `decision/2005-11698-fluctuation-frontier.ts` | decision | gate stated, no status line |
| `2006-01862` | `decision/2006-01862-expert-deferral-router.ts` | decision | gate stated, no status line |
| `2101-12523` | `decision/2101-12523-sele-loss-gate.ts` | decision | gate stated, no status line |
| `2104-08236v1` | `decision/2104-08236v1-totals-abstention-sigma.ts` | decision | gate stated, no status line |
| `2104-08281v1` | `decision/2104-08281v1-cover-abstention-head.ts` | decision | gate stated, no status line |
| `2107-03090` | `decision/2107-03090-risan-instance-abstention.ts` | decision | gate stated, no status line |
| `2109-10814v1` | `decision/2109-10814v1-variance-budgeted-kelly.ts` | decision | gate stated, no status line |
| `2205-13532` | `decision/2205-13532-training-disagreement-gate.ts` | decision | gate stated, no status line |
| `2409-18645v1` | `decision/2409-18645v1-mc-dropout-cer.ts` | decision | gate stated, no status line |
| `2411-18374` | `decision/2411-18374-analytic-drawdown-pricer.ts` | decision | gate stated, no status line |
| `2502-07255v2` | `decision/2502-07255v2-dual-threshold-conformal.ts` | decision | gate stated, no status line |
| `2503-07498` | `decision/2503-07498-two-knob-sizer.ts` | decision | gate stated, no status line |
| `2503-23782v1` | `decision/2503-23782v1-regime-conditional-reject.ts` | decision | gate stated, no status line |
| `2505-00724` | `decision/2505-00724-crra-stake-dp.ts` | decision | gate stated, no status line |
| `2505-22422v2` | `decision/2505-22422v2-star-bets-ci.ts` | decision | gate stated, no status line |
| `2505-23437v2` | `decision/2505-23437v2-baltor-selection.ts` | decision | gate stated, no status line |
| `2507-05994v1` | `decision/2507-05994v1-kpup-allocation.ts` | decision | gate stated, no status line |
| `2508-07556v2` | `decision/2508-07556v2-instability-gate.ts` | decision | gate stated, no status line |
| `2510-19672` | `decision/2510-19672-committee-lcb.ts` | decision | gate stated, no status line |
| `2601-20452v1` | `decision/2601-20452v1-whale-distortion.ts` | decision | gate stated, no status line |
| `2601-22570v1` | `decision/2601-22570v1-memory-abstention.ts` | decision | gate stated, no status line |
| `2603-24704` | `decision/2603-24704-evalue-screening.ts` | decision | gate stated, no status line |
| `2604-24723v2` | `decision/2604-24723v2-multivariate-kelly.ts` | decision | gate stated, no status line |
| `2605-02611` | `decision/2605-02611-lipschitz-forcing.ts` | decision | gate stated, no status line |
| `2607-24875v1` | `decision/2607-24875v1-hybrid-uncertainty.ts` | decision | gate stated, no status line |
| `2608-23393` | `decision/2608-23393-kellyboost.ts` | decision | gate stated, no status line |
| `2609-22632` | `decision/2609-22632-perclass-gates.ts` | decision | gate stated, no status line |
| `1803-01984` | `ensemble/1803-01984-bps-outcome-pools.ts` | ensemble | gate stated, no status line |
| `2010-10435v1` | `ensemble/2010-10435v1-time-varying-forecast-combination.ts` | ensemble | NOT EVALUATED |
| `2011-02077` | `ensemble/2011-02077-factor-graphical-ensemble.ts` | ensemble | NOT EVALUATED |
| `2012-01643` | `ensemble/2012-01643-diversity-weighted-combiner.ts` | ensemble | NOT EVALUATED |
| `2101-08954` | `ensemble/2101-08954-hierarchical-stacking.ts` | ensemble | NOT EVALUATED |
| `2104-04918v2` | `ensemble/2104-04918v2-weighted-quantile-combination.ts` | ensemble | NOT EVALUATED |
| `2107-06268` | `ensemble/2107-06268-smoothed-boa-ensemble.ts` | ensemble | NOT EVALUATED |
| `2108-02082v3` | `ensemble/2108-02082v3-regime-blender-febama.ts` | ensemble | NOT EVALUATED |
| `2111-15365` | `ensemble/2111-15365-weekly-boa-consensus.ts` | ensemble | NOT EVALUATED |
| `2202-11834` | `ensemble/2202-11834-beta-linear-pool.ts` | ensemble | NOT EVALUATED |
| `2203-03279v3` | `ensemble/2203-03279v3-fforma-fusion.ts` | ensemble | NOT EVALUATED |
| `2209-01697` | `ensemble/2209-01697-regime-factor-glasso.ts` | ensemble | NOT EVALUATED |
| `2406-15760` | `ensemble/2406-15760-icm-drift-monitor.ts` | ensemble | NOT EVALUATED |
| `2408-00785v4` | `ensemble/2408-00785v4-kairosis-forecast-aggregation.ts` | ensemble | NOT EVALUATED |
| `1601-04302v6` | `experimental/1601-04302v6-footballonomics-bootstrap.ts` | experimental | NOT EVALUATED |
| `1708-02715v1` | `experimental/1708-02715v1-order-flow-resiliency.ts` | experimental | NOT EVALUATED |
| `1804-04226v1` | `experimental/1804-04226v1-cfov-decomposition.ts` | experimental | gate stated, no status line |
| `1805-01271v1` | `experimental/1805-01271v1-its-break-harness.ts` | experimental | gate stated, no status line |
| `1811-03931v1` | `experimental/1811-03931v1-riskneutral-inplay-pricer.ts` | experimental | gate stated, no status line |
| `1905-03628v1` | `experimental/1905-03628v1-nested-poisson-totals.ts` | experimental | NOT EVALUATED |
| `2006-04551v4` | `experimental/2006-04551v4-mimic-model-tree.ts` | experimental | NOT EVALUATED |
| `2101-10385v1` | `experimental/2101-10385v1-bandit-model-selector.ts` | experimental | NOT EVALUATED |
| `2103-04349v1` | `experimental/2103-04349v1-irl-situational-decisions.ts` | experimental | NOT EVALUATED |
| `2106-05174v1` | `experimental/2106-05174v1-nested-zigp-simulation.ts` | experimental | NOT EVALUATED |
| `2108-00821v2` | `experimental/2108-00821v2-news-reaction-ssm.ts` | experimental | NOT EVALUATED |
| `2109-06625v1` | `experimental/2109-06625v1-off-policy-coach-rl.ts` | experimental | NOT EVALUATED |
| `2206-01038v1` | `experimental/2206-01038v1-video-action-recognition-menu.ts` | experimental | NOT EVALUATED |
| `2206-09654v1` | `experimental/2206-09654v1-season-total-lstm-ensemble.ts` | experimental | NOT EVALUATED |
| `2206-11578v1` | `experimental/2206-11578v1-doubly-online-changepoint.ts` | experimental | NOT EVALUATED |
| `2209-07274v5` | `experimental/2209-07274v5-convexity-grid-war.ts` | experimental | NOT EVALUATED |
| `2211-04459v3` | `experimental/2211-04459v3-flexbart-tabular-learner.ts` | experimental | NOT EVALUATED |
| `2308-02414v3` | `experimental/2308-02414v3-bivariate-ssm-skill-rating.ts` | experimental | NOT EVALUATED |
| `2402-01914v1` | `experimental/2402-01914v1-glmf-matchup-matrices.ts` | experimental | NOT EVALUATED |
| `1705-03918` | `injuries/1705-03918-two-version-causal.ts` | injuries | NOT EVALUATED |
| `1710-08749v1` | `injuries/1710-08749v1-ppta-causal.ts` | injuries | NOT EVALUATED |
| `1801-07104` | `injuries/1801-07104-hot-hand-repetition.ts` | injuries | gate stated, no status line |
| `2009-06750` | `injuries/2009-06750-icing-causal-dag.ts` | injuries | NOT EVALUATED |
| `2011-11691` | `injuries/2011-11691-fourth-down-att-matching.ts` | injuries | NOT EVALUATED |
| `2108-08797` | `injuries/2108-08797-synthetic-pretraining-detector.ts` | injuries | NOT EVALUATED |
| `2202-08500` | `injuries/2202-08500-recurrent-competing-events.ts` | injuries | NOT EVALUATED |
| `2205-07193v2` | `injuries/2205-07193v2-division-pair-hfa-causal.ts` | injuries | NOT EVALUATED |
| `2305-14612` | `injuries/2305-14612-acl-risk-video-scoring.ts` | injuries | NOT EVALUATED |
| `2103-04647` | `inplay/2103-04647-marked-point-process-live.ts` | inplay | NOT EVALUATED |
| `1905-11481v2` | `invention/1905-11481v2-ai-feynman-separability.ts` | invention | gate stated, no status line |
| `1912-04871v4` | `invention/1912-04871v4-risk-seeking-symreg.ts` | invention | gate stated, no status line |
| `2409-00629v2` | `invention/2409-00629v2-dualmargin-bandit-experiment.ts` | invention | gate stated, no status line |
| `2410-17238v1` | `invention/2410-17238v1-sela-mcts.ts` | invention | gate stated, no status line |
| `2508-01285v2` | `invention/2508-01285v2-biodisco-critic-stage.ts` | invention | gate stated, no status line |
| `2606-29823v1` | `invention/2606-29823v1-experience-graph.ts` | invention | gate stated, no status line |
| `2608-25770v2` | `invention/2608-25770v2-hypoforge-split.ts` | invention | gate stated, no status line |
| `1106-4509` | `markets/1106-4509-ml-market-pooling.ts` | markets | NOT EVALUATED |
| `1310-6998v1` | `markets/1310-6998v1-twitter-volume-momentum.ts` | markets | NOT EVALUATED |
| `1802-08848v1` | `markets/1802-08848v1-odds-history-fusion.ts` | markets | gate stated, no status line |
| `1910-08858v2` | `markets/1910-08858v2-spread-win-probability-table.ts` | markets | NOT EVALUATED |
| `2003-09384v2` | `markets/2003-09384v2-static-theta-threshold-policy.ts` | markets | NOT EVALUATED |
| `2010-12508v1` | `markets/2010-12508v1-decorrelation-penalty-loss.ts` | markets | NOT EVALUATED |
| `2106-05799v1` | `markets/2106-05799v1-hybrid-ability-xgboost.ts` | markets | NOT EVALUATED |
| `2107-08827v1` | `markets/2107-08827v1-fractional-kelly-sizing.ts` | markets | NOT EVALUATED |
| `2112-13001v3` | `markets/2112-13001v3-dcp-prop-framework.ts` | markets | NOT EVALUATED |
| `2401-06086v1` | `markets/2401-06086v1-imitation-inplay-betting.ts` | markets | NOT EVALUATED |
| `1703-03400v3` | `metalearning/1703-03400v3-maml-rookie-adapter.ts` | metalearning | NOT EVALUATED |
| `1807-08912v2` | `metalearning/1807-08912v2-alpaca-online-regression.ts` | metalearning | gate stated, no status line |
| `1901-09890v1` | `metalearning/1901-09890v1-meta-metric-librarian.ts` | metalearning | gate stated, no status line |
| `2006-06707v2` | `metalearning/2006-06707v2-metavrf-kernel-learning.ts` | metalearning | NOT EVALUATED |
| `2009-03228v3` | `metalearning/2009-03228v3-gp-vib-meta-learning.ts` | metalearning | NOT EVALUATED |
| `2208-08135v1` | `metalearning/2208-08135v1-uncertainty-weighted-metalearning.ts` | metalearning | NOT EVALUATED |
| `2010-00526v1` | `nlp/2010-00526v1-liveqa-nfl-benchmark.ts` | nlp | NOT EVALUATED |
| `2211-04534v1` | `nlp/2211-04534v1-goal-nfl-retrieval.ts` | nlp | NOT EVALUATED |
| `2401-01505v5` | `nlp/2401-01505v5-afa-tracking-qa.ts` | nlp | NOT EVALUATED |
| `1505-01147v2` | `props-dfs/1505-01147v2-local-matrix-completion.ts` | props-dfs | NOT EVALUATED |
| `1909-12938v1` | `props-dfs/1909-12938v1-ts-forecast-dfs-optimizer.ts` | props-dfs | NOT EVALUATED |
| `1912-10417v1` | `props-dfs/1912-10417v1-regime-switching-synergy-network.ts` | props-dfs | NOT EVALUATED |
| `2003-01712v1` | `props-dfs/2003-01712v1-joi-stack-metric.ts` | props-dfs | NOT EVALUATED |
| `2004-08428v1` | `props-dfs/2004-08428v1-era-adjusted-features.ts` | props-dfs | NOT EVALUATED |
| `2005-07742` | `props-dfs/2005-07742-seam-matchup-shrinkage.ts` | props-dfs | NOT EVALUATED |
| `2006-07513` | `props-dfs/2006-07513-bayesian-shot-archetypes.ts` | props-dfs | NOT EVALUATED |
| `2009-01206v1` | `props-dfs/2009-01206v1-chalk-meter-contrarian.ts` | props-dfs | NOT EVALUATED |
| `2112-07002` | `props-dfs/2112-07002-emax-duel-optimizer.ts` | props-dfs | NOT EVALUATED |
| `2212-11041v1` | `props-dfs/2212-11041v1-future-value-models.ts` | props-dfs | NOT EVALUATED |
| `2302-13386` | `props-dfs/2302-13386-player2vec-embeddings.ts` | props-dfs | NOT EVALUATED |
| `2303-04963v1` | `props-dfs/2303-04963v1-elite-lineup-order-stats.ts` | props-dfs | NOT EVALUATED |
| `2407-13438` | `props-dfs/2407-13438-ems-gpp-portfolio.ts` | props-dfs | NOT EVALUATED |
| `2407-17832` | `props-dfs/2407-17832-group-lasso-plus-minus.ts` | props-dfs | NOT EVALUATED |
| `1707-06887v1` | `rl/1707-06887v1-distributional-slate-rl.ts` | rl | NOT EVALUATED |
| `1806-06923v2` | `rl/1806-06923v2-iqn-critic.ts` | rl | gate stated, no status line |
| `1902-08102v2` | `rl/1902-08102v2-expectile-critic.ts` | rl | gate stated, no status line |
| `2006-04779v2` | `rl/2006-04779v2-cql-stake-policy.ts` | rl | NOT EVALUATED |
| `2105-08877v2` | `rl/2105-08877v2-c51-optimal-stopping.ts` | rl | NOT EVALUATED |
| `2202-00769v1` | `rl/2202-00769v1-sinkhorn-drl-staking.ts` | rl | NOT EVALUATED |
| `2203-03003v1` | `rl/2203-03003v1-offline-cql-staking.ts` | rl | NOT EVALUATED |
| `2306-00840v1` | `simulators/2306-00840v1-muzero-planning-audit.ts` | simulators | NOT EVALUATED |
| `0803-1364v2` | `sizing/0803-1364v2-generalized-kelly-solver.ts` | sizing | NOT EVALUATED |
| `2006-10782v2` | `symreg/2006-10782v2-aifeynman-pareto-pruning.ts` | symreg | NOT EVALUATED |
| `2312-11955v1` | `symreg/2312-11955v1-vertical-symbolic-regression.ts` | symreg | NOT EVALUATED |
| `2401-00282v1` | `symreg/2401-00282v1-dgsr-lite-refinement.ts` | symreg | NOT EVALUATED |
| `1109-2825v2` | `team-ratings/1109-2825v2-scoring-random-walk.ts` | team-ratings | NOT EVALUATED |
| `1403-7642` | `team-ratings/1403-7642-college-ranking-sensitivity.ts` | team-ratings | NOT EVALUATED |
| `1609-01176v1` | `team-ratings/1609-01176v1-player-kernel-gp.ts` | team-ratings | NOT EVALUATED |
| `2010-11187` | `team-ratings/2010-11187-g-elo-margin-model.ts` | team-ratings | NOT EVALUATED |
| `2207-12147v1` | `team-ratings/2207-12147v1-sparse-tvp-team-ratings.ts` | team-ratings | NOT EVALUATED |
| `2012-11717v3` | `tracking/2012-11717v3-social-nce-trajectories.ts` | tracking | NOT EVALUATED |
| `2305-02968v1` | `tracking/2305-02968v1-masked-trajectory-models.ts` | tracking | NOT EVALUATED |
| `2407-20028v1` | `tracking/2407-20028v1-atscc-route-primitives.ts` | tracking | NOT EVALUATED |
| `2106-00175` | `weather/2106-00175-stacked-live-wp-bakeoff.ts` | weather | NOT EVALUATED |
| `2109-09287` | `weather/2109-09287-stadium-factor-decomposition.ts` | weather | NOT EVALUATED |
| `1908-07372` | `win-spread-total/1908-07372-sde-inplay-win-probability.ts` | win-spread-total | NOT EVALUATED |
| `2008-13005` | `win-spread-total/2008-13005-budescu-chen-aggregation.ts` | win-spread-total | NOT EVALUATED |
| `2207-13191` | `win-spread-total/2207-13191-gcn-win-prediction.ts` | win-spread-total | NOT EVALUATED |

---

## Per-gate specifications

Each paragraph below covers exactly three things: **(a)** what the gate tests, **(b)** what
input/data it needs, **(c)** what pass and fail each mean. Thresholds are quoted from the header.

### automl

**`2003-06505v1` — `automl/2003-06505v1-autogluon-tabular-search.ts` — NOT EVALUATED.** (a) Tests
whether an AutoGluon-Tabular stack beats GSE's hand-tuned baseline on win-probability/spread/total
tabular models, including a leakage positive control. (b) Needs the 2023-2025 held-out seasons of
win-probability/spread/total data, a hand-tuned LightGBM/XGBoost baseline, and a measurable search
cost. (c) Pass = "the AutoGluon-based stack beats the hand-tuned baseline by >=0.003 log-loss on the
2023-2025 held-out seasons AND the search costs <=100 GPU/CPU-hours total." Fail = "improvement
<0.003 log-loss, or any season shows the wrapper leaking future information (positive control:
shuffling season labels must destroy the edge), or inference latency >1s/game."

**`2003-10865v2` — `automl/2003-10865v2-async-hpo-service.ts` — NOT EVALUATED.** (a) Tests whether
an asynchronous HPO service with heterogeneous model runtimes reaches synchronous-BOHB quality
faster and beats a cheap 1-epoch baseline. (b) Needs the offseason model families (CatBoost fast,
FT-Transformer slow), an 8-worker compute budget, and a synchronous-BOHB reference run. (c) Pass =
"the async method reaches the synchronous-BOHB final log-loss in <=60% of the wall-clock time with
8 workers, AND beats the 1-epoch baseline's final log-loss by >=0.001." Fail = either condition
missed.

### bayesian

**`1210-1016` — `bayesian/1210-1016-dependent-bradley-terry.ts` — NOT EVALUATED.** (a) Tests
whether subject-level random effects in Bradley-Terry paired comparisons produce honest uncertainty
under rater dependence, and whether dependence actually matters. (b) Needs a 32-team coverage
simulation, plus correlated GSE analyst judgments (multiple raters on the same QB matchups, weekly
power-rank ballots). (c) Pass = "in the 32-team simulation, PL 95%-CI empirical coverage in [0.93,
0.97] for worth parameters AND model SEs within 10% of simulation SDs, while naive independent BT
covers < 0.90 (proving dependence matters)." Fail = coverage or SE-size outside those bands, or
naive BT already covering >= 0.90.

**`1503-07642` — `bayesian/1503-07642-ordinal-structure-select.ts` — NOT EVALUATED.** (a) Tests
whether per-variable proportional-odds vs non-proportional-odds structure selection beats a
PO-only ordinal model, and whether stochastic ordering holds. (b) Needs NFL margin buckets
(the header names 7 buckets, blowout loss to blowout win) on a 2020-2024 holdout, plus a covariate
grid for the ordering audit. (c) Pass = "the structure-selected model beats PO-only by >= 0.003
log-loss on 2020-2024 holdout AND no covariate-grid point violates stochastic ordering." Fail =
smaller log-loss gain or any grid point breaking stochastic ordering.

**`1812-05170` — `bayesian/1812-05170-hierarchical-ar1-shrinkage.ts` — gate stated, no status
line.** (a) Tests a two-stage build: a hierarchical Bayesian partial-pooling estimation layer
(player/position-group/global, AR(1) over weeks, half-Cauchy(0,2.5) scales), then a
time-transition-process play simulator. (b) Needs 2025 held-out games with EPA/play, plus compute
budget for a one-team prototype and the published ngreenberg 4th-down estimates already in the repo
as a sanity reference. (c) Pass = "the multi-level AR(1) model improves out-of-sample log-likelihood
over the no-shrinkage baseline by >=2% AND posterior 95% intervals achieve nominal coverage on
held-out EPA/play." The simulator is separately gated: "REJECT the full TPT play-simulator build if
a one-team prototype exceeds 48 hours compute or fails the Table-2-style shrinkage-wins check.
Simulator build proceeds only after the estimation gate passes."

**`1908-05745` — `bayesian/1908-05745-nmf-target-archetypes.ts` — NOT EVALUATED.** (a) Tests
whether NMF-derived archetypal target zones plus a marked point-process intensity/completion model
and 5-style archetype clustering carry signal, and whether the covariate effect generalizes
per-player. (b) Needs prior-season target data and a QB replication on held-out log-loss. (c) Pass
= "the QB replication shows xi != 0 winning on held-out log-loss for most qualifying QBs." Fail =
"REJECT the assumption that xi > 0 universally (fit per player, don't pool); REJECT DIC-only model
selection."

**`1911-08138` — `bayesian/1911-08138-sparse-form-hmm.ts` — NOT EVALUATED.** (a) Tests a 2-3 state
sparse form-HMM with LASSO/relaxed-LASSO screening over a 50-value log-spaced lambda grid, BIC
selected, with time-gap-aware transitions. (b) Needs 2022-2024 holdout field-goal data and a
simulation replication (100 runs) for covariate-selection recovery. (c) Pass = "the sparse form-HMM
beats the plain logistic baseline by >= 0.005 log-loss AND the simulation replication selects zero
noise covariates in >=75/100 runs." Fail = "Fail either -> REJECT for production (keep as screening
tool only)."

**`1911-08791` — `bayesian/1911-08791-three-module-score-factorization.ts` — NOT EVALUATED.** (a)
Tests whether a coherent three-module Bayesian factorization (points ~ Poisson/NB, close-margin
Bernoulli, win Bernoulli) produces joint probabilities that beat independent modules across
markets. (b) Needs 2025 held-out NFL games with pre-game EPA-based unit ratings. (c) Pass = "the
joint model's Brier on moneyline + spread + totals is better than independent-module equivalents on
>=2 markets AND no worse than v5.2.7 on the third." Fail = fewer than 2 markets improved, or worse
than v5.2.7 on the third.

**`2002-01193` — `bayesian/2002-01193-copula-hmm-momentum.ts` — NOT EVALUATED.** (a) Tests
whether a copula-HMM over bivariate drive/play observables (EPA per play + success rate) with K=3
covariate-driven states beats an independence HMM, and whether the Viterbi state dummies are
jointly significant. (b) Needs 2023-2024 holdout drive-level data across team-seasons with score
differential, time remaining, home/away, and opponent strength. (c) Pass = "the copula-HMM's
one-step-ahead predictive log-likelihood beats the independence-HMM baseline by >= 0.02
nats/observation on average across team-seasons AND the Viterbi state dummies are jointly
significant (p < 0.05) for next-drive points." Fail = either clause unmet.

**`2004-03019` — `bayesian/2004-03019-dshdp-hmm-regimes.ts` — NOT EVALUATED.** (a) Tests whether a
disentangled sticky HDP-HMM (weak-limit L=50) on per-drive/per-game team observables beats a plain
sticky HDP-HMM, and whether the persistence parameters carry real heterogeneity. (b) Needs
per-team-season fits across 2018-2024 on EPA/play, pass rate, explosiveness, and pace. (c) Pass =
"DS-HDP-HMM wins held-out NLL vs sticky HDP-HMM in >=60% of team-seasons AND inferred kappa_j shows
real heterogeneity (spread > 0.3 in >=50% of fits)." Fail = "Fail -> REJECT (fixed-K HMM from 1654
suffices)."

**`2005-09024v1` — `bayesian/2005-09024v1-workload-availability-model.ts` — NOT EVALUATED.** (a)
Tests a per-player availability model (workload, recovery flags, 10-game rolling lags, hierarchical
partial pooling) and whether individual lag curves carry heterogeneity. (b) Needs held-out 2025
availability targets (binary availability or ordinal practice participation) plus snap counts,
days since last game, travel, and short-week flags. (c) Pass = "held-out 2025 availability AUC
beats the pooled baseline by >=3 pp AND individual lag curves show meaningful heterogeneity (psi_ml
significantly >0)." Fail = "REJECT if lag curves collapse to a single global curve with no
individual signal."

**`2012-14949` — `bayesian/2012-14949-bivariate-poisson-home-advantage.ts` — NOT EVALUATED.** (a)
Tests a bivariate-Poisson home-advantage estimator, both in simulation replication and on the
2020-season holdout. (b) Needs a simulation study (MAB(T-hat) and bias vs linear regression) plus
2020-season scores and GSE's current score model as baseline. (c) Pass = "simulation replication
shows MAB(T-hat) <= 0.10 and >=50% bias reduction vs linear regression AND 2020-season holdout
predictive log-likelihood beats GSE's current score model by >= 0.01 nats/game." Fail = "Fail ->
REJECT."

**`2104-07537` — `bayesian/2104-07537-dynamic-probit-vb.ts` — NOT EVALUATED.** (a) Tests whether
a variational-Bayes dynamic probit matches exact MCMC and beats a static probit. (b) Needs NFL
drive-level binary outcomes, an exact-MCMC reference, and a 2022-2024 holdout. (c) Pass = "PFM-VB
posterior means within 0.01 MAE of exact MCMC on NFL drive data AND predictive log-loss beats
static probit by >= 0.003 on 2022-2024 holdout." Fail = "Fail -> REJECT (fall back to the EP
backend)."

**`2203-10706` — `bayesian/2203-10706-dfs-monte-carlo-gamma.ts` — NOT EVALUATED.** (a) Tests
whether an opponent-specific hierarchical Bayesian gamma player-distribution model plus Monte Carlo
slate aggregation beats pooled baselines. (b) Needs 2025 held-out fantasy data, matchup tables
(e.g. WR yards vs coverage-shell CB history), and salary-cap/positional constraints for lineup
construction. (c) Pass = "the hierarchical gamma beats pooled baselines on 2025 held-out
log-likelihood by >=3%." Fail = below 3%, and the header additionally directs "REJECT the paper's
literal estimation procedure (moment + 5% tail rule, no pooling)."

**`2207-05114` — `bayesian/2207-05114-wp-blender-beta-prior.ts` — NOT EVALUATED.** (a) Tests whether
GSE's live-WP blending improves with a dynamic beta prior and a logistic blend, with a strict
validation-before-test split. (b) Needs per-(seconds elapsed, score differential, down/distance
bucket) cell counts, GSE's pregame model for the prior, and a strictly held-out 2022-2024 test
slice. (c) Pass = "the blended estimator beats GSE's current live-WP Brier by >= 0.002 AND beats the
no-blend cell estimator by >= 0.003, with calibration slope in [0.95, 1.05]." Fail = "miss -> REJECT
the blend (keep the beta-prior cell estimator only if it alone beats baseline)."

**`2210-11010` — `bayesian/2210-11010-efficient-vb-statespace.ts` — NOT EVALUATED.** (a) Tests
Efficient-VB as the inference engine for a dynamic bivariate-Poisson team-strength model, on
accuracy, runtime, and posterior-SD calibration. (b) Needs nflverse 2000-2024, train 2000-2019,
test 2020-2024, plus an MCMC reference for the SD comparison. (c) Pass = "predictive log-likelihood
beats static-strength baseline by >= 0.01 nats/game on 2020-2024 AND runtime <= 5% of MCMC per
season AND median posterior-SD underestimation <= 20% (ratio >= 0.8)." Fail = "fail any -> REJECT for
production (keep as research prototype)."

**`2303-12401v2` — `bayesian/2303-12401v2-hierarchical-live-probit.ts` — NOT EVALUATED.** (a) Tests
whether a hierarchical Bayesian live probit on play-indexed nflverse data beats a static
pre-match-probability-plus-score baseline once the split is chronological. (b) Needs nflverse
play-by-play with down/distance/yardline/score/time covariates and market odds as a covariate, under
rolling-origin validation. (c) Pass = "under rolling-origin validation, the play-indexed Bayesian
probit must beat a static pre-match-probability-plus-score baseline on log-loss." Fail = "if the
live model adds nothing once the split is chronological, the adaptation fails."

**`2304-01538` — `bayesian/2304-01538-doubly-self-exciting-scores.ts` — NOT EVALUATED.** (a) Tests a
drive-level doubly self-exciting (INGARCH) hierarchy with a Wasserstein-barycenter
divide-and-conquer, against a game-level self-excitation alternative. (b) Needs 2025 held-out
drive-level points, weekly player/team fantasy points, and joint Bayesian fits. (c) Pass = "ADOPT
the doubly self-exciting hierarchy and the Wasserstein-barycenter divide-and-conquer if drive-level
DSE beats baseline on 2025 held-out log-likelihood." Fail = "REJECT game-level self-excitation
unless WAIC/LOO supports it (the paper's own evidence says it usually does not); REJECT the plug-in
offset as a final implementation - propagate uncertainty jointly in the production version."

### calibration

**`1905-07886` — `calibration/1905-07886-conformal-ncp-intervals.ts` — NOT EVALUATED.** (a) Tests a
normalized-nonconformity (NCP) interval option and, independently, a per-market path-selection
protocol over {plain CP, NCP} x point predictor. (b) Needs rolling-window (never random-split)
calibration on ordered NFL data and a 2025 holdout with per-game dispersion estimates. (c) Pass =
"ADOPT NCP if it achieves nominal coverage within 2pp AND mean width <= plain-CP width on the 2025
holdout; KEEP the path-selection protocol regardless (it is process, not a claim); REJECT the
random-split calibration design outright -- never use it on ordered NFL data."

### causal

**`1803-01422v2` — `causal/1803-01422v2-notears-dag.ts` — gate stated, no status line.** (a) Tests
whether a NOTEARS-learned causal graph, pruned to the Markov blanket of the spread-cover target,
yields a smaller feature set at parity, and whether the learned edges are stable and directionally
sane. (b) Needs a ~35-node team-week panel on nflverse 2015-2026, bootstrap stability selection
(edges kept at stability >= 0.6), season-blocked folds, and a 2024-2025 holdout. (c) Pass = "ALL hold:
(a) held-out Brier on 2024-2025 with <=60% of features is within 0.002 of the full-feature baseline
(parity) or better; (b) learned-edge Jaccard similarity across season-blocked folds >= 0.5; (c)
directed edges respect known football directionality on >=80% of high-confidence edges." Fail =
"Reject if Brier worsens by >0.003 or stability < 0.5."

**`2001-04197v4` — `causal/2001-04197v4-rcd-quarantine-layer.ts` — NOT EVALUATED.** (a) Tests an
RCD quarantine layer over the ~35-indicator set: bi-directed (latent-confounded) edge pairs are
quarantined. (b) Needs a 2024-2025 Brier evaluation, bootstrap runs for the bi-directed edge set,
and hand-labeled known-confounded pairs. (c) Pass = "(a) model (b) matches or beats (a) on 2024-2025
Brier (parity within 0.002) while removing >=15% of directed edges as confounded; (b) bootstrap
Jaccard of bi-directed edge set >= 0.5; (c) >=3 of 5 hand-labeled known-confounded pairs are flagged
bi-directed." Fail = any clause unmet.

**`2003-03685v2` — `causal/2003-03685v2-pcmci-team-panel.ts` — NOT EVALUATED.** (a) Tests whether
PCMCI+-pruned features (taumax=4, ParCorr first, GPDC confirmation on the top-50 stable edges)
retain predictive power at <=60% of the feature count, and whether the edges are stable and
correctly oriented. (b) Needs the nflverse team-week panel per team-season (N~30 indicators, T~18
weeks) aggregated across ~380 team-seasons with cross-team-season frequency >= 0.4, and a 2024-2025
holdout. (c) Pass = "(a) held-out 2024-2025 Brier within 0.002 of the all-lags baseline (or better)
while using <=60% of features; (b) median cross-team-season edge Jaccard >= 0.5; (c)
contemporaneous orientation precision on domain-known directions (pressure->sacks, turnovers->EPA)
>= 0.75." Fail = any clause unmet.

**`2007-00267v1` — `causal/2007-00267v1-regime-dependent-causal-discovery.ts` — NOT EVALUATED.**
(a) Tests regime-dependent causal discovery: whether a regime-switching graph beats baseline, whether
AICc actually finds multiple regimes, whether a 'disrupted' regime is recoverable, and whether
per-regime links are accurate on synthetic data. (b) Needs ~15 core indicators with ParCorr CI
tests, N_K in {2,3} by AICc, a trailing 6-week window for regime identity, a 2024-2025 holdout, and
documented QB-injury-spell weeks. (c) Pass = "ADOPT if (a) regime model beats baseline by >=0.003
Brier on 2024-2025 held-out; (b) AICc selects N_K >= 2 in >=60% of seasons; (c) the 'disrupted'
regime classifier recovers >=70% of documented QB-injury-spell weeks; (d) per-regime link TPR >= 0.85
on synthetic sports-like data." Fail = "Reject if (a) fails or AICc persistently selects N_K=1."

**`2110-00637v4` — `causal/2110-00637v4-ml4c-supervised-orienter.ts` — NOT EVALUATED.** (a) Tests a
supervised UT-orienter (ML4C-Learner + Meek rules) and a continuous ML4C variant, on orientation
quality and on whether orientation changes downstream results. (b) Needs 5000 synthesized
football-plausible discrete DAGs, tertile-discretized team-season indicators, the consensus skeleton
from ledgers 1962-1966, real-data season splits, hand-labeled colliders, and a ledger-1967
quantitative-probing evaluation. (c) Pass = "ADOPT the supervised orienter if: (a) held-out synthetic
UT-F1 >= 0.8; (b) real-data orientation agreement across season splits >= 0.7; (c) >=80% of
hand-labeled known colliders recovered (e.g., offensive EPA -> win <- defensive EPA); (d) adding
orientations strictly improves the ledger-1967 quantitative-probing hit rate vs the unoriented
skeleton." Fail = any clause unmet.

### continual

**`1612-00796v2` — `continual/1612-00796v2-ewc-feature-anchoring.ts` — NOT EVALUATED.** (a) Tests
whether per-feature importance-weighted anchoring (EWC's penalty with the Fisher diagonal replaced by
GBM importance) reduces catastrophic forgetting in weekly GBM refits. (b) Needs 2020-2025
walk-forward refits, GSE's 4-metric panel, worst-week Brier, and quarterly per-feature importance
vectors by regime stratum. (c) Pass = "ADOPT per-feature importance-weighted anchoring if on
2020-2025 walk-forward: (i) (C) beats (B) on >=2 of 1887's 4 metrics, (ii) worst-week Brier
improves >=0.002 vs plain refit (A), (iii) the shared-feature core is stable across seasons." Fail =
fewer than 2 of 4 metrics, or worst-week Brier gain below 0.002, or an unstable shared-feature core.

**`1904-10644v1` — `continual/1904-10644v1-certainty-weighted-continual-updates.ts` — NOT
EVALUATED.** (a) Tests two independent mechanisms: certainty-weighted (natural-gradient-style)
continual updates, and a ~200-game Stein coreset replay buffer replacing reservoir sampling. (b) Needs
the 1887 4-metric panel, worst-week and anytime Brier, and quarterly coreset refreshes. (c) Pass =
"ADOPT certainty-weighted updates if (B) beats (A) on >=2 of 1887's 4 metrics with worst-week Brier
improving >=0.001. ADOPT the Stein coreset buffer if (C) beats the reservoir buffer on worst-week
Brier by >=0.002 and on anytime Brier." Each half is adopted or rejected on its own clause.

**`2304-01239v1` — `continual/2304-01239v1-teacher-student-continual.ts` — NOT EVALUATED.** (a) Tests
online distillation (student trained on teacher soft targets) with a cyclic replay buffer, RWalk
drift regularization, and regime-conditional teachers, including whether the gain is merely the
teacher's information. (b) Needs 2020-2025 walk-forward, anytime Brier, ECE, December/playoff-regime
Brier, and a teacher-frozen-since-August control. (c) Pass = "ADOPT the teacher-student update if on
2020-2025 walk-forward: (i) the distilled student matches or beats hard-label refit on anytime
Brier while improving ECE by >=0.002, (ii) adding the cyclic buffer + RWalk improves
December/playoff-regime Brier by >=0.003 with no metric worse by >0.001." Fail = "REJECT distillation
if the student's edge comes only from the teacher's information (teacher-frozen-since-August
control); REJECT the RWalk half if it adds nothing over the buffer alone."

### decision

The `decision` family uses a `//`-comment header with an `ENABLED = false` banner; every header
states an acceptance gate and **none carries a `Gate status:` line**, so all 44 are recorded as
"gate stated, no status line." Each header also conditions activation on a human call, because
wiring changes published picks.

**`0903-2910v1` — `decision/0903-2910v1-ou-line-mean-reversion-sizing.ts`.** (a) Tests
OU-adjusted stake sizing against static Kelly on realized log-wealth growth, and the stability of the
fitted OU parameters. (b) Needs line-move history to estimate pull speed `b` and line volatility
`sigma`, GSE's fair line, and a held-out backtest. (c) Pass = "ADOPT OU-adjusted sizing if it beats
static Kelly on realized log-wealth growth with no worse max drawdown." Fail = "REJECT if the OU
parameter estimates are unstable week-to-week (b_hat sign flips on > 20% of markets)."

**`1011-3177v3` — `decision/1011-3177v3-data-replication-abstention.ts`.** (a) Tests a trainable
three-way bet-A / ABSTAIN / bet-B reject region learned through data replication with cost-weighted
labels. (b) Needs historical graded picks with features (model edge vs closing line, conformal
interval width, market steam, league, days-to-game, model version) and cross-validation folds. (c)
Pass = "ADOPT the trainable abstention layer into the engine only if: (a) it beats fixed-threshold
abstention on out-of-sample ROI at >=2 abstention rates, (b) the learned reject region is stable
across CV folds (boundary direction cosine similarity >=0.8 -- else it's noise-fitting), and (c)
abstention doesn't concentrate on a single league/market." Fail = any clause unmet; sub-0.8 cosine
similarity is explicitly read as noise-fitting.

**`1710-01787` — `decision/1710-01787-kelly-saturation-hardening.ts`.** (a) Tests a
drawdown-constrained sizer that maximizes E[log(1 + stake'X)] exactly instead of via Taylor or
mu/sigma^2 approximations, and a unit test replicating the paper's Gamble A. (b) Needs a held-out
2025-2026 backtest plus bankroll simulation for the expected-maximum-drawdown constraint (the header
names d = 0.2 as an example). (c) Pass = "ADOPT the drawdown-constrained sizer if, on the held-out
2025-2026 backtest, it delivers realized max drawdown <= 0.8x baseline drawdown with log growth >=
0.95x baseline growth." Fail = "REJECT (keep current sizer) otherwise." The header additionally
codifies a ban on Taylor/approximate shortcuts and asserts the sizer must return K approx 0.667 on
Gamble A, never the saturated K = 1.

**`1710-04818` — `decision/1710-04818-drawdown-risk-frontier.ts`.** (a) Tests a convex
current-drawdown risk measure `r_cur^X` added as a constraint on the Kelly log-growth objective,
producing per-category Kelly-fraction caps. (b) Needs a trade-return matrix from historical
per-category (spread/total/moneyline/prop) pick returns at unit stakes, Monte Carlo trade-draw
equity curves, and a 2025-2026 replay. (c) Pass = "ADOPT if the r_cur^X-constrained allocation cuts
max drawdown >=25% versus unconstrained category-Kelly while keeping >=90% of final bankroll on the
2025-2026 replay." Fail = under 25% drawdown cut, or final bankroll below 90%.

**`1801-06737` — `decision/1801-06737-bet-cadence-policy.ts`.** (a) Tests a bet-cadence optimizer
choosing re-stake frequency, plus a sufficient-attractiveness "stale-edge" screen
E[1/(1+X)] <= 1. (b) Needs GSE's per-pick edge distribution, effective vig, line-move volatility, and
a held-out season with realized net log growth and max drawdown. (c) Pass = "ADOPT the cadence
optimizer if it beats baseline realized net log growth by >= 3% on the held-out season with no
increase in realized max drawdown." Fail = "REJECT otherwise."

**`1803-08355v2` — `decision/1803-08355v2-structured-leg-abstention.ts`.** (a) Tests two independent
adoptions: (A) parlay/DFS leg-level abstention via a greedy pre-image over per-leg calibrated edges,
and (B) an NLP injury-news pipeline with per-node abstention. (b) (A) needs >=300 settled parlay
slips; (B) needs 2025 beat-writer articles tuned against official injury reports and engine spread
predictions on the covered games. (c) Pass = "ADOPT (A) leg-level abstention only if parlay backtest
ROI improves by >=5.0 pp per dollar staked vs all-legs baseline over >=300 settled slips (bootstrap
p<0.05). ADOPT (B) the text pipeline only if injury-signal F1 >= 0.60 vs official reports AND engine
spread MAE improves >=0.15 points on the covered games." Fail = "Otherwise REJECT." Each half is
gated independently.

**`1806-05293` — `decision/1806-05293-multivariate-slate-sizer.ts`.** (a) Tests an exact
multivariate Kelly convex program (with the paper's M.f = b closed form demoted to a warm start) on a
whole slate, with a guardrail that rising pairwise correlation must not raise either pick's
allocation. (b) Needs per-pick edge estimates, a historical outcome correlation matrix (or its
hierarchical calibration-residual estimate), and a held-out season. (c) Pass = "ADOPT the slate
sizer only if it beats baseline realized log growth by >= 5% on the held-out season with max drawdown
no worse than baseline." Fail = "REJECT otherwise (keep independent sizing)." The header also
requires a regression test asserting the approximate solution is never served directly.

**`1807-05265` — `decision/1807-05265-dominance-screen.ts`.** (a) Tests a dominance/redundancy screen
evaluating E[(1+X_i)/(1+X_j)] <= 1 on mutually exclusive or highly correlated picks, with a
time-varying dual-confirmation regime test. (b) Needs calibrated per-pick outcome distributions, the
slate's correlated/mutually-exclusive pick set, and a held-out season. (c) Pass = "ADOPT the
dominance screen only if it improves realized ROI per unit of max drawdown (Calmar-style) by >= 10%
on the held-out season without reducing hit-rate transparency (same number of graded picks or
explicit 'suppressed as redundant' labeling)." Fail = "REJECT otherwise." The header explicitly
forbids literal all-in concentration and requires logging every dominance trigger with its
triggering window and probabilities.

**`1812-10371` — `decision/1812-10371-robust-kelly-uncertainty-set.ts`.** (a) Tests a
distributionally-robust Kelly sizer maximizing worst-case growth over an uncertainty set built from
calibration residuals, with an adaptive set radius. (b) Needs backtest (realized - predicted)
probability-error distributions per market type, the existing fractional cap (<=0.25 default), and
worst-decile-of-weeks realized growth. (c) Pass = "ADOPT robust sizing only if it improves
worst-decile-of-weeks realized growth by >= 20% relative to baseline while keeping total realized log
growth >= 0.9x baseline." Fail = "REJECT otherwise."

**`1901-09192v4` — `decision/1901-09192v4-selectivenet-selection-head.ts`.** (a) Tests a learned
selection head (sigmoid gate + auxiliary full-coverage head, selective loss at target coverage
c=0.30) against thresholding on model edge. (b) Needs the GSE pick model trunk, a test window, and
paired per-pick outcomes. (c) Pass = "ADAPT if (a) beats (b) on test-window ROI of the covered set by
>=2 percentage points of ROI at matched 30% coverage AND the win-rate lift is significant at p<0.05
(paired over picks)." Fail = "reject if the gap is <2pp or insignificant -- then the
threshold-on-edge null stands."

**`1905-10964v2` — `decision/1905-10964v2-dac-abstention-cleaning.ts`.** (a) Tests a DAC-loss
(k+1 abstention head) training round followed by retraining on the cleaned set, plus reuse of the
abstained set as an "unreliable game" detector. (b) Needs training games with noisy-ish targets, a
clean-validation checkpoint, and a test Brier evaluation. (c) Pass = "ADAPT if the post-cleaning
retrained model beats the all-data baseline on test Brier by >=0.003 with the abstained fraction <=25%
of training games." Fail = "reject if the gain is <0.003 or cleaning removes >40% of games (sample
destruction)."

**`1907-00208v2` — `decision/1907-00208v2-gambler-reservation-filter.ts`.** (a) Tests a reservation
(output) head trained with the gambler loss as a post-hoc publish filter, with the reward `o` swept
by ROI on retained picks. (b) Needs a time-ordered test window and realized ROI on retained picks.
(c) Pass = "ADOPT the filter iff, on the time-ordered test window, retained-picks ROI exceeds the
all-picks baseline ROI by >= 2 percentage points AND retention >= 60% (it must not achieve ROI by
abstaining on nearly everything)." Fail = either clause unmet; the >=60% retention floor is the
explicit anti-degenerate clause.

**`1911-11253v1` — `decision/1911-11253v1-hostile-market-abstain.ts`.** (a) Tests an explicit
abstain output trained to penalize abstaining only on would-be-correct games, with hostile-market
features (line-move magnitude, time-to-kickoff of the move, reverse-movement flags, news-volume
anomaly, input OOD). (b) Needs a comparison against the 1006 governor at a matched no-bet rate, plus
hit rate on the published set. (c) Pass = "ADOPT if the abstain head cuts the outright-wrong-pick rate
by >=40% relative to the 1006 governor at the SAME no-bet rate (+/-2 pp), with no loss of hit rate on
the published set." Fail = "otherwise REJECT."

**`2001-09097v1` — `decision/2001-09097v1-gap-stat-ratings.ts`.** (a) Tests GAP-style 4-way
(home/away offense/defense) ratings feeding win, spread-cover, and total models, on predictive
accuracy, closing-line value, and realized ROI. (b) Needs a 2019-2024 walk-forward, intermediate
measures (EPA/play, pressure rate, first-down rate, explosive-play rate), and Level Stakes ROI with
a confidence interval. (c) Pass = "Adopt if, on 2019-2024 walk-forward, the GAP-featured model beats
the market-only baseline by >=0.005 Brier points AND shows positive CLV (mean line move in our favour
>= +0.3 points) AND realised ROI CI excludes zero under Level Stakes." Fail = any clause unmet.

**`2002-03448v1` — `decision/2002-03448v1-levy-kelly-staking.ts`.** (a) Tests a closed-form Kelly
stake module both as a unit-level numeric reproduction and as a backtested staking policy, with a
log-normal sanity gate on kappa. (b) Needs a reproducible numerical spec of the paper's cases
(i)-(iii) and >=1 full season of engine picks for the backtest. (c) Pass = "ADAPT bar: closed-form
stakes must reproduce (i)-(iii) to 1e-6; backtest must show fractional-Kelly (kappa=0.25) beats flat
1-unit staking on log-wealth with lower max drawdown on >=1 full season of engine picks." Fail =
otherwise, in which case "staking stays flat." A separate stated edge gate: "Edge gate: E[r] > 0 else
stake 0. r = net return per unit staked."

**`2003-02743` — `decision/2003-02743-temporal-correlation-kelly.ts`.** (a) Tests whether temporal
correlation in sequential bet outcomes justifies a correlation-adjusted Kelly fraction. (b) Needs
backtest per-pick realized edge series to test lag-1 autocorrelation by team/market, a rolling
state-space fit, and a held-out window. (c) Pass = "ADOPT correlation-aware sizing if the
autocorrelation is statistically significant in at least one major market AND the sizing beats
baseline realized log growth by >= 3% on the held-out window." Fail = no significant autocorrelation,
or growth gain under 3%; the header falls back to classical Kelly when autocorrelation is not
significant at 95%.

**`2004-12099` — `decision/2004-12099-kelly-kkt-certificate.ts`.** (a) Tests two different things: a
KKT correctness certificate for the constrained Kelly solver (Theorem 3.1's conditions as a
build-failing unit test) and a sliding-window dominance screen R_ij(k). (b) Needs the empirical
return distribution, the solver's optimal weights, and each slate's mutually exclusive/correlated
picks. (c) Pass = "ADOPT the certificate test unconditionally if it passes on historical data (it is
a correctness property, not a performance bet). ADOPT the dominance screen only if it improves
realized ROI/drawdown >= 10% walk-forward." Fail = a certificate violation fails the build; a
sub-10% screen gain rejects only the screen.

**`2005-11698` — `decision/2005-11698-fluctuation-frontier.ts`.** (a) Tests whether a
Pareto-frontier-chosen Kelly fraction (at a configured fluctuation budget, default the knee)
reproduces its own predicted (<W>, sigma_W) point and improves the growth/fluctuation trade-off over
baseline. (b) Needs GSE's backtest edge distribution, the TUR-like bound as a monitoring invariant,
and realized growth/fluctuation on held-out data. (c) Pass = "ADOPT the frontier-chosen fraction if
its realized (<W>, sigma_W) point lies within 15% of the predicted frontier (validating the framework
on GSE data) AND it matches or beats baseline realized growth at lower realized fluctuation." Fail =
outside the 15% band, or no better growth at lower fluctuation.

**`2006-01862` — `decision/2006-01862-expert-deferral-router.ts`.** (a) Tests a jointly-trained
classifier-rejector router (model pick / expert pick / abstain) against always-model and
confidence-threshold routing, with a fairness audit on deferral. (b) Needs 1-2 seasons of logged
triples (game features, graded outcome, expert's lean / market-implied pick) and walk-forward
seasons. (c) Pass = "ADAPT accepted if the router's system units beat both always-model and
confidence-threshold routing on walk-forward seasons AND the per-subpopulation audit shows no biased
under-deferral." Fail = "else REJECT."

**`2101-12523` — `decision/2101-12523-sele-loss-gate.ts`.** (a) Tests a learned gate score (ridge on
realized loss, or pairwise SELE) evaluated by area under the risk-coverage curve, at the actual
operating coverage, against a probability-threshold baseline. (b) Needs the frozen pick model,
historical graded picks with realized loss, validation AuRC for C selection, and GSE's actual
published card size. (c) Pass = "ADAPT accepted if the learned score's AuRC beats the
probability-threshold baseline by >= 10% relative on walk-forward seasons AND the win holds at the
actual operating coverage (posted card size)." Fail = "else REJECT." The header adds a hard fail:
"Hard fail: if the learned score's top-coverage picks don't beat the baseline's at the exact card
size GSE publishes, do not ship regardless of AuRC."

**`2104-08236v1` — `decision/2104-08236v1-totals-abstention-sigma.ts`.** (a) Tests a softplus sigma
output on the totals regression head trained with an abstention loss, published iff sigma <= tau,
with sigma calibration audited. (b) Needs a validation season for the kappa = 90th-percentile
setting, a PID controller at GSE's target non-publish fraction, and test-window covered-set MAE.
(c) Pass = "ADAPT if the abstention model reduces test-window covered-set MAE vs baseline by >=0.5
points of total (or >=3% relative) with sigma z-scores within [-0.2, 0.2] mean and [0.8, 1.2] std."
Fail = "reject if the MAE gap is smaller or sigma is miscalibrated -- then use the simpler baseline,
which the paper itself calls 'a simple yet powerful method.'"

**`2104-08281v1` — `decision/2104-08281v1-cover-abstention-head.ts`.** (a) Tests a NotWrong-loss
abstention output on the cover/no-cover head against baseline, post-hoc likelihood thresholding, and
the DAC variant. (b) Needs cover/no-cover labels, a PID-controlled alpha, and test-window
covered-set accuracy with a significance test. (c) Pass = "ADAPT if the abstention model beats the
baseline on test-window covered-set accuracy by >=2pp with p<0.05 AND >= the DAC variant (replicating
the paper's NotWrong > DAC ordering)." Fail = "reject if it doesn't beat the baseline -- then
post-hoc thresholding stands and the extra machinery is dropped."

**`2107-03090` — `decision/2107-03090-risan-instance-abstention.ts`.** (a) Tests a joint (f, rho)
learner giving each pick its own abstention width, against the global-threshold gate and the
ledger-1775 learned score, including under injected noise. (b) Needs the pick model's feature trunk,
clean data plus 10-20% injected outcome noise, and matched-coverage hit rates. (c) Pass = "ADAPT
accepted if the joint (f, rho) learner beats the global gate by >= 3 points of accepted hit-rate at
matched coverage on clean data AND degrades less under 20% injected noise." Fail = "else REJECT
(keep the fixed-predictor learned score from 1775)."

**`2109-10814v1` — `decision/2109-10814v1-variance-budgeted-kelly.ts`.** (a) Tests two things: a
replication of the paper's own risk profile (a replication check, not a return claim), and the
variance-budgeted fraction alpha = sqrt(V_target / V(1)) against a fixed alpha. (b) Needs the
paper's reference portfolio path (annualized SD, max drawdown, final wealth) and GSE's walk-forward
picks (Neon picks, v5.2.7) for the head-to-head. (c) Pass = "Replicated fractional-Kelly portfolio
must satisfy: annualized SD in [0.16, 0.19], max drawdown in [38%, 46%], final wealth within 10% of
$576,464 -- i.e., reproduce the paper's risk profile, not just its return; then the
variance-budgeted alpha must beat fixed alpha on realized growth/risk." Fail = the replication missing
any of those bands, or the budgeted alpha not beating fixed alpha.

**`2205-13532` — `decision/2205-13532-training-disagreement-gate.ts`.** (a) Tests a
training-dynamics disagreement feature (late-weighted flips across 25-50 snapshots) added to the
gate, including a precision check on what the abstentions catch. (b) Needs per-round/seed prediction
snapshots during training, walk-forward seasons, and AuRC. (c) Pass = "ADAPT accepted iff adding the
disagreement feature improves AuRC by >=5% relative over the edge-only gate on walk-forward seasons
AND the top-disagreement abstentions are enriched for losses (precision check)." Fail = "else REJECT
the feature (keep snapshot logging off to save storage)."

**`2409-18645v1` — `decision/2409-18645v1-mc-dropout-cer.ts`.** (a) Tests MC-dropout with
certainty-based rejection, with gamma learned per market type, on AURCC and realized ROI at fixed
coverage. (b) Needs a hold-out season, a single-pass baseline, and T stochastic forward passes. (c)
Pass = "ADAPT bar: MC-dropout + CER must beat the current single-pass baseline on AURCC and realized
ROI at fixed coverage on a hold-out season." Fail = "if only the metrics move but ROI doesn't, adopt
the abstention machinery as a monitoring layer (risk-coverage reporting) rather than a selection
change."

**`2411-18374` — `decision/2411-18374-analytic-drawdown-pricer.ts`.** (a) Tests a closed-form
analytic drawdown pricer (Taylor's law via the exact eigenfunction/spectral expansion) for both
calibration and speed against Monte Carlo. (b) Needs a Monte Carlo reference
(`jumpDiffusionMonteCarloDrawdownProb` is shipped as the calibration reference) and, for the
calibration-slope clause, real weekly bankroll data the header notes is not available in this
environment. (c) Pass = "ADOPT the analytic pricer if its drawdown-probability predictions are
calibrated (calibration slope in [0.8, 1.2], Brier within 5% of Monte Carlo) while running >= 100x
faster than Monte Carlo." Fail = "REJECT if Laplace inversion is unstable or the BM approximation
miscalibrates on real weekly data." A scope note defers the jump-diffusion extension and the
calibration-slope check to the human call.

**`2502-07255v2` — `decision/2502-07255v2-dual-threshold-conformal.ts`.** (a) Tests replacing a fixed
70%-confidence abstention cutoff with a ROC-tuned dual-threshold conformal policy, fit per game
regime to attack the marginal-vs-conditional coverage gap. (b) Needs a conformity score and a
suspicion score, a test window, and coverage measured against the 1-alpha target. (c) Pass = "ADAPT
if the ROC-tuned abstention threshold beats a fixed 70%-confidence cutoff on test-window published ROI
by >=1pp at comparable coverage, with empirical coverage within +-3pp of the 1-alpha target." Fail =
sub-1pp ROI gain or coverage outside the band.

**`2503-07498` — `decision/2503-07498-two-knob-sizer.ts`.** (a) Tests a two-knob portfolio sizer
combining exponential-utility diversification weights with a generalized mean-variance log-utility
leverage term whose variance penalty scales with recent calibration error. (b) Needs 2023-2025
engine picks and a compound covariance (statistical estimation + non-stationary regime). (c) Pass =
"ADOPT the two-knob sizer if it beats half-Kelly independent staking on terminal log growth with max
drawdown <= half-Kelly's over 2023-2025, AND the fitted GMV leverage ratio f*/f_Kelly falls in [0.3,
0.7] consistently (validating the natural half-Kelly claim on sports data)." Fail = either clause
unmet. The header conditions activation on the gate passing on real walk-forward data plus a human
call.

**`2503-23782v1` — `decision/2503-23782v1-regime-conditional-reject.ts`.** (a) Tests replacing a
static epsilon=0.15-0.2 plug-in rejection budget with a regime-conditional one, and compares an
entropy-of-CRPS reject criterion against both the plug-in rule and the 0700 conformal gate. (b)
Needs labeled data (to fit F_hat_X and Ent) and an unlabeled sample (to set the budget), plus
published-game ROI. (c) Pass = "ADAPT if the epsilon=0.15-0.2 plug-in rule achieves |r-hat-epsilon|
<= 2pp and beats the no-gate baseline on published-game ROI by >=1pp with lower CRPS error; adopt the
entropy criterion if it also beats the 0700 conformal gate." Fail = the rejection-rate control
misses 2pp, or ROI gain under 1pp.

**`2505-00724` — `decision/2505-00724-crra-stake-dp.ts`.** (a) Tests a DP-distilled linear
staking rule (CRRA utility of terminal wealth, internalizing edge uncertainty in the DP) against
half-Kelly. (b) Needs a per-pick stake MDP per season, 2023-2025 second-half windows, and the
engine's posterior over edge. (c) Pass = "ADOPT the DP-distilled linear staking rule if it beats
half-Kelly on terminal log growth with max drawdown <= half-Kelly's across the 2023-2025 second-half
windows, and the distilled slope m is within 25% of the Kelly slope." Fail = "REJECT otherwise."

**`2505-22422v2` — `decision/2505-22422v2-star-bets-ci.ts`.** (a) Tests a sequential
(anytime-valid) Bernoulli-mean confidence interval built by inverting the STaR betting test, on width
near-optimality and validity, before it is used to count miscalibrated probability deciles. (b) Needs
a fully specified simulation: n = 256, Bernoulli(0.3), delta = 0.05, 1,000 reps, compared against the
randomized Clopper-Pearson interval. (c) Pass = "STaR-Bets mean CI width must be <= 1.1x the
randomized Clopper-Pearson mean width (near-optimality, Fig. 2R) with empirical coverage in [0.93,
0.97] (validity, Fig. 3)." Fail = wider than 1.1x, or coverage outside [0.93, 0.97].

**`2505-23437v2` — `decision/2505-23437v2-baltor-selection.ts`.** (a) Tests a bounded-abstention
pick-selection rule using Mondrian conformal prediction on edge-sign class (finite-sample coverage
guarantees), extended to listwise slate abstention. (b) Needs a 2024-2025 test window, random
selection and confidence-top-N baselines, and empirical-coverage measurement at c=0.70. (c) Pass =
"ADOPT the rule into the posting pipeline only if, on the 2024-2025 test window, BALToR-selected
picks beat the random-selection baseline by >=1.5 pp hit rate at c=0.70 with empirical coverage within
0.02 of target, and beat the existing confidence-top-N rule (if any) by >=0.5 pp." Fail =
"Otherwise REJECT."

**`2507-05994v1` — `decision/2507-05994v1-kpup-allocation.ts`.** (a) Tests a k-periodic universal
portfolio (k = 7 day-of-week or situational buckets, each learning its own allocation) against flat
fractional Kelly. (b) Needs k chosen on 2023 and evaluated on 2024-2025 walk-forward, with realized
bankroll multiple and max drawdown. (c) Pass = "ADAPT if on walk-forward (k chosen on 2023,
evaluated 2024-2025) the k-PUP bankroll multiple exceeds flat fractional-Kelly by >=10% with max
drawdown no worse than 1.2x the baseline's." Fail = under 10% multiple gain, or drawdown beyond 1.2x.

**`2508-07556v2` — `decision/2508-07556v2-instability-gate.ts`.** (a) Tests whether per-pick
prediction instability (checkpoint or 10-seed bagging disagreement) is a better selection signal than
confidence at fixed coverage. (b) Needs 2024-2025 engine picks at c=0.70, a confidence-top-70%
baseline, and a two-sided McNemar test. (c) Pass = "ADOPT if at c=0.70 on 2024-2025 engine picks,
instability-selected picks beat confidence-top-70% selection by >=1.0pp hit rate (or +1.0pp cover
rate for spreads), two-sided McNemar p<0.10." Fail = under 1.0pp, or not significant at p<0.10.

**`2510-19672` — `decision/2510-19672-committee-lcb.ts`.** (a) Tests two independent mechanisms: a
K=10 committee-disagreement abstention rule, and a lower-confidence-bound safe-upgrade gate for new
engine versions. (b) Needs a chronological test block, a matched-abstention comparison, and known-bad
and known-good engine-version candidates. (c) Pass = "ADAPT the disagreement rule iff it beats the
single-threshold rule by >=2 selective-ROI points at matched abstention rate on the chronological
test block; ADAPT the LCB upgrade gate iff it blocks the known-bad candidate while passing the
known-good one." Fail = each clause gates its own half.

**`2601-20452v1` — `decision/2601-20452v1-whale-distortion.ts`.** (a) Tests a whale-distortion
detector (implied whale capital share behind a line move) and a fade-the-whale paper signal, on
reversion rate and post-vig profitability. (b) Needs a full season of line moves with
volume-implied price impact, size-matched unflagged moves as the control, and a paper portfolio
after vig. (c) Pass = "ADAPT the detector if whale-flagged line moves reverse at a rate >=10 points
higher than size-matched unflagged moves over a full season AND the fade-the-whale paper portfolio
is profitable after vig." Fail = under a 10-point reversion gap, or the paper portfolio is not
profitable after vig.

**`2601-22570v1` — `decision/2601-22570v1-memory-abstention.ts`.** (a) Tests a memory-augmented
plug-and-play abstention policy (k nearest historical game-states correct the model's confidence by
neighbor accuracy) against raw-confidence abstention. (b) Needs 2024 picks, a memory of historical
game-states, and AURC plus ROI at matched coverage. (c) Pass = "ADOPT if on 2024 the
memory-augmented abstention policy yields higher ROI at matched coverage than raw-confidence
abstention, with AURC reduced by >=10% relative." Fail = no ROI improvement at matched coverage, or
AURC reduction under 10%.

**`2603-24704` — `decision/2603-24704-evalue-screening.ts`.** (a) Tests e-value screening as the
card-selection gate, with per-market-type nominal risk budgets, on realized average loss and pick
volume. (b) Needs trailing graded picks for calibration, four test seasons, and a target nominal
average loss (the header names -0.02 units/pick). (c) Pass = "ADOPT accepted if walk-forward realized
average loss stays within +-0.03 units of nominal across all four test seasons AND posts >= 70% as
many picks as the baseline gate at matched realized loss." Fail = "else REJECT."

**`2604-24723v2` — `decision/2604-24723v2-multivariate-kelly.ts`.** (a) Tests an O(TN) multivariate
Kelly Newton-CG solver, first as a numerical correctness check against brute force, then as the slate
stake allocator, plus a correlation-guard measurement. (b) Needs N = 10 over 100 random instances for
the solver check, a greedy lower bound per instance, and Neon picks slates for the deployment
comparison. (c) Pass = "At N = 10 over 100 random instances: max relative error vs brute force
<= 10^-6; Newton-CG optimum >= greedy lower bound on every instance; adopt as the slate stake
allocator if it beats current per-pick fractional Kelly on realized log-wealth and max drawdown on
Neon picks slates." Fail = any numerical clause violated, or no improvement over per-pick
fractional Kelly.

**`2605-02611` — `decision/2605-02611-lipschitz-forcing.ts`.** (a) Tests Lipschitz-forced
(spectral-normalized) selection heads posting only forced-set games, against an
empirical-disagreement baseline at matched coverage. (b) Needs oracle post/don't-post labels from
graded picks, slate game embeddings, and chronological slate evaluation. (c) Pass = "ADAPT the
forcing rule iff forced picks beat the empirical-disagreement baseline by >=1 selective-ROI point at
matched coverage on chronological slate evaluation." Fail = under 1 point.

**`2607-24875v1` — `decision/2607-24875v1-hybrid-uncertainty.ts`.** (a) Tests a hybrid uncertainty
score U (evidence disagreement, source contradiction, run disagreement, data completeness, entropy,
calibration gap) against temperature-scaling-only and MC-Dropout-only baselines, including whether
the disagreement terms earn their weight. (b) Needs 2023-2024 validation picks to fit the weights and
a 2025 held-out set for the locked test at 80% coverage. (c) Pass = "ADOPT if 2025 held-out shows the
hybrid U beats temperature-scaling-only and MC-Dropout-only baselines on selective hit rate at 80%
coverage by >=1 pp with positive fitted weights on disagreement/contradiction terms (w_D, w_C > 0)."
Fail = "REJECT if w_D/w_C fit at ~0." (A sub-1pp hit-rate gain or an outright loss is also a reject.)

**`2608-23393` — `decision/2608-23393-kellyboost.ts`.** (a) Tests a CRRA-dialed growth-optimal
portfolio layer (softmax over K picks plus a cash leg, negative log-growth loss, K_ens=4
leave-one-out ensemble) against independent 1/4-Kelly staking. (b) Needs 2023-2025 NFL walk-forward
slate return vectors, a bootstrap on the paired weekly difference, and drawdown tracking. (c) Pass =
"Gate: ADOPT the CRRA-dialed KellyBoost portfolio layer if, on the 2023-2025 NFL walk-forward, it
beats independent 1/4-Kelly staking by >= +0.05 mean log-growth per week with max drawdown no worse
than 1.2x the baseline's, and the paired weekly difference has bootstrap Pr(Delta>0) >= 0.80." Fail =
"REJECT (keep flat/independent Kelly) otherwise."

**`2609-22632` — `decision/2609-22632-perclass-gates.ts`.** (a) Tests per-market-type gates (classes
= spread, total, moneyline) with separate error caps from bankroll tolerance, minimizing abstention
subject to the caps. (b) Needs four test seasons, weekly realized per-class error logging, and
quarterly cap re-fits. (c) Pass = "ADAPT accepted if per-class gating holds all market types under
their caps with >= 15% lower abstention than the global gate on walk-forward seasons." Fail =
"else REJECT." The header adds a hard fail: "Hard fail: if any market type's realized error exceeds
its cap in >1 of 4 test seasons, fall back to additive-only and re-test before any ship decision."

### ensemble

**`1803-01984` — `ensemble/1803-01984-bps-outcome-pools.ts` — gate stated, no status line.** (a) Tests
whether Bayesian predictive synthesis with outcome-dependent weights beats an equal-weight pool and
BMA-style weighting, plus a separately gated dynamic discount layer. (b) Needs three or four model
margin densities (engine v5.2.7, de-vigged market, Elo), a diffuse historical NFL margin baseline
as safe haven, bias terms fit by maximizing log score on 2023-2024, and 2025 evaluation. (c) Pass =
"ADOPT outcome-dependent BPS only if 2025 mean log score beats the equal-weight pool by >=0.02 nats
AND beats BMA-style weighting, with 80% interval coverage in [0.75, 0.85]." Fail = "REJECT (fall
back to constant-weight pool + baseline) if log-score gain < 0.01 nats or outcome-dependent weights
collapse to near-constant. Dynamic discount layer accepted separately if it beats static BPS on
second-half log score."

**`2010-10435v1` — `ensemble/2010-10435v1-time-varying-forecast-combination.ts` — NOT EVALUATED.**
(a) Tests local-linear time-varying combination weights (Epanechnikov kernel, bandwidth by LOO CV,
reflection at the week boundary) against equal weights and static OLS. (b) Needs >=2 seasons of
component forecasts (engine v5.2.7, market-implied, Elo, situational) and a Diebold-Mariano test. (c)
Pass = "Time-varying combination must beat equal weights and static OLS on OOS Brier/ASCFE with DM
p<0.10 on a >=2-season backtest." Fail = "if weights collapse to near-constant (no time variation
found), fall back to static combination and record the negative."

**`2011-02077` — `ensemble/2011-02077-factor-graphical-ensemble.ts` — NOT EVALUATED.** (a) Tests
whether a factor structure exists in the model panel's forecast errors and whether the resulting
SMW-reconstructed optimal weights beat equal weights and static OLS. (b) Needs the GSE model-panel
forecast errors, an EBIC-tuned GLASSO idiosyncratic precision, and the plain-GLASSO degeneracy
diagnostic. (c) Pass = "ADAPT if the degeneracy diagnostic confirms the factor structure in GSE's
model-panel forecast errors and the resulting optimal weights beat equal weights and static OLS on
OOS MSFE." Fail = the diagnostic does not confirm factor structure, or the weights do not beat the
baselines on OOS MSFE.

**`2012-01643` — `ensemble/2012-01643-diversity-weighted-combiner.ts` — NOT EVALUATED.** (a) Tests a
meta-learner mapping the slate's pairwise diversity vector to per-model softmax weights. (b) Needs
K sub-model forecast vectors per slate horizon, gradient-boosted trees, and a held-out 2025 season.
(c) Pass = "ADOPT the diversity-weighted combiner if, on the held-out 2025 season, it beats the
simple-average baseline by >=2% relative log-loss AND beats the static skill-weighted baseline by
>=1% relative, with calibration slope within [0.9, 1.1]." Fail = "REJECT (keep simple average) if it
fails either gate or the meta-learner's feature importances concentrate on <3 pairs (degenerate
map)."

**`2101-08954` — `ensemble/2101-08954-hierarchical-stacking.ts` — NOT EVALUATED.** (a) Tests
regime-dependent (input-varying) stacking weights with automatic small-cell shrinkage against static
stacking, plus a local-fit diagnostic. (b) Needs plain log-score stacking already deployed, held-out
log-loss, and small-slice diagnostics. (c) Pass = "ADAPT the hierarchical stacking architecture after
plain log-score stacking is deployed: input-varying weights must beat static stacking on held-out
log-loss with sane local-fit diagnostics, and small cells must show proper shrinkage (no wild weights
on thin slices)." Fail = no held-out log-loss gain, unsane local fits, or wild weights on thin
slices.

**`2104-04918v2` — `ensemble/2104-04918v2-weighted-quantile-combination.ts` — NOT EVALUATED.** (a)
Tests level-specific quantile combination (M=5 grid, per-level weights on trailing 8 weeks) and a
joint tail functional. (b) Needs model margin-quantile curves per quantile level, a strictly
consistent joint loss, and per-level VRate monitoring. (c) Pass = "ADAPT accepted if walk-forward
mean quantile loss >=2% below the simple-average baseline at >= 4 of 5 grid levels AND the joint
tail-functional loss >=2% below FC-SA, with per-level VRate within [0.7alpha, 1.3alpha] (calibration
guard)." Fail = "else REJECT." Hard fail: "if any level's weights collapse to a single model for
>80% of weeks (combination adds nothing), reject."

**`2107-06268` — `ensemble/2107-06268-smoothed-boa-ensemble.ts` — NOT EVALUATED.** (a) Tests a
shock-handling ensemble: an event-adjustment front end plus window-diverse experts plus smoothed
Bernstein Online Aggregation. (b) Needs holiday/short-rest/bye event dummies, window-diverse model
copies (8wk / 1-season / 3-season), and discounted validation loss. (c) Pass = "ADOPT if smoothed BOA
beats plain BOA by >=1% on margin MAE OR the event-adjustment front-end improves
holiday/short-rest-week MAE by >=5% without hurting normal weeks." Fail = "REJECT if the smoother's
selected lambda collapses to ~=0 AND the front-end shows no holiday-week gain."

**`2108-02082v3` — `ensemble/2108-02082v3-regime-blender-febama.ts` — NOT EVALUATED.** (a) Tests a
regime-feature-conditioned FEBAMA blender (softmax weights linear in regime features, L-BFGS MAP
with N(0,10^3) priors) on both log-loss and a CLV-aware objective. (b) Needs bet-time regime features,
a 2024 weeks-10-18 walk-forward, simple-average and constant-OP baselines, and Gibbs draws. (c) Pass =
"ADAPT accepted if feature-conditioned weights achieve >=2% relative log-loss improvement over BOTH SA
and constant OP weights on the 2024 weeks-10-18 walk-forward, with >=3 regime features selected in
>50% of Gibbs draws." Fail = "Hard fail: weights collapse to near-constant (max range < 0.05 across
games)."

**`2111-15365` — `ensemble/2111-15365-weekly-boa-consensus.ts` — NOT EVALUATED.** (a) Tests a weekly
BOA consensus layer on accuracy, tail risk (Kelly-staked drawdown), and weight churn. (b) Needs
2024-2025 weekly realized losses per expert, a static equal-weight baseline, and the best single
expert for the tail-risk comparison. (c) Pass = "ADOPT iff on 2024-2025 the BOA consensus beats the
static equal-weight baseline by >=1.5% relative Brier AND the Kelly-staked max drawdown is <=70% of
the best single expert's (the paper's tail-risk signature), with week-to-week weight churn not
exceeding 2x the uniform baseline's." Fail = any clause unmet.

**`2202-11834` — `ensemble/2202-11834-beta-linear-pool.ts` — NOT EVALUATED.** (a) Tests a Beta Linear
Pool post-processing layer on the linear-pool consensus for under-prediction, on both log score and
calibration. (b) Needs per-market (alpha, beta) by MLE on log score over past seasons with
shrinkage-regularized lambda by leave-one-season-out CV, a 2025 holdout, and PIT diagnostics. (c) Pass
= "ADOPT iff on the 2025 holdout it improves mean log score over the weight-optimized LP by >=0.02
AND its PIT Cramer distance is <= LP's (no calibration regression), with no systematic
under-prediction (PIT CDF within +-0.05 of diagonal at all deciles)." Fail = any clause unmet.

**`2203-03279v3` — `ensemble/2203-03279v3-fforma-fusion.ts` — NOT EVALUATED.** (a) Tests an
FFORMA-style LightGBM meta-learner against a small-MLP stack and a plain average, on relative
log-loss. (b) Needs game meta-features (spread bucket, total, market disagreement, ATS form
volatility, rest, weather), weights learned on weeks 1-9 applied to weeks 10-18, and a 2024
walk-forward. (c) Pass = "ADAPT accepted iff FFORMA-style blender beats SA by >=2% relative log-loss
on the 2024 walk-forward AND beats the NN-stack in >=2 of 3 markets." Fail = "reject if neither beats
SA by >=1.5%."

**`2209-01697` — `ensemble/2209-01697-regime-factor-glasso.ts` — NOT EVALUATED.** (a) Tests
regime-dependent factor Graphical LASSO combination: whether detected breaks align with known regime
events, whether post-break combination beats equal and sample-precision weights, and a
stable-period negative control. (b) Needs a panel of weekly forecast errors from K~10-30 models over
3+ seasons, PCA common-factor removal, Bai-Perron break tests, and known regime events (mid-season QB
changes, COVID seasons). (c) Pass = "Gate is the break-alignment/post-break MSFE test: detected
Bai-Perron break dates must align with the known regime events, and post-break combined
MSFE/log-score must beat both equal weights and sample-precision weights." Fail = breaks misaligned
with known events, or post-break MSFE/log-score not beating both baselines. Negative control: "a
stable-period negative control (no spurious breaks; FGL no worse than EW in stable periods)."

**`2406-15760` — `ensemble/2406-15760-icm-drift-monitor.ts` — NOT EVALUATED.** (a) Tests a weekly ICM
concept-drift monitor keyed on a market-relative nonconformity score (testing exchangeability of the
edge distribution) for detection latency and false-alarm rate. (b) Needs an offline replay, the 2024
kickoff-rule change on the TOTALS stream as a known event, and 2024-2026 data. (c) Pass = "ADAPT if
the offline replay fires an alarm within 3 weeks of the 2024 kickoff-rule change on the TOTALS stream
with <=1 false alarm per season on 2024-2026 data -- then deploy the monitor as a weekly cron job
feeding the recalibration queue." Fail = "Reject if alarms are dominated by noise (>=3 false
alarms/season) or if detection latency exceeds 6 weeks."

**`2408-00785v4` — `ensemble/2408-00785v4-kairosis-forecast-aggregation.ts` — NOT EVALUATED.** (a)
Tests Bayesian change-point time-weighting (Kairosis) plus inverse-covariance intersection fusion
against a uniform median benchmark. (b) Needs engine probability snapshots, market and weather
streams, a pick set, and a known midweek information-regime shift. (c) Pass = "Kairosis median
achieves positive skill vs uniform median benchmark on both Brier and log-loss across the pick set;
margin should exceed the paper's ~0.04-0.06 skill units to justify the added machinery." Fail =
non-positive skill on either metric, or a margin inside the paper's range where the added machinery
is not justified.

### experimental

**`1601-04302v6` — `experimental/1601-04302v6-footballonomics-bootstrap.ts` — NOT EVALUATED.**
(a) Tests whether the paper's FPM bootstrap architecture replicates on modern NFL data: bootstrap
calibration, the direction of the factor hierarchy, and dependency on a dead data source. (b) Needs
nflverse per-team season feature matrices (recency-weighted), B=1,000 correlated performance vectors
per matchup, 2020-2025 data, and the H_0: Pbar_1 = Pbar_2 test. (c) Pass = "ADAPT gate: (a) Test 2
calibration must hold on modern data -- bootstrap means must pass the y=x check; (b) the factor
hierarchy must replicate directionally on 2020-2025 data (turnovers dominant, r-balance signal
present); (c) any result depending on the dead nflgame data source is dropped."

**`1708-02715v1` — `experimental/1708-02715v1-order-flow-resiliency.ts` — NOT EVALUATED.** (a) Tests
whether order-flow decomposition adds explanatory power for price moves in prediction markets, and
whether the scarce-liquidity detector beats a volume-only baseline out of sample. (b) Needs
Kalshi/Polymarket NFL contract data, volume bucketing, per-bucket taker imbalance and maker net
flow, and a volume-only baseline. (c) Pass = "ADAPT gate: (a) Test 1 must replicate the qualitative
pattern (order-flow decomposition adds explanatory power) on prediction-market data; (b) the SL
detector must beat a volume-only baseline out-of-sample." Fail = either clause unmet.

**`1804-04226v1` — `experimental/1804-04226v1-cfov-decomposition.ts` — gate stated, no status line.**
(a) Tests a Consistency/Form/Opposition/Venue feature decomposition for NFL receiving props, with
learned rather than subjective AHP weights and strictly point-in-time features. (b) Needs nflverse
2006-2025, grouped-regularized multinomial regression, time-ordered train (<=2022) / test
(2023-2025), and a career-average baseline. (c) Pass = "Adopt the Consistency/Form/Opposition/Venue
feature set for GSE props only if the time-ordered test shows >=3pp accuracy gain or >=0.01 log-loss
improvement over the career-average baseline." Fail = "reject if the gain vanishes under honest
time-ordered evaluation (the paper's random-split numbers do not count as evidence)."

**`1805-01271v1` — `experimental/1805-01271v1-its-break-harness.ts` — gate stated, no status line.**
(a) Tests an interrupted-time-series Poisson structural-break harness as backtest QA (positive
control on the 2011 regime break, no spurious breaks in stable eras), and separately a
conditioning/non-conditioning injury-taxonomy feature. (b) Needs backtest residuals with the level
shift and trend-break parameterization, stable eras 2012-2019, the 2011 break, and spread-model
holdout log-loss. (c) Pass = "Adopt the ITS harness into GSE's backtest QA only if the
positive-control test detects the 2011 regime break (p < 0.05 on the trend-break term) without
flagging spurious breaks in stable eras (2012-2019); reject the injury-taxonomy feature if
conditioning-share of inactives adds no >=0.002 holdout log-loss improvement to the spread model over
a simple starter-out count."

**`1811-03931v1` — `experimental/1811-03931v1-riskneutral-inplay-pricer.ts` — gate stated, no status
line.** (a) Tests a risk-neutral drive-level in-play pricing engine calibrated to live market
totals. (b) Needs 2024 holdout games, live consensus books for bid-ask-weighted least squares
calibration, and a direct empirical jump model as the comparison. (c) Pass = "Adopt the risk-neutral
in-play pricer as GSE's live-totals engine if the reproducibility test hits calibration error <= 2.0
bid-ask spreads with jump correlation >= 0.70 on 2024 holdout games." Fail = "reject if intensities
must be re-fit so often that the 'constant lambda' closed forms add nothing over a direct empirical
jump model -- then keep only the implied-intensity calibration idea."

**`1905-03628v1` — `experimental/1905-03628v1-nested-poisson-totals.ts` — NOT EVALUATED.** (a) Tests
nested conditional structure (underdog second-half scoring rate conditioned on the favorite's
realized first-half points) against an independent-Poisson baseline. (b) Needs holdout in-play totals
data and a significance test on the gamma_2 coefficient. (c) Pass = "Adopt the nested conditional
structure for the in-play totals model if it beats the independent-Poisson baseline on holdout
log-loss by >=0.005 with gamma_2 significant (p < 0.05)." Fail = "reject if gamma_2 is insignificant
or the gain is < 0.005."

**`2006-04551v4` — `experimental/2006-04551v4-mimic-model-tree.ts` — NOT EVALUATED.** (a) Tests
whether a linear model tree can distill the production probability model faithfully, produce a
plausible feature-importance ranking, and yield a content-usable rule. (b) Needs engine soft labels on
the full training corpus, counterfactual augmentation, de-vigged market-implied probabilities as joint
targets, and a time-ordered 2025 holdout. (c) Pass = "Adopt the mimic-tree sidecar if: (i) fidelity
correlation >= 0.95 and RMSE <= 0.03 on the time-ordered 2025 holdout; (ii) the top-10 importance
ranking agrees with GSE's known drivers (no implausible top-3 feature); (iii) at least one extracted
rule is content-usable by analysts." Fail = any clause unmet.

**`2101-10385v1` — `experimental/2101-10385v1-bandit-model-selector.ts` — NOT EVALUATED.** (a) Tests
a decay epsilon-greedy model-version selector replayed against equal-split A/B, on cumulative regret
and traffic concentration. (b) Needs 2024 NFL posted picks with per-version realized KPIs and a
Week-9 / Week-12 checkpoint. (c) Pass = "ADAPT if a replay of decay epsilon-greedy on 2024 NFL
posted picks shows (a) cumulative-regret reduction >= 20% vs equal-split A/B in ROI terms by Week 9,
AND (b) the selector's traffic share for the ex-post best arm >= 70% by Week 12." Fail = "REJECT
otherwise (the mechanism adds complexity without demonstrated traffic-savings)."

**`2103-04349v1` — `experimental/2103-04349v1-irl-situational-decisions.ts` — NOT EVALUATED.** (a)
Tests whether IRL recovers a known reward function on synthetic ground truth (the paper never
validates its own IRL), whether inferred NFL weights sit at optimization bounds, and whether the
expert definition matters. (b) Needs a synthetic MDP with known reward, NFL drive states and actions,
and both expert definitions (winners vs top-EPA teams). (c) Pass = "ADAPT gate: (a) Test 1 must show
the IRL recovers a known reward function on synthetic ground truth (the paper never validates its
IRL -- do not skip this); (b) inferred NFL weights must not all sit at optimization bounds (the
paper's bound artifact); (c) expert-definition sensitivity must be checked (winners vs top-EPA
teams)." Fail = "If (a) fails, the method is unvalidated machinery -> REJECT. The cricket simulator and
DLS results are not adopted under any gate."

**`2106-05174v1` — `experimental/2106-05174v1-nested-zigp-simulation.ts` — NOT EVALUATED.** (a) Tests
whether a nested conditional dependence term (garbage-time / prevent-defense mechanism) is
empirically nonzero on NFL data, whether exact-score log-loss improves, and whether the paper's
step-3 parameter averaging is replaced by a principled joint reconciliation. (b) Needs NFL
per-team scoring/concession distributions and out-of-sample exact-score log-loss against a
Gaussian-copula Poisson and Dixon-Coles lambda_3. (c) Pass = "ADAPT gate: (a) the nested dependence
term beta_3 must be empirically != 0 on NFL data (garbage-time/prevent-defense mechanism); (b)
exact-score log-loss must improve over the independent baseline out-of-sample; (c) step-3 parameter
averaging replaced by a principled reconciliation." Fail = "If (a) fails, the mechanism is
soccer-specific theater and the paper drops to REJECT."

**`2108-00821v2` — `experimental/2108-00821v2-news-reaction-ssm.ts` — NOT EVALUATED.** (a) Tests
behavioral replication (a surprising-news coefficient on line moves) and tradability (a contrarian
rule's CLV after surprising events). (b) Needs 1-minute odds-change velocity snapshots, nflfastR
pre-play win probability for surprise classification (thresholds at <25%), a 2024 holdout, and >=100
surprising events. (c) Pass = "ADOPT the adapted design if BOTH hold on the 2024 holdout: (1) the
surprising-news coefficient beta-hat_surprising > 0 with 95% CI excluding zero (behavioral
replication); (2) a contrarian rule shows positive mean CLV per event at >= +0.5% average with
two-sided p<0.05 on >=100 surprising events." Fail = either clause unmet.

**`2109-06625v1` — `experimental/2109-06625v1-off-policy-coach-rl.ts` — NOT EVALUATED.** (a) Tests
an off-policy RL policy on critical 4th-down situations, evaluated by importance sampling and
doubly robust OPE on strictly held-out seasons, with an interpretability and non-degeneracy check.
(b) Needs nflverse coach decisions 2009-2024 as the behavior policy, strictly held-out seasons, and
ESS/max-weight reporting. (c) Pass = "Accept Prong A if held-out OPE shows >=0.5 wins/season gain over
coaching behavior with effective sample size >50% of nominal (weights not degenerate) -- and the
learned policy's recommendations are interpretable (e.g., more aggressive on 4th-and-short in
opponent territory)." Fail = "Reject if IS weights collapse or the policy just rediscovers 'always go
for it' without situational nuance."

**`2206-01038v1` — `experimental/2206-01038v1-video-action-recognition-menu.ts` — NOT EVALUATED.**
(a) Tests the video lane's architecture menu, first by reproducing a public benchmark and then by a
small NFL pilot. (b) Needs public SoccerNet event classification in PyTorch for the reproduction, and
~200 labeled NFL plays for the pilot. (c) Pass = "ADOPT the video lane's architecture menu iff the
SoccerNet reproduction lands within 3 points of published accuracy AND a pilot fine-tune on ~200
labeled NFL plays achieves top-1 >= 0.70 on play-type classification." Fail = "if the NFL pilot <
0.60, park the lane."

**`2206-09654v1` — `experimental/2206-09654v1-season-total-lstm-ensemble.ts` — NOT EVALUATED.** (a)
Tests season-total projection LSTMs plus a deliberate conservative/aggressive ensemble against GSE's
regression baseline. (b) Needs 5 prior seasons x ~20 features per player, 2023-2024 holdouts, and an
elite-bias asymmetry diagnostic. (c) Pass = "Accept iff the LSTM beats GSE's regression baseline on
2023-2024 holdouts by >=3% MAE on at least two of three yardage categories AND the elite-bias
diagnostic reveals a correctable asymmetry." Fail = "reject if it merely matches regression (the
paper's own 2018 result: LR essentially tied the LSTMs)."

**`2206-11578v1` — `experimental/2206-11578v1-doubly-online-changepoint.ts` — NOT EVALUATED.** (a)
Tests an online changepoint monitor over weekly player series against CUSUM, on detection F1, alert
volume, and convergence. (b) Needs 2019-2023 player series, injury/role-change ground truth, and
17-game series for the EM convergence check. (c) Pass = "Accept iff it beats CUSUM on F1 against
injury/role-change ground truth on 2019-2023 AND the within-+-1-week precision justifies the alert
volume (<=2 flags per team-week on average)." Fail = "REJECT if the changepoint rate approaches the
paper's 40% (pure noise) or EM fails to converge on 17-game series -- fall back to BOCPD."

**`2209-07274v5` — `experimental/2209-07274v5-convexity-grid-war.ts` — NOT EVALUATED.** (a) Tests a
standing metric design rule (convex mappings must be computed per game and summed, never from season
averages), an Empirical Bayes talent estimator, and a Poisson drive grid against the empirical WP
grid. (b) Needs NFL QB data, 2024 rank RMSE, and per-cell comparison of the two WP grids. (c) Pass =
"Accept the design rule iff Test 1 replicates on NFL QB data (per-game-aggregated value regressed on
average-converted value gives slope significantly < 1); accept the Empirical Bayes talent estimator
iff it beats raw per-game means on 2024 rank RMSE; reject the Poisson drive grid iff it disagrees with
the empirical WP grid by >2pp in any (drives, differential) cell (fall back to the empirical grid
with monotonic smoothing)."

**`2211-04459v3` — `experimental/2211-04459v3-flexbart-tabular-learner.ts` — NOT EVALUATED.**
(a) Tests flexBART as a Bayesian tabular learner (and a learned-similarity-kernel hybrid) on
accuracy, interval coverage, and MCMC cost. (b) Needs high-cardinality categoricals (team/QB/coach
IDs, referee crew), 2024 out-of-sample evaluation, >=4 chains with R-hat checks, 2000+ iterations,
and the DGP2 singleton-outlier caveat as a diagnostic. (c) Pass = "Adopt flexBART iff: (a)
out-of-sample RMSE on 2024 improves >=3% over one-hot XGBoost ... AND (b) 80%/90% posterior intervals
achieve empirical coverage within +-3 pp of nominal, with runtime acceptable for weekly batch." Fail
= "reject if gains <3% (check the DGP2 singleton-outlier caveat) or MCMC cost exceeds the batch
window; reject the network extension if gs2/gs3 don't beat flexBART_unif on the schedule-graph
task."

**`2308-02414v3` — `experimental/2308-02414v3-bivariate-ssm-skill-rating.ts` — NOT EVALUATED.**
(a) Tests a bivariate attack/defence state-space model against the Elo-Davidson baseline across
three rolling test windows, and whether the attack/defence decomposition adds interpretable signal.
(b) Needs nflverse under a rolling 3-train/1-test protocol across three test windows. (c) Pass = "ADOPT
if: on the rolling 3-train/1-test nflverse protocol, the bivariate attack/defence SSM achieves mean
test average-NLL improvement >= 0.01 over the Elo-Davidson baseline across all three test windows AND
no window shows degradation." Fail = "REJECT if: the SSM fails to beat Elo-Davidson on >=2 of 3 test
windows, or the attack/defence decomposition adds no interpretable signal beyond the single-skill
SSM."

**`2402-01914v1` — `experimental/2402-01914v1-glmf-matchup-matrices.ts` — NOT EVALUATED.** (a) Tests
heterogeneous linked matrix factorization on receiver x defense (or QB x defense) matchup matrices,
on likelihood margin and convergence reliability. (b) Needs a binomial matchup matrix with
aggregates/NGS-grade side matrices, cross-validated folds, and the current GSE shrinkage/matchup prior
as baseline. (c) Pass = "ADOPT only if GLMF beats the current GSE shrinkage/matchup prior by a
statistically significant log-likelihood margin with zero convergence failures across folds." Fail =
"ADAPT (offline research prior) if it only matches; otherwise REJECT."

### injuries

**`1705-03918` — `injuries/1705-03918-two-version-causal.ts` — NOT EVALUATED.** (a) Tests a
zero-cost dual-interval (Ic + Iv) construction plus Rosenbaum sensitivity for every situational
causal claim GSE publishes about rest/travel/surface/dome. (b) Needs a rest-advantage replication on
matchup-matched (spread/total/Elo) as-if-random sets, with a version-split union (the header's
example: rest = [3-4 days] vs [7+ days]). (c) Pass = "ADAPT if on the rest-advantage replication: Iv
width <= 1.4x Ic width AND the Gamma-value tipping Iv to include 0 is >= 1.3." Fail = wider than
1.4x, or a Gamma value below 1.3.

**`1710-08749v1` — `injuries/1710-08749v1-ppta-causal.ts` — NOT EVALUATED.** (a) Tests PPTA
(posterior predictive treatment assignment) against IPTW under few treated units and poor overlap, on
coverage, bias, and interval width. (b) Needs a poor-overlap regime, nflverse play-by-play 2015-2024,
and game-level treatment definitions (mid-season QB changes, coordinator firings, rest advantages). (c)
Pass = "Adopt if PPTA achieves coverage >=90% with bias <=50% of IPTW's bias under the poor-overlap
regime, at <=20% wider intervals than overlap weights." Fail = "reject otherwise (if overlap weights
match it, take the cheaper estimator)."

**`1801-07104` — `injuries/1801-07104-hot-hand-repetition.ts` — gate stated, no status line.** (a)
Tests whether within-drive repetition heats and between-touch interruption cools NFL player
performance, via delta_12-style player-adjusted contrasts. (b) Needs nflverse pbp 2015-2024,
per-player-per-play success (reception/catch, yards over expected via NGS), and a Bayesian
hierarchical logistic fit with player random intercepts/slopes. (c) Pass = "ADAPT the
repetition/interruption feature family if the NFL replication finds a player-adjusted within-drive
repetition effect >= +2pp catch rate with |z| > 3 AND a between-drive interruption effect <= -1pp with
|z| > 2." Fail = "REJECT if both |z| < 2 (no signal in football touches)."

**`2009-06750` — `injuries/2009-06750-icing-causal-dag.ts` — NOT EVALUATED.** (a) Tests the causal
effect of icing-the-kicker timeouts on FG/XP make probability, on balance, effect size, and interval
tightness. (b) Needs nflverse pbp (all FG/XP 1999-2024), a GBM propensity on confounders (kick
distance, weather, kicker quality, score differential, time remaining, dome/outdoor), exact matching
on distance bucket and same game, and permutation inference. (c) Pass = "ADAPT the DAG+matching
template if the NFL icing replication achieves post-match SMD < 0.1 on all observed confounders AND
the 99% permutation CI for the ATT either excludes 0 with |ATT| >= 0.03 (real effect -- publish) or
includes 0 with CI half-width < 0.03 (clean null -- prune the feature)." Fail = "REJECT if balance
fails or CI half-width > 0.05."

**`2011-11691` — `injuries/2011-11691-fourth-down-att-matching.ts` — NOT EVALUATED.** (a) Tests an
ATT estimate of aggressive 4th-down (and 2-point conversion) decisions on balance, significance,
sign robustness, and hidden-bias sensitivity. (b) Needs 4th-down decision units, an integrated
centered win-probability-difference outcome, covariates (yard line, yards to go, score differential,
time/timeouts remaining, pre-game spread/total, weather, team and coach identity), a GAM or GBM
propensity, genetic matching, and Rosenbaum Gamma. (c) Pass = "ADOPT the pipeline if on the NFL
4th-down replication (a) post-match |standardized bias| < 0.2 for all covariates, (b) the ATT estimate
has |t| > 2 and the sign is unchanged when FG attempts are excluded from the control pool, and (c)
Rosenbaum Gamma for loss of significance >= 1.5." Fail = "REJECT if balance fails or Gamma < 1.2."

**`2108-08797` — `injuries/2108-08797-synthetic-pretraining-detector.ts` — NOT EVALUATED.** (a) Tests
synthetic pretraining for rare-event detectors on recall-weighted F2, on real-data calibration, and on
residual manual workload. (b) Needs a physics/simulation-based synthetic generator for the rare class,
real negatives, pre-registered F2 reporting, and MC-dropout triage. (c) Pass = "Gate (numeric): ADAPT
the synthetic-pretraining recipe if the replication shows F2 gain >= 0.03 with no increase in false
negatives." Fail = "REJECT if synthetic pretraining degrades real-data calibration (PPV drop > 0.05 on
real data)."

**`2202-08500` — `injuries/2202-08500-recurrent-competing-events.ts` — NOT EVALUATED.** (a) Tests
whether the total vs controlled-direct effect distinction matters empirically for recurrent
soft-tissue injury, and whether the identified positivity holds. (b) Needs nflverse injury +
snap-count workload 2018-2024, a discrete-time g-formula/IPW estimator, a naive censor-at-IR
comparison, and weight truncation. (c) Pass = "ADAPT iff the NFL replication shows the naive
censor-at-IR estimate and the IPW total effect differ by >=20% (competing-event distinction matters
empirically) with identified positivity (no weight truncation beyond [0.1,10] needed for >95% of
player-weeks)." Fail = "REJECT the full machinery if the difference is <10% -- keep only the taxonomy
as a reporting standard."

**`2205-07193v2` — `injuries/2205-07193v2-division-pair-hfa-causal.ts` — NOT EVALUATED.** (a) Tests
a division-pair paired-differences estimator of home-field advantage, on significance, variance
sanity, and holdout sign persistence. (b) Needs 6 paired differences per team-season from division
games only (2018-2025), a 2020-2022 fit and a 2023-2024 holdout, and a naive mean-difference
comparison. (c) Pass = "Adopt iff on the 2020-2022 fit: (a) league offensive-EPA Delta-hat > 0 with
p < 0.05, (b) unbiased variance sigma-hat^2 >= 0 (sanity), (c) the sign of offensive-EPA Delta-hat
persists on the 2023-2024 holdout (p < 0.10)." Fail = "reject if Delta-hat is indistinguishable from
the naive mean difference."

**`2305-14612` — `injuries/2305-14612-acl-risk-video-scoring.ts` — NOT EVALUATED.** (a) Tests
automated landing/cutting-mechanics video scoring on agreement with manual scoring, on noise
robustness, and on group separation. (b) Needs Combine drill video, RTMPose per frame, the 5-feature
extraction, and prospect lower-body injury labels (first-2-season IR) across 3+ draft classes. (c) Pass
= "Gate (numeric): ADAPT if the replication achieves automated-vs-manual ICC >= 0.75 on the composite
score." Fail = "REJECT if ICC < 0.6 (2D pose noise swamps the clinical signal) or if the
AHP-weighted composite fails to separate known groups (p > 0.05 for any pair)."

### inplay

**`2103-04647` — `inplay/2103-04647-marked-point-process-live.ts` — NOT EVALUATED.** (a) Tests three
separate things: MCMC fit quality, predictive gain over a FOMC baseline, and whether the learned
per-event-type ability rankings correlate with independent season performance. (b) Needs one full NFL
week of nflverse PBP (~14-16 games) mapped to the composite-mark schema, the following week's games
held out, and an independent season-performance measure such as offensive EPA rankings. (c) Pass =
"Test A (fit): all R-hat < 1.1 and effective sample sizes > 400 for ability parameters (the paper's
Section 6.1 bar). Test B (predictive gain): hold out the following week's games; lpd^c must beat the
FOMC baseline by >= 1.0 per 1,000 events. Test C: per-event-type team-ability rankings correlate
(Spearman rho >= 0.5) with independent season performance measures." Fail = "If the lpd^c gap vs
FOMC is < 0.5 per 1,000 events, the NFL event stream carries no Hawkes-like excitation worth the
complexity -> REJECT."

### invention

The `invention` family headers use a `//`-comment / "Improvement (record)" format. All seven state a
gate and **none carries a `Gate status:` line**. Each also names the harness that must run the gate
rather than the module itself.

**`1905-11481v2` — `invention/1905-11481v2-ai-feynman-separability.ts`.** (a) Tests whether an
AI-Feynman-lite separability front end to PySR yields a better equation than flat PySR search at
similar complexity. (b) Needs the 2024-2025 dataset and a PySR backend; the header states the gate
"requires the 2024-2025 dataset + a PySR backend; run via the lab harness, not from this module." (c)
Pass = "ADOPT the separability front-end if it yields >=5% held-out RMSE improvement over flat PySR
on the 2024-2025 test window with no more than 20% more total nodes." Fail = "REJECT if separability
never fires or the recombined equation underperforms flat search."

**`1912-04871v4` — `invention/1912-04871v4-risk-seeking-symreg.ts`.** (a) Tests whether a risk-seeking
RL post-pass over PySR's hall-of-fame finds better expressions than PySR alone under a constraint
mask. (b) Needs 2024-2025 data plus PySR, with a hard constraint mask (forbid >1 nested trig,
single-input expressions, >15 nodes). (c) Pass = "ADOPT the risk-seeking post-pass if its best <=15-node
expression beats the best PySR-only <=15-node expression by >=0.03 test r on 2024-2025, with the
constraint mask preventing degenerate solutions." Fail = "REJECT if the RL loop collapses to PySR's
own hall-of-fame or underperforms."

**`2409-00629v2` — `invention/2409-00629v2-dualmargin-bandit-experiment.ts`.** (a) Tests a
pre-registered dual-margin revenue experiment (and, separately, whether CATE-based arm assignment
replicates live). (b) Needs live experiment traffic and the promo experiment harness; the header
states the gate "requires live experiment traffic; run via the promo experiment harness." (c) Pass =
"ADAPT the experiment design if: a pre-registered dual-margin experiment shows >=5%
revenue-per-visitor lift with conversion decline <1 pp over >=4 weeks." Fail = "REJECT the CATE-assignment
half if offline uplift estimates cannot be replicated in a live A/B -- ship only the best uniform
arm."

**`2410-17238v1` — `invention/2410-17238v1-sela-mcts.ts`.** (a) Tests whether SELA-style MCTS over
signal families improves discovery efficiency and wasted-rollout rate over round-robin at equal
budget, and whether its value estimates are meaningful. (b) Needs the nightly backtest budget and the
discovery harness. (c) Pass = "ADOPT if: MCTS arm finds >=1.5x the gate-passing signals of round-robin
at equal budget, wasted rollouts drop by >=30%, and the tree's value estimates correlate (Spearman >=
0.5) with final holdout scores." Fail = "REJECT if MCTS ~= round-robin within 20%."

**`2508-01285v2` — `invention/2508-01285v2-biodisco-critic-stage.ts`.** (a) Tests a pre-execution
evidence + critic stage (dual-mode grounding plus novelty/verifiability scoring) against arm A, on
compute efficiency, known-edge recovery, and rating stability. (b) Needs the nightly discovery budget
and a known-edge list, evaluated via the harness. (c) Pass = "ADOPT if arm B's gate-pass rate >= arm
A's while using <=60% of the backtest compute, the temporal-rediscovery check recovers >=2/3 known
edges, and Bradley-Terry ratings rank-order signals consistently after 4 weeks." Fail = any clause
unmet.

**`2606-29823v1` — `invention/2606-29823v1-experience-graph.ts`.** (a) Tests the experience graph as
the discovery loop's substrate, on query latency, crash recovery, replay fidelity, and storage growth.
(b) Needs the nightly discovery loop run through the harness; the header notes the module ships an
in-memory graph with JSON export/import and that the gate is persistence-agnostic. (c) Pass = "ADOPT
as the loop's substrate if: analyst query-time test passes (<2 min), crash recovery <5 min with zero
duplicate backtests over 3 induced crashes, replay fidelity 5/5, and storage stays <10 GB after 30
nights." Fail = any clause unmet (slow queries, duplicate backtests after a crash, replay fidelity
below 5/5, or storage over 10 GB).

**`2608-25770v2` — `invention/2608-25770v2-hypoforge-split.ts`.** (a) Tests whether batch-level
feedback (arm B) beats per-hypothesis feedback (arm A), whether a testing playbook accumulates real
skills, and whether transfer holds. (b) Needs 4 weeks of discovery-loop runs, evaluated via the
harness. (c) Pass = "ADOPT if: arm B's batch hit-rate >= 2x arm A's per-hypothesis rate, the testing
playbook accumulates >=5 distinct non-duplicate skills in 4 weeks that each prevent a repeated failure
mode at least once, and transfer holds (fresh-hypothesis first-batch quality improves >=20%)." Fail
= "REJECT if batch feedback ~= per-hypothesis feedback or the playbook fills with tautologies."

### markets

**`1106-4509` — `markets/1106-4509-ml-market-pooling.ts` — NOT EVALUATED.** (a) Tests whether a
fittable mixture<->product pooling family with self-tuning wealth-weighted experts beats GSE's
current combination. (b) Needs a 2025 holdout, one interpolation parameter per market type, and
cross-fold stability of the fitted parameter. (c) Pass = "ADAPT is confirmed if the fitted
mixture<->product interpolation beats GSE's current combination by >=1.5% log-loss on the 2025 holdout
with the fitted parameter stable across folds (std < 0.15)." Fail = under 1.5% log-loss gain, or
fitted-parameter std >= 0.15.

**`1310-6998v1` — `markets/1310-6998v1-twitter-volume-momentum.ts` — NOT EVALUATED.** (a) Tests
social post-volume momentum as a totals-model feature, and a beat-writer injury-sentiment family on
top of volume alone, against the 53% WTS bar. (b) Needs per-team weekly X/Twitter volume with
hyperparameters fixed on 2023-2024 and evaluated locked on 2025, plus beat-writer sentiment, all
reported with confidence intervals. (c) Pass = "Adopt tweet-volume momentum as a totals-model feature
if the locked 2025 online test shows >=3pp O/U accuracy gain over the stats baseline with CI excluding
zero; adopt the injury-news sentiment lane only if a beat-writer sentiment feature adds >=2pp WTS
accuracy over volume alone." Fail = either feature misses its bar; "reject the unigram/CCA pipeline
entirely."

**`1802-08848v1` — `markets/1802-08848v1-odds-history-fusion.ts` — gate stated, no status line.**
(a) Tests fusing history-only and odds-implied win probabilities via a learned convex combination,
with an explicit honesty rule about the mixture weight. (b) Needs a 2023-2025 holdout, de-vigged
spread/total markets inverted through a margin Skellam, and a Beta-prior mixture weight. (c) Pass =
"Adopt the odds fusion level only if the 2023-2025 holdout shows the fused model beats both the
history-only and odds-only baselines on moneyline log-loss by >=0.005 with 95% posterior CI excluding
zero." Fail = "reject if the mixture weight collapses to p~0 (pure market model)." The header's
honesty rule makes that collapse a *statement to publish* ("the market already prices everything the
history model knows") rather than a silent failure.

**`1910-08858v2` — `markets/1910-08858v2-spread-win-probability-table.ts` — NOT EVALUATED.** (a) Tests
an empirical P(Win|PS) mapping by half-point bucket on calibration, and a walk-forward +EV screen on
ROI at achievable lines. (b) Needs The Odds API data plus GSE's backtest archive, a locked 2022-2025
holdout, achievable lines defined as second-best consensus (not panel max), and fractional-Kelly
sizing. (c) Pass = "Adopt the empirical P(Win|PS) mapping as a GSE odds-lane feature if the locked
2022-2025 holdout shows calibration error (ECE) <= 2pp on the spread->win-rate table; adopt the full
+EV screen as a signal only if holdout ROI is positive with a 95% CI excluding 0 at achievable lines
(second-best consensus, not panel max)." Fail = either clause unmet. The header frames this as "an
engine-honesty screen, never a profit objective."

**`2003-09384v2` — `markets/2003-09384v2-static-theta-threshold-policy.ts` — NOT EVALUATED.**
(a) Tests whether a single profit-maximizing static edge threshold is preferable to the current
threshold policy, and separately quantifies line-shopping uplift. (b) Needs a 2015-2024 NFL backtest
evaluated on total realized profit (not per-week ROI) at comparable bet counts, plus per-season
optimal thresholds. (c) Pass = "Adopt the profit-maximizing static-theta threshold policy if, on the
2015-2024 NFL backtest: (i) some static theta yields total profit >= 20% above the current GSE
threshold policy's total profit at comparable bet counts, AND (ii) per-season-optimal theta is
unstable (optimal theta differs by >= 5 pp across >= 3 of the 10 seasons)." Fail = either clause
unmet. The header frames this as "threshold discipline as engine-honesty infrastructure, never a
profit target."

**`2010-12508v1` — `markets/2010-12508v1-decorrelation-penalty-loss.ts` — NOT EVALUATED.** (a) Tests
a decorrelation penalty in win-probability training, with a hard regime precondition and a
monotonicity check. (b) Needs a 2020-2024 chronological test, a gamma grid in {0.1, ..., 1.0}, a
with/without market-odds feature audit, and identical-sharpe staking for the ROI comparison. (c) Pass
= "Adopt the decorrelation loss (gamma > 0) if, on the 2020-2024 chronological test: (i) some gamma
in {0.2, 0.4, 0.6} yields total ROI >= 2 percentage points above the gamma = 0 model under identical
sharpe staking, AND (ii) the gamma = 0 model does not already beat market consensus on XENT, AND
(iii) model-market correlation decreases monotonically in gamma." Fail = "Reject (keep pure-accuracy
training) if no gamma beats gamma = 0 by >= 2pp ROI or the model is already XENT-superior."

**`2106-05799v1` — `markets/2106-05799v1-hybrid-ability-xgboost.ts` — NOT EVALUATED.** (a) Tests a
hybrid architecture (three ability estimators plus covariates into XGBoost, with a copula-coupled
score model) on moneyline log-loss. (b) Needs 8 seasons of time-decayed Bradley-Terry/Elo, 100k season
simulations inverting Super Bowl futures, EPA plus-minus ratings, and a 2015-2024
leave-one-season-out test. (c) Pass = "Adopt the hybrid architecture if, on the 2015-2024
leave-one-season-out test, the hybrid model's mean moneyline log-loss beats both the market-consensus
baseline and the plain-covariate XGBoost by >= 0.005 (absolute), with the improvement present in >= 7
of the 10 held-out seasons." Fail = under 0.005 absolute, or present in fewer than 7 seasons.

**`2107-08827v1` — `markets/2107-08827v1-fractional-kelly-sizing.ts` — NOT EVALUATED.** (a) Tests
fractional/drawdown-constrained Kelly as the sizing protocol on ruin rate, median wealth, and
performance against fixed half-Kelly. (b) Needs a 2024-2025 NFL backtest, an omega grid in [0,1] with
selection at <=5% of trajectories drawing below 90%, a flat-betting baseline, and a fixed
omega=0.5 comparison. (c) Pass = "Adopt fractional/drawdown-Kelly as the GSE sizing protocol iff on
the 2024-2025 NFL backtest the tuned-fraction Kelly (or KellyDrawdown) achieves (a) ruin% <= 1%, (b)
median final wealth >= 110% of the flat-betting baseline's median, and (c) beats fixed half-Kelly
(omega=0.5) on median wealth." Fail = any clause unmet. The header frames this as "engine-honesty
infrastructure for sustainable staking, not a profit objective."

**`2112-13001v3` — `markets/2112-13001v3-dcp-prop-framework.ts` — NOT EVALUATED.** (a) Tests a
Bayesian DCP prop framework (geometric-Poisson or NB team count props) against naive Poisson, on
elpd_loo and on betting simulation. (b) Needs de-vigged moneyline/spread/total odds per game, a
bivariate normal fit via L-BFGS-B for implied total and supremacy, 2024 rushing-attempt counts, and a
positive-EV simulation over >=100 bets. (c) Pass = "ADOPT the DCP prop framework iff the
geometric-Poisson/NB model beats naive Poisson by elpd_loo with se_diff >= 3 on 2024 rushing-attempt
counts AND the positive-EV simulation shows Sharpe >= 1.0 over >=100 bets." Fail = "REJECT as a
framework if the Poisson is within se_diff < 1 with a flat/negative betting sim."

**`2401-06086v1` — `markets/2401-06086v1-imitation-inplay-betting.ts` — NOT EVALUATED.** (a) Tests
an imitation-learning loop for in-play back/lay decisions against every scripted baseline. (b) Needs
a GSE in-play simulator or recorded NFL live-odds + win-probability traces, the scripted policies
(always-back-closing-favorite, momentum-chaser, Kelly-on-live-model-edge), and a 2025 holdout. (c)
Pass = "ADOPT the imitation-learning loop for GSE's in-play lane only if the learned policy beats every
scripted baseline on 2025 holdout profit with p < 0.05 (Wilcoxon, as in the paper)." Fail = "if it
merely matches the best baseline, keep the scripted policies and the recorded live-odds dataset as
the asset; reject the 'learner beats teachers' claim as a simulator artifact."

### metalearning

**`1703-03400v3` — `metalearning/1703-03400v3-maml-rookie-adapter.ts` — NOT EVALUATED.** (a) Tests
MAML as the rookie-QB / new-regime adapter against pretrain+fine-tune, including the paper's
no-overfit behavior across inner steps. (b) Needs 2023-2025 new-regime tasks with support = first K
games (K in {2,4}) and query = remaining games, evaluated on win prediction. (c) Pass = "ADOPT iff
MAML beats pretrain+fine-tune by >=0.02 Brier on new-regime win prediction at K in {2,4} (2023-2025)
AND shows the paper's no-overfit behavior (performance non-decreasing over 1->5 inner steps)." Fail =
under 0.02 Brier, or performance degrading over inner steps.

**`1807-08912v2` — `metalearning/1807-08912v2-alpaca-online-regression.ts` — gate stated, no status
line.** (a) Tests ALPaCA's analytic recursive online Bayesian updates against MAML-style adaptation
and a static prior, including early-week behavior. (b) Needs offline meta-training over historical
seasons sliced as function families, 2023-2024 evaluation, and per-week NLL from week 1 to week 8.
(c) Pass = "ADOPT iff ALPaCA's week-1-to-8 NLL on margin beats BOTH MAML-style adaptation and the
static prior by >=0.05 nats/game averaged over 2023-2024, with near-monotonic improvement (no
MAML-style early overfit dips)." Fail = "Reject if the recursive updates show no advantage over plain
refit at week <=4."

**`1901-09890v1` — `metalearning/1901-09890v1-meta-metric-librarian.ts` — gate stated, no status
line.** (a) Tests a retrieval-plus-meta-metric-learner regime librarian against a plain Matching
Network, and isolates the retrieval's own contribution via a random-auxiliary ablation. (b) Needs
2023-2025 test regimes with K in {2,4} observed games and a fallback-to-league-average prior path.
(c) Pass = "ADOPT iff the retrieval+meta-metric-learner beats plain Matching Network by >=3pp accuracy
on new-regime win prediction at K in {2,4} (2023-2025 test regimes), AND the random-auxiliary
ablation shows no gain (proving retrieval, not just extra data, drives it)." Fail = under 3pp, or the
ablation shows a gain (meaning retrieval is not the driver).

**`2006-06707v2` — `metalearning/2006-06707v2-metavrf-kernel-learning.ts` — NOT EVALUATED.** (a)
Tests MetaVRF as a few-shot regime model on new-regime prediction and against fixed-bandwidth
RBF-KRR, plus whether the LSTM league context earns its place. (b) Needs nflverse team-game stats,
2023-2025 leave-one-season-out evaluation on the first-4-game predictions, and an ablation without
the LSTM. (c) Pass = "ADOPT iff MetaVRF beats the league-average prior by >=0.01 Brier on new-regime
first-4-game predictions (2023-2025 LOSO) AND beats fixed-bandwidth RBF-KRR by >=0.005 Brier." Fail =
"Reject if the LSTM context adds nothing over MetaVRF w/o LSTM" (or if the Brier bars are missed).

**`2009-03228v3` — `metalearning/2009-03228v3-gp-vib-meta-learning.ts` — NOT EVALUATED.** (a) Tests
a deep-kernel GP-VIB new-regime model on Brier and on whether the KL anti-memorization term helps.
(b) Needs nflverse 2015-2025, 2023-2025 leave-one-season-out evaluation, beta tuned in
{0.01, 0.1, 1.0}, and a beta=0 ablation with a paired t-test. (c) Pass = "ADOPT iff GP-VIB (beta
tuned) beats the league-average prior by >=0.01 Brier on new-regime first-4-game predictions
(2023-2025 LOSO) AND the beta>0 model beats the beta=0 ablation on NLL by a statistically clear
margin (paired t-test p<0.05)." Fail = either clause unmet.

**`2208-08135v1` — `metalearning/2208-08135v1-uncertainty-weighted-metalearning.ts` — NOT
EVALUATED.** (a) Tests uncertainty-weighted meta-learning (learned per-season sigma, then
input-dependent sigma) against vanilla MAML, plus robustness across alpha values and whether
init-selection actually helps. (b) Needs 2015-2025 team-seasons, 2023-2025 evaluation at K in {2,4},
and a comparison of loss spread across alpha values. (c) Pass = "ADOPT iff the homoscedastic variant
beats vanilla MAML by >=0.02 Brier on new-regime win prediction at K in {2,4} (2023-2025) AND shows
the paper's robustness (loss spread across alpha values <= half of MAML's spread)." Fail = "reject if
init-selection picks checkpoints no better than the global init at K=4" (or if the Brier bar is
missed).

### nlp

**`2010-00526v1` — `nlp/2010-00526v1-liveqa-nfl-benchmark.ts` — NOT EVALUATED.** (a) Tests whether
the auto-generated LiveQA-NFL benchmark is human-answerable, i.e. whether the benchmark itself is
valid before any pipeline is scored on it. (b) Needs 2024 NFL games with play-by-play + drive text
from nflverse, auto-generated questions in the four types (comparison/calculation/inference/tracking)
with evidence-location labels, and a 200-question human pilot. (c) Pass = "ADOPT as the standard GSE
timeline-QA benchmark if a 200-question pilot shows the four question types are answerable by humans
at >=90% (validating question quality)." Fail = "REJECT if auto-generated questions are noisy (human
accuracy <80%)."

**`2211-04534v1` — `nlp/2211-04534v1-goal-nfl-retrieval.ts` — NOT EVALUATED.** (a) Tests the
retrieval grounding task against the paper's own number, and rejects generation outright. (b) Needs
NFL highlight clips paired with broadcast commentary transcripts, CLIP-style video-text encoders, and
GOAL-NFL pilot data. (c) Pass = "ADAPT the retrieval task into the clip-search product iff a
CLIP-style modern baseline beats the paper's R@1 by >=5 points on GOAL-NFL pilot data." Fail = "REJECT
the generation task entirely" (stated unconditionally) or under 5 points on retrieval.

**`2401-01505v5` — `nlp/2401-01505v5-afa-tracking-qa.ts` — NOT EVALUATED.** (a) Tests AFA-style
multi-focal attention with a play-context encoder against standard attention on play-outcome
classification. (b) Needs NGS tracking sequences and a 2024 holdout with accuracy and macro-F1. (c)
Pass = "Adopt if AFA beats standard attention by >=1.5pp accuracy AND >=1.0pp macro-F1 on the 2024
holdout." Fail = "reject otherwise (the paper's own margin is ~1.2pp - demand at least parity with
that on football data)."

### props-dfs

**`1505-01147v2` — `props-dfs/1505-01147v2-local-matrix-completion.ts` — NOT EVALUATED.** (a) Tests
local matrix completion (rank 2-3) against EM imputation for missing player-weeks, and separately
whether the SVD specialization embedding adds signal to the prop model. (b) Needs player x
stat-category (or player x week) matrices from nflverse, a 2024-2025 holdout, a Wilcoxon test, and
the existing prop feature set. (c) Pass = "ADOPT LMC imputation for the prop pipeline iff LMC rank 2
or 3 beats EM imputation by >= 5% relative RMSE with Wilcoxon p < 0.01 on the 2024-2025 holdout; also
require rank-3 SVD specialization embedding to add >= 0.005 OOS R^2 when appended to the existing
prop feature set." Fail = either clause unmet.

**`1909-12938v1` — `props-dfs/1909-12938v1-ts-forecast-dfs-optimizer.ts` — NOT EVALUATED.** (a) Tests
a per-player weekly time-series forecast stage feeding the ILP/MILP lineup optimizer against
trailing-average forecasts. (b) Needs a rolling-origin backtest over 2022-2024 slates with opponent /
situational features and a probabilistic availability model. (c) Pass = "ADOPT the TS-forecast stage
only if lineups built on TS forecasts beat lineups built on trailing-average forecasts by >=5%
realized points on 2022-2024 rolling slates." Fail = under 5% realized-points gain.

**`1912-10417v1` — `props-dfs/1912-10417v1-regime-switching-synergy-network.ts` — NOT EVALUATED.**
(a) Tests two things: that the 2-state hot/cold regimes are real rather than k artifacts, and that
the resulting synergy network replicates out-of-sample. (b) Needs per-drive smoothed
fantasy-points-above-expectation, on-field co-presence dummies (WR2 in route tree, backup RB on 3rd
down), and an out-of-sample replication set. (c) Pass = "ADAPT if Test 1 passes (regimes are real,
not k-artifacts) AND Test 2 passes (synergies replicate out-of-sample with >=+1.5 pts/game and
p<0.05)." Fail = "REJECT if regimes are degenerate or synergies don't replicate."

**`2003-01712v1` — `props-dfs/2003-01712v1-joi-stack-metric.ts` — NOT EVALUATED.** (a) Tests the
JOI/dropback stack metric on two fronts: predicting unseen pairs' JOI, and using it for DFS stacks.
(b) Needs per QB-pass-catcher pair EPA over consecutive-play sequences plus drive-level
co-production, a gradient-boosting predictor on pair features, and a DFS backtest. (c) Pass = "ADOPT
the JOI stack metric iff (a) predicted JOI achieves Spearman rho >= 0.40 vs actual next-season
JOI/dropback on unseen pairs, AND (b) top-decile-JOI stacks outscore baseline stacks by >= 5% in the
DFS backtest (paired t, p < 0.05)." Fail = either clause unmet.

**`2004-08428v1` — `props-dfs/2004-08428v1-era-adjusted-features.ts` — NOT EVALUATED.** (a) Tests
whether era-adjusted (renormalized) player features are stationary, and whether the deflator actually
collapses era-separated distributions. (b) Needs per-opportunity prowess metrics normalized against
league-average-by-season, a Dickey-Fuller test on every candidate feature's league-average series,
and era-separated PDFs. (c) Pass = "DF p < 0.05 on renormalized NFL feature series plus
visual/PDF collapse across eras." Fail = any candidate feature failing the DF test, or no
distribution collapse across eras.

**`2005-07742` — `props-dfs/2005-07742-seam-matchup-shrinkage.ts` — NOT EVALUATED.** (a) Tests
SEAM-style sparse-matchup shrinkage (three-way KDE blend) as GSE's matchup-adjustment standard, on
conditional coverage. (b) Needs one MLB season, matchups with >= 10 holdout balls in play,
batter-only and pitcher-only baselines, and the unit-test asymptotic checks (w_1 -> 1 as n_direct ->
large, w_1 -> 0 as n_direct -> 0). (c) Pass = "Replicate on one MLB season: SEAM-style convex blend
beats batter-only and pitcher-only on 0.90-nominal conditional coverage for matchups with >= 10
holdout balls in play." Fail = no coverage improvement over the one-sided baselines. The header
separately defines improvement success: "0.90-nominal conditional coverage >= 0.80 with calibration
error not worse than the paper's."

**`2006-07513` — `props-dfs/2006-07513-bayesian-shot-archetypes.ts` — NOT EVALUATED.** (a) Tests
LGCP+MFM Bayesian group learning as a probabilistic player-archetype prior on archetype recovery and
on a downstream prop task. (b) Needs a simulation with a known ground-truth archetype count, and a
real-data concordance check plus a held-out 3P-attempt-rate prediction task. (c) Pass = "Simulation
Rand 0.9988 vs best baseline 0.9005 (K-means), 42/50 correct-K recovery, real-data concordance
0.948; improvement success = concordance RI >= 0.95 maintained AND archetype assignments improve a
downstream 3P-attempt-rate prediction task (held-out RMSE)." Fail = any clause unmet.

**`2009-01206v1` — `props-dfs/2009-01206v1-chalk-meter-contrarian.ts` — NOT EVALUATED.** (a) Tests a
per-slate chalk index plus a contrarian tilt, on ROI at high template concentration, and checks for
collateral damage at low concentration. (b) Needs a 2023-2025 backtest, projected-ownership-weighted
lineup fields, a player co-occurrence matrix with hierarchical clustering, and slate-paired ROI with
a significance test. (c) Pass = "ADOPT the chalk-meter + contrarian tilt iff, on 2023-2025 backtest,
template-fading lineups achieve >=10% higher ROI than template-following lineups on
top-quartile-concentration slates (paired by slate, p<0.05), with no significant ROI loss on
bottom-quartile slates." Fail = under 10% ROI lift, or significant ROI loss on bottom-quartile
slates.

**`2112-07002` — `props-dfs/2112-07002-emax-duel-optimizer.ts` — NOT EVALUATED.** (a) Tests an
exact E[max] duel optimizer for 2-entry Showdown on realized best-entry score and simulated E[max],
with a Gaussian-assumption stress check. (b) Needs 2024 Showdown backtests across >=20 contests, GSE
projections/variances/game-script stacking correlations, a cutting-plane/MINLP solve, and a
20-entry SAA benchmark. (c) Pass = "Adopt iff on 2024 Showdown backtests the exact 2-entry method's
realized best-entry score beats the top-2-EV baseline by >=2.0 points on average across >=20 contests
AND simulated E[max] improvement is >=4.0 points." Fail = "reject if the Gaussian assumption
systematically misses high-variance captain plays" (or if either numeric bar is missed).

**`2212-11041v1` — `props-dfs/2212-11041v1-future-value-models.ts` — NOT EVALUATED.** (a) Tests
per-position log-value models against pooled and naive baselines on time-ordered validation, and
separately rejects crowd-style valuations as a target. (b) Needs per-snap/per-route normalized nflverse
plus FTN charting stats, a team-strength anchor, rolling-origin time splits with 5-fold within each
origin, and 4 skill positions. (c) Pass = "ADAPT the recipe iff per-position log-value models beat
pooled + naive baselines on the §12 gate (per-position R2 >=3 points above pooled on >=3 of 4 skill
positions AND beat the current-salary naive) with time-ordered validation." Fail = "REJECT any claim
that crowd-style valuations are the right target -- use realized fantasy points/salaries, not crowd
valuations."

**`2302-13386` — `props-dfs/2302-13386-player2vec-embeddings.ts` — NOT EVALUATED.** (a) Tests a
learned player/lineup representation layer on held-out KL, role recovery, and matchup-ordering
sanity. (b) Needs play-by-play with 10 on-court players per play and a discrete outcome taxonomy
(~20 classes), held-out playoff games, and a 25-game validation protocol. (c) Pass = "Gate (ADAPT): the
embedding-plus-MLP predicts play-outcome distributions with mean KL ~= 0.3 on held-out playoff games,
embeddings recover known roles, and the matchup optimizer produces sensible orderings; adopt as ADAPT
(weakened only by missing baselines); improvement success = held-out KL <= 0.25 (>= ~17% relative
improvement) with the same 25-game validation protocol." Fail = held-out KL far above 0.3, or
embeddings failing to recover known roles, or nonsensical matchup orderings.

**`2303-04963v1` — `props-dfs/2303-04963v1-elite-lineup-order-stats.ts` — NOT EVALUATED.** (a) Tests
an order-statistic elite-lineup identification technique and a unanimous-consent high-precision
filter, in two staged steps. (b) Needs one NBA season of public data to reproduce the paper's
precision/prevalence comparison, then one NFL DFS slate for the optimizer ROI comparison. (c) Pass =
"ADAPT: ... first reproduce the paper's 86.7%-level test precision vs the 62.1% prevalence baseline on
one NBA season of public data, then confirm optimizer ROI improvement with vs without unanimity
filtering on one NFL DFS slate." Fail = failing either the NBA precision reproduction or the NFL ROI
confirmation.

**`2407-13438` — `props-dfs/2407-13438-ems-gpp-portfolio.ts` — NOT EVALUATED.** (a) Tests replacing
150x-max-EV GPP construction with an expected-maximum-score portfolio optimizer (SAA/PROP+ plus
field-aware EMS), on simulated EMS, realized finish percentile, and solve time. (b) Needs 2024
backtests across >=10 slates, a 150x-max-EV baseline, and a solve-time budget. (c) Pass = "Adopt the
EMS portfolio optimizer if on 2024 backtests the G-SAA or PROP+ 150-entry portfolio beats the
150x-max-EV baseline on simulated EMS by >=5.0 points AND on realized best-entry finish percentile by
>=5 percentile points across >=10 slates." Fail = "reject if the SAA MILP doesn't solve within 30
minutes per slate" (or if either numeric bar is missed).

**`2407-17832` — `props-dfs/2407-17832-group-lasso-plus-minus.ts` — NOT EVALUATED.** (a) Tests
group-lasso plus-minus drive-level ratings with expected-points value targets against a ridge
baseline and an Elo-only baseline. (b) Needs one NFL season of drive data, a train-ratings-then-
predict-games validity protocol, and paired t-tests. (c) Pass = "Rebuild on one NFL season of drive
data: require group lasso >= ridge on Brier score for held-out games, and both significantly better
than an ELO-only baseline at 10% (paired t-test)." Fail = group lasso below ridge on Brier, or
neither beating Elo-only at 10%. The header separately defines improvement success: "Brier-score
improvement >= 5% over the goal-indicator version."

### rl

**`1707-06887v1` — `rl/1707-06887v1-distributional-slate-rl.ts` — NOT EVALUATED.** (a) Tests a
distributional-critic (C51-style) staking policy against fractional-Kelly on ROI and drawdown. (b)
Needs offline training on logged GSE picks plus odds API market prices (2019-2026), a 2024 holdout,
and drawdown tracking against the Kelly baseline. (c) Pass = "ADOPT for the staking module iff on the
2024 holdout the distributional policy beats fractional-Kelly ROI by >=2pp AND max drawdown is no worse
than the Kelly baseline (within 0.5u)." Fail = under 2pp ROI, or drawdown worse by more than 0.5u.

**`1806-06923v2` — `rl/1806-06923v2-iqn-critic.ts` — gate stated, no status line.** (a) Tests an
IQN quantile critic (removing the fixed [V_min,V_max] support problem) with a CVaR(0.25) decision
rule, on drawdown, ROI, and quantile calibration. (b) Needs the offline weekly slate dataset (states,
discrete stake actions, settled unit-profit rewards), N=N'=32 sampled tau pairs per minibatch with
quantile Huber loss (kappa=1), and a CQL penalty. (c) Pass = "ADOPT iff the CVaR(0.25)-policy beats
the mean-policy (scalar CQL) on 2024 max drawdown by >=1.0u with ROI no worse than -1pp vs the mean
policy, AND quantile calibration ECE <= 0.05." Fail = "if calibration fails, REJECT the critic but
keep the distortion-rule idea for the 1922 C51 head" (or the drawdown/ROI bars are missed).

**`1902-08102v2` — `rl/1902-08102v2-expectile-critic.ts` — gate stated, no status line.** (a) Tests
an ER-DQN expectile head as the default critic against three quantile heads, on mean-consistency error
and greedy-policy ROI. (b) Needs a 2024 evaluation, a mean-consistency error diagnostic (flagging
actions where implied vs Monte-Carlo realized mean weekly P&L per stake differ by >0.5u), and a
greedy stake policy. (c) Pass = "ADOPT the expectile head as the default critic iff on 2024 its
mean-consistency error is the lowest of the four AND its greedy policy ROI is within 1pp of the best
quantile head." Fail = "if a quantile head dominates on both, REJECT expectiles but KEEP the
mean-consistency diagnostic as a permanent gate for all future critic changes."

**`2006-04779v2` — `rl/2006-04779v2-cql-stake-policy.ts` — NOT EVALUATED.** (a) Tests a
conservative Q-learning stake policy against fractional-Kelly on ROI and drawdown, plus an empirical
lower-bound safety diagnostic. (b) Needs offline training on GSE's historical slate data, a 2024
holdout, a per-week max-exposure cap, and week-by-week predicted-vs-realized return comparison. (c)
Pass = "ADOPT iff on 2024 holdout the CQL policy beats the fractional-Kelly baseline by >=2pp ROI
with max drawdown no worse than baseline (within 0.5u) AND the empirical lower-bound diagnostic holds
(predicted value <= realized return on >=90% of weeks)." Fail = "if the lower-bound diagnostic fails,
REJECT (the safety property is the whole point)" (or the ROI/drawdown bars are missed).

**`2105-08877v2` — `rl/2105-08877v2-c51-optimal-stopping.ts` — NOT EVALUATED.** (a) Tests
bet-timing as optimal stopping (a C51 stopping agent, plus a distributional variant minimizing CVaR
of CLV regret). (b) Needs 2021-2023 line-movement histories under the paper's three-stage protocol
(Valid_HP 2022, Valid_Model 2023 H1, strictly-future Test 2023 H2-2024) and a best-timing benchmark
plus a bet-at-open baseline. (c) Pass = "ADOPT iff on the strictly-future test window the C51 stopping
policy beats the best timing benchmark by >=1.5pp of CLV per bet with realized ROI no worse than the
'bet at open' baseline." Fail = "otherwise REJECT (timing alpha doesn't survive transaction
reality)."

**`2202-00769v1` — `rl/2202-00769v1-sinkhorn-drl-staking.ts` — NOT EVALUATED.** (a) Tests a
joint-distribution staking policy (3-dim return vector: profit, drawdown, CLV) against the best
scalar policy. (b) Needs logged picks/odds, N=32 critic samples, a tunable risk price, and a
meta-action risk price trained to end-of-season Sharpe. (c) Pass = "ADOPT iff on 2024 the joint
policy Pareto-dominates the best scalar policy on >=2 of {ROI, max drawdown, CLV} with the third no
worse than -5% relative." Fail = "otherwise REJECT (compute not justified for a scalar-equivalent
result)."

**`2203-03003v1` — `rl/2203-03003v1-offline-cql-staking.ts` — NOT EVALUATED.** (a) Tests an
offline-CQL staking policy on realized settlement ROI, a stake trust-region constraint, and
robustness to the choice of outcome model. (b) Needs training on 2021-2023 logged picks/odds, realized
2024 settlement, sensitivity re-scoring under 3 alternative outcome models, and a fractional-Kelly
baseline. (c) Pass = "ADOPT iff on realized 2024 settlement the CQL staking policy beats
fractional-Kelly ROI by >=2pp with stake MAPD <= 25% AND the sensitivity re-scoring keeps the sign of
the lift under all 3 outcome models." Fail = "REJECT if the lift vanishes under alternative
evaluators" (or the ROI / MAPD bars are missed).

### simulators

**`2306-00840v1` — `simulators/2306-00840v1-muzero-planning-audit.ts` — NOT EVALUATED.** (a) Tests
a planning-bounds harness for the play simulator: whether error grows with horizon and with play
novelty, and whether prior-constrained MCTS beats both history and a uniform prior. (b) Needs a
trained learned play simulator, game states sampled from the historical play-call distribution, a
down/distance/formation-conditioned empirical play-call prior, and 2024 held-out weeks. (c) Pass =
"ADOPT the prior-constrained planning design if: (a) simulator error grows monotonically with horizon
AND with play novelty, AND (b) league-prior-constrained MCTS backtests >= +0.05 EPA/play over the
historical policy on 2024 held-out weeks, AND (c) uniform-prior MCTS does not beat it." Fail =
"reject the planning use-case if the simulator's error on novel plays is flat or if prior-constrained
search cannot beat history."

### sizing

**`0803-1364v2` — `sizing/0803-1364v2-generalized-kelly-solver.ts` — NOT EVALUATED.** (a) Tests
two independent sizing mechanisms: a generalized multi-pick Kelly solver for decimal odds (with a
correlation haircut), and Laplace-smoothed posterior sizing. (b) Needs a 2024 walk-forward,
independent per-pick Kelly as the baseline, and an L_min gate on backtest N. (c) Pass = "ADAPT if on
the 2024 walk-forward (a) the generalized multi-pick Kelly solver beats independent per-pick Kelly on
log-growth AND has lower max drawdown, AND (b) Laplace-smoothed sizing (Eq. 16) beats raw-p-hat
Kelly on log-growth." Fail = either clause unmet.

### symreg

**`2006-10782v2` — `symreg/2006-10782v2-aifeynman-pareto-pruning.ts` — NOT EVALUATED.** (a) Tests
two portable ideas — hypothesis-testing candidate rejection and Pareto-frontier pruning after every
merge/generation step — on selection robustness under noise, plus a false-structure test. (b) Needs
nflverse team-game data (target points/drive, 8-12 features), clean and 5%-noise-corrupted training
data, and permuted targets for the negative control. (c) Pass = "ADOPT the Pareto-pruning +
hypothesis-testing rejection port if v2-style selection yields the same top-3 equation families on
clean and 5%-noise-corrupted training data (Jaccard >= 0.5 on skeleton sets) while v1-style threshold
selection diverges." Fail = "REJECT if the modularity detector fires on pure-noise features
(false-structure test: permuted targets must return only trivial fronts)."

**`2312-11955v1` — `symreg/2312-11955v1-vertical-symbolic-regression.ts` — NOT EVALUATED.** (a) Tests
vertical staging (growing feature subsets, each round seeded from the previous hall-of-fame) plus
regime-vertical SR against horizontal search on accuracy and simplicity. (b) Needs PySR runs over
growing feature subsets, regime splits (neutral-script, +trailing, +leading), and down/distance-bin
reduced forms. (c) Pass = "ADOPT vertical staging if VSR-PySR matches or beats horizontal test R^2
with <=50% of the expression length or <=50% of the compute time." Fail = "REJECT if horizontal wins
on both accuracy and simplicity - the oracle-free approximation does not transfer."

**`2401-00282v1` — `symreg/2401-00282v1-dgsr-lite-refinement.ts` — NOT EVALUATED.** (a) Tests
inference-time refinement (NGPQT-style or REINFORCE on NMSE) with a refinement curriculum, on held-out
RMSE at equal-or-fewer equation evaluations. (b) Needs synthetic sports-plausible equations
(d=4-8 variables) for pre-training, nflverse slices for inference, a 2024-2025 window, and Monte-Carlo
MAP search. (c) Pass = "ADOPT inference-time refinement if it improves held-out RMSE by >=8% over
no-refinement decoding at equal-or-fewer equation evaluations on the 2024-2025 window." Fail =
"REJECT if refinement gains vanish on noisy real data or merely recover the pre-training prior's
favorite shapes."

### team-ratings

**`1109-2825v2` — `team-ratings/1109-2825v2-scoring-random-walk.ts` — NOT EVALUATED.** (a) Tests
whether a lead-dependent scoring-rate restoring force is a real, novel term for GSE's live models. (b)
Needs nflverse play-by-play to estimate the antipersistence `q` and the restoring coefficient `b` via
P(next score | lead L) = 1/2 + a - bL. (c) Pass = "ADAPT if Test 1 passes -- a statistically
significant lead-dependent scoring rate (restoring coefficient b significantly != 0, p < 0.01,
expected sign) is a real, novel term for GSE's live models." Fail = b indistinguishable from zero at
p < 0.01, or the wrong sign.

**`1403-7642` — `team-ratings/1403-7642-college-ranking-sensitivity.ts` — NOT EVALUATED.** (a) Tests
a sensitivity-and-uncertainty apparatus (EBLUPs with 95% prediction intervals, sigma_t^2 as a
dial, a {PQL, LA, FE} x {probit, logit} x {FCS variants} protocol) on known rank reproductions and on
whether non-robust teams get flagged. (b) Needs consolidated-FCS college results, 2011 ranks for
PQL/FE, and a typical week's top-10. (c) Pass = "Gate (ADAPT stays ADAPT): Tests A and B pass (PQL
ranks Oklahoma St. #2, FE ranks Alabama #2 in 2011, with sigma_t^2 in expected bands) and Test C shows
the rank-range protocol flags >= 1 non-robust top-10 team in a typical week." Fail = any clause
unmet.

**`1609-01176v1` — `team-ratings/1609-01176v1-player-kernel-gp.ts` — NOT EVALUATED.** (a) Tests a
player-kernel GP team-strength overlay on two independent use cases: early-season cold start, and
backup-QB games. (b) Needs snap-share-weighted signed kernels, a time-decay kernel, GSE's current
team rating and Elo for the cold-start comparison, and the 2023-2024 backup-QB subset. (c) Pass =
"ADAPT if either Test 1 or Test 2 passes -- Test 1 (cold-start): player-kernel GP wins by >=0.02 mean
log-loss in weeks 1-4 of 2023/2024 vs GSE's current team rating and Elo; Test 2 (backup QBs):
log-loss >=0.03 better than team-rating baseline on the 2023-2024 backup-QB subset." Fail = neither
test clears its bar. (Either test alone is sufficient.)

**`2010-11187` — `team-ratings/2010-11187-g-elo-margin-model.ts` — NOT EVALUATED.** (a) Tests
G-Elo (7-category margin discretization, frequency-formula coefficients, K-tilde grid search) against
GSE's current Elo-Davidson-equivalent. (b) Needs the last 5 NFL seasons for coefficient estimation, a
2019-2023 walk-forward backtest, log-loss of implied ternary probabilities, and accuracy. (c) Pass =
"G-Elo must beat GSE's current Elo-Davidson-equivalent on the NFL 2019-2023 walk-forward backtest:
log-loss improvement Delta-LS >= 0.005 AND accuracy >= baseline + 1pp." Fail = "If it fails, keep the
frequency-based coefficient formulas as the calibration method for the existing Elo and drop the AC
update."

**`2207-12147v1` — `team-ratings/2207-12147v1-sparse-tvp-team-ratings.ts` — NOT EVALUATED.** (a)
Tests sparse time-varying-parameter team ratings on accuracy, on whether the model actually uses its
flexibility, and on weekly-refit reliability. (b) Needs nflverse 2015-2025 weekly data, a
triple-gamma or horseshoe prior, warm-started MCMC/Laplace weekly refits, and an Elo baseline over
rolling 2022-2024. (c) Pass = "ADOPT iff rolling 2022-2024 RMSE beats the Elo baseline by >=3% AND the
posterior classifies at least 20% of team coefficients as dynamic (the model actually uses its
flexibility)." Fail = "reject if classification collapses to all-fixed or MCMC makes weekly refits
unreliable" (or the 3% RMSE bar is missed).

### tracking

**`2012-11717v3` — `tracking/2012-11717v3-social-nce-trajectories.ts` — NOT EVALUATED.** (a) Tests
Social-NCE trajectory forecasting on physical plausibility (impossible-trajectory rate) at a small FDE
cost, plus a sanity check that the social prior rather than contrast alone drives the gain. (b) Needs
NFL 10Hz tracking with the ball-carrier as primary agent and 11 defenders plus nearby blockers as
neighbors, horizons delta-t in {1,...,4}, and a vanilla baseline. (c) Pass = "ADOPT if: (a)
impossible-trajectory rate reduced >= 25% vs vanilla with FDE no worse than +2%, AND (b) random
negatives do not beat Social-NCE (sanity check that the prior, not just contrast, drives the gain)."
Fail = "REJECT if (a) fails" (or if FDE degrades by more than 2%).

**`2305-02968v1` — `tracking/2305-02968v1-masked-trajectory-models.ts` — NOT EVALUATED.** (a) Tests
a masked trajectory model, on heteromodal masked-frame reconstruction and separately on whether its
frozen embeddings improve prop models. (b) Needs NFL 10Hz tracking 2018-2024 with optional charting
and odds modalities, missing-modality loss masking, and held-out weeks 13-18. (c) Pass = "ADOPT if:
(a) heteromodal MTM masked-frame RMSE >= 15% lower than the full-modality-only model on held-out
weeks, OR (b) prop-model log-loss improves >= 0.002 with MTM embeddings vs without, on held-out weeks
13-18." Fail = "REJECT if neither holds." Either arm is sufficient.

**`2407-20028v1` — `tracking/2407-20028v1-atscc-route-primitives.ts` — NOT EVALUATED.** (a) Tests
ATSCC-style segment contrastive coding for route-concept primitives, on cluster agreement with
charted concepts and on boundary detection. (b) Needs hierarchical RDP segmentation, cross-player
segment contrast, charted route concepts and break points, and held-out weeks with a TS2Vec baseline.
(c) Pass = "ADOPT if: (a) ATSCC-style segment embeddings achieve NMI >= 0.40 against charted route
concepts on held-out weeks (vs <= 0.30 for TS2Vec), AND (b) segment boundaries match charted break
points with F1 >= 0.50." Fail = either clause unmet.

### weather

**`2106-00175` — `weather/2106-00175-stacked-live-wp-bakeoff.ts` — NOT EVALUATED.** (a) Tests
whether a stacked ML live win-probability model (with the classical baseline WP as a feature) beats
the classical baseline on accuracy and log-loss, and resolves a stated tension via a three-way
bake-off. (b) Needs nflverse play-by-play state features, a closed-form football WP baseline (logistic
on time x score-diff or a monotone table), and holdout evaluation at every game-progression decile. (c)
Pass = "ADOPT the stacked ML live model if it beats the classical baseline by >= 1 pp accuracy AND >=
0.005 log-loss at every game decile on the holdout." Fail = "REJECT if the ML wins accuracy but loses
log-loss -- that reproduces the paper's limitation and is unusable for staking."

**`2109-09287` — `weather/2109-09287-stadium-factor-decomposition.ts` — NOT EVALUATED.** (a) Tests a
per-season stadium factor table, on log-loss, on structural sanity of neutral-event factors, and on
the stability of Denver's kicking/punting factor. (b) Needs nflverse team-game data with stadium
labels, penalized MLE with sum-to-zero identifiability constraints, year-to-year shrinkage, and a
2025 holdout. (c) Pass = "ADOPT the stadium-factor table if the full model beats both baselines by >=
0.003 log-loss on 2025 holdout AND neutral-event factors are ~= 0 (structural sanity) AND Denver's
kicking/punting factor is positive and stable across >= 3 seasons." Fail = any clause unmet.

### win-spread-total

**`1908-07372` — `win-spread-total/1908-07372-sde-inplay-win-probability.ts` — NOT EVALUATED.**
(a) Tests an SDE in-play model on Brier against a naive baseline and on log-loss against GSE's
current ML in-play model, with a partial fallback to the shock layer alone. (b) Needs 2010-2024
play-by-play to fit team-pair OU/Brownian parameters, a 2023-2024 in-play evaluation window, and a
5-minutes-post-turnover calibration check. (c) Pass = "Adopt the SDE in-play model if its 2023-2024
in-play Brier beats the naive score-and-time baseline by >=0.005 and matches or beats GSE's current
ML in-play model on log-loss." Fail = below 0.005 Brier gain, or worse log-loss than the ML model.
Partial adoption clause: "adopt only the shock-perturbation layer if the full model ties but the
turnover-shock response improves probability calibration in the 5 minutes after turnovers."

**`2008-13005` — `win-spread-total/2008-13005-budescu-chen-aggregation.ts` — NOT EVALUATED.**
(a) Tests Budescu-Chen source aggregation against simple averaging on Brier or against Variance-EM
in a truth-knower simulation, plus an assertiveness audit of the engine's published probabilities.
(b) Needs trailing-2-season leave-one-out gains, a 2024-2025 evaluation, a truth-knower simulation,
and published probabilities with their Brier scores. (c) Pass = "Adopt Budescu-Chen if it beats simple
averaging on 2024-2025 Brier by >=0.002 OR wins the truth-knower simulation more often than
Variance-EM." Fail = neither route clears its bar. The header states two unconditional clauses:
"adopt the evaluation-honesty rule regardless" (no 'model A beats model B' claim on < ~500 games
without a truth-knower simulation), and "reject the assertiveness recalibration if the engine's
assertiveness already sits at its Brier-optimal point."

**`2207-13191` — `win-spread-total/2207-13191-gcn-win-prediction.ts` — NOT EVALUATED.** (a) Tests a
calibrated GCN win-probability arm (and a directed-heterogeneous variant) on Brier and calibration
against the engine's current model and Elo. (b) Needs an NFL team-game graph built per Algorithm 1
(nodes = 32 teams x 17 games), delta features (offensive/defensive EPA, success rate, explosive-play
differentials), semi-supervised training on 2015-2024, and a 2023-2024 evaluation. (c) Pass = "Adopt
as a ratings/ensemble arm iff the calibrated GCN beats the engine's current win-probability model on
2023-2024 Brier by >=0.003 with acceptable calibration (ECE within 0.005 of baseline)." Fail = "reject
if it merely matches Elo -- keep the BuildLeagueGraph construction as a feature-engineering recipe
only."

---

## Findings

- **Every one of the 179 modules states an acceptance gate.** Zero are `NO GATE STATED`, so there is
  no gap in gate *coverage* — only in gate *evaluation*.
- **116 of 179 carry `Gate status: NOT EVALUATED`,** each with the same stated reason: the gate
  requires historical walk-forward data not available in that environment. This is a recorded
  finding about the corpus state, not a defect in any individual module.
- **63 of 179 state a gate with no `Gate status:` line at all,** so their evaluation state is
  unrecorded rather than recorded-as-pending. This is concentrated in two header dialects: the
  `decision` family (44 of 44) and the `invention` family (7 of 7), both of which use `//`-comment
  headers, plus 12 stragglers in `causal`, `ensemble`, `experimental`, `injuries`, `markets`,
  `metalearning`, and `rl` that use the `Record improvement (verbatim)` variant of the JSDoc
  template. Closing the gap is a one-line header edit per file, not research.
- **No gate in the corpus has been evaluated in this environment.** Every threshold quoted above is
  a target, not a result. Nothing in this file should be read as evidence that any module passed or
  failed.
- **Several gates are explicitly split** so that a partial adoption is possible and is spelled out in
  the header (e.g. `1908-07372`'s shock-layer-only clause, `2508-07556v2`'s monitoring-layer
  fallback, `2005-11698`'s rejection clause, `1710-04818`'s infrastructure role). Those split
  decisions are part of the gate specification and should be preserved verbatim if a gate is ever
  re-expressed.
- **Several headers carry hard-fail clauses** that override a favorable headline metric (e.g.
  `2101-12523`'s exact-card-size rule, `2104-04918v2`'s single-model collapse rule, `2006-01862`'s
  under-deferral audit, `2108-02082v3`'s near-constant weight rule, `2609-22632`'s per-class cap
  rule). These are the parts most likely to be lost in a paraphrase and are reproduced verbatim above.

