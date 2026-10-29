# Model Wiring Manifest — 2026-10-27

Branch: `engine/public-baseline-2026-10-24`  
Source: `packages/prediction-engine/src`

**Rule:** KEEP = has at least one production importer other than index.ts. ARCHIVE = reachable only via the barrel and/or its own tests.

## Totals

| Measure | Count |
|---|---|
| Disabled modules (`ENABLED = false`) | 196 |
| KEEP — has a production consumer | 12 |
| ARCHIVE — reachable only via tests/barrel | 184 |
| KEEP with `ACCEPTANCE_GATE` | 0 |
| KEEP without a gate | 12 |
| ARCHIVE that already has a gate | 5 |
| Modules with a sibling test | 192 |

## KEEP — wire these

| Module | Lines | Gate | Consumers |
|---|---|---|---|
| `index` | 5801 | **no** | 9 |
| `fci-pag` | 2409 | **no** | 2 |
| `2106-05799v1-hybrid-ability-xgboost` | 269 | **no** | 2 |
| `1812-05170-hierarchical-ar1-shrinkage` | 101 | **no** | 1 |
| `2002-01193-copula-hmm-momentum` | 184 | **no** | 1 |
| `2003-03685v2-pcmci-team-panel` | 167 | **no** | 1 |
| `1710-01787-kelly-saturation-hardening` | 180 | **no** | 1 |
| `1710-04818-drawdown-risk-frontier` | 182 | **no** | 1 |
| `1801-06737-bet-cadence-policy` | 120 | **no** | 1 |
| `1807-05265-dominance-screen` | 170 | **no** | 1 |
| `1812-10371-robust-kelly-uncertainty-set` | 149 | **no** | 1 |
| `2402-01914v1-glmf-matchup-matrices` | 143 | **no** | 1 |

## ARCHIVE — no production consumer

| Module | Lines | Gate | Dir |
|---|---|---|---|
| `1807-09236-empirical-bayes-btl` | 125 | no | ROOT |
| `2408-09178v1-mambatrack-a-simple-baseline-for` | 88 | no | ROOT |
| `2408-14837v2-diffusion-models-are-realtime-game` | 69 | no | ROOT |
| `2411-17900v1-pretrained-llm-adapted-with-lora` | 48 | no | ROOT |
| `2412-19215v1-optimizing-fantasy-sports-team-selection` | 74 | no | ROOT |
| `2502-16313-snap-timing-multilevel` | 69 | yes | ROOT |
| `2503-12107v1-chronosx-adapting-pretrained-time-series` | 63 | no | ROOT |
| `2504-08747v1-gridmind-a-multiagent-nlp-framework` | 61 | no | ROOT |
| `2504-10936v1-can-llms-leverage-observational-data` | 72 | no | ROOT |
| `2506-04282v1-drsr-llm-based-scientific-equation` | 55 | no | ROOT |
| `2508-14065v1-personalized-contest-recommendation-in-fantasy` | 64 | no | ROOT |
| `2511-14186v1-fewshot-precise-event-spotting-via` | 103 | no | ROOT |
| `2604-17065v1-baskethar-a-multimodal-dataset-for` | 68 | no | ROOT |
| `2605-30209v1-betting-against-integrity-identifying-matchfixing` | 64 | no | ROOT |
| `2606-18512-causal-panel-forecasting` | 53 | yes | ROOT |
| `2609-22641v1-consistworld-evidence-routing-for-consistent` | 63 | no | ROOT |
| `2609-33664-hmm-pass-blocking` | 90 | yes | ROOT |
| `2003-06505v1-autogluon-tabular-search` | 86 | no | automl |
| `2003-10865v2-async-hpo-service` | 168 | no | automl |
| `1503-07642-ordinal-structure-select` | 314 | no | bayesian |
| `1908-05745-nmf-target-archetypes` | 114 | no | bayesian |
| `1911-08138-sparse-form-hmm` | 194 | no | bayesian |
| `1911-08791-three-module-score-factorization` | 165 | no | bayesian |
| `2004-03019-dshdp-hmm-regimes` | 129 | no | bayesian |
| `2005-09024v1-workload-availability-model` | 213 | no | bayesian |
| `2012-14949-bivariate-poisson-home-advantage` | 64 | no | bayesian |
| `2104-07537-dynamic-probit-vb` | 86 | no | bayesian |
| `2203-10706-dfs-monte-carlo-gamma` | 148 | no | bayesian |
| `2207-05114-wp-blender-beta-prior` | 73 | no | bayesian |
| `2210-11010-efficient-vb-statespace` | 86 | no | bayesian |
| `2303-12401v2-hierarchical-live-probit` | 140 | no | bayesian |
| `2304-01538-doubly-self-exciting-scores` | 177 | no | bayesian |
| `1905-07886-conformal-ncp-intervals` | 73 | no | calibration |
| `1803-01422v2-notears-dag` | 184 | no | causal |
| `2001-04197v4-rcd-quarantine-layer` | 147 | no | causal |
| `2007-00267v1-regime-dependent-causal-discovery` | 268 | no | causal |
| `2110-00637v4-ml4c-supervised-orienter` | 220 | no | causal |
| `causal-graph-builder` | 1243 | no | causal |
| `periodic-timeseries-id` | 923 | no | causal |
| `1612-00796v2-ewc-feature-anchoring` | 94 | no | continual |
| `1904-10644v1-certainty-weighted-continual-updates` | 143 | no | continual |
| `2304-01239v1-teacher-student-continual` | 93 | no | continual |
| `0903-2910v1-ou-line-mean-reversion-sizing` | 146 | no | decision |
| `1011-3177v3-data-replication-abstention` | 161 | no | decision |
| `1803-08355v2-structured-leg-abstention` | 179 | no | decision |
| `1806-05293-multivariate-slate-sizer` | 274 | no | decision |
| `1901-09192v4-selectivenet-selection-head` | 141 | no | decision |
| `1905-10964v2-dac-abstention-cleaning` | 134 | no | decision |
| `1907-00208v2-gambler-reservation-filter` | 116 | no | decision |
| `1911-11253v1-hostile-market-abstain` | 127 | no | decision |
| `2001-09097v1-gap-stat-ratings` | 139 | no | decision |
| `2002-03448v1-levy-kelly-staking` | 134 | no | decision |
| `2003-02743-temporal-correlation-kelly` | 162 | no | decision |
| `2004-12099-kelly-kkt-certificate` | 154 | no | decision |
| `2005-11698-fluctuation-frontier` | 129 | no | decision |
| `2006-01862-expert-deferral-router` | 135 | no | decision |
| `2101-12523-sele-loss-gate` | 173 | no | decision |
| `2104-08236v1-totals-abstention-sigma` | 140 | no | decision |
| `2104-08281v1-cover-abstention-head` | 130 | no | decision |
| `2107-03090-risan-instance-abstention` | 127 | no | decision |
| `2109-10814v1-variance-budgeted-kelly` | 156 | no | decision |
| `2205-13532-training-disagreement-gate` | 136 | no | decision |
| `2409-18645v1-mc-dropout-cer` | 146 | no | decision |
| `2411-18374-analytic-drawdown-pricer` | 350 | no | decision |
| `2502-07255v2-dual-threshold-conformal` | 153 | no | decision |
| `2503-07498-two-knob-sizer` | 180 | no | decision |
| `2503-23782v1-regime-conditional-reject` | 174 | no | decision |
| `2505-00724-crra-stake-dp` | 124 | no | decision |
| `2505-22422v2-star-bets-ci` | 224 | no | decision |
| `2505-23437v2-baltor-selection` | 120 | no | decision |
| `2507-05994v1-kpup-allocation` | 115 | no | decision |
| `2508-07556v2-instability-gate` | 139 | no | decision |
| `2510-19672-committee-lcb` | 124 | no | decision |
| `2601-20452v1-whale-distortion` | 109 | no | decision |
| `2601-22570v1-memory-abstention` | 119 | no | decision |
| `2603-24704-evalue-screening` | 86 | no | decision |
| `2604-24723v2-multivariate-kelly` | 192 | no | decision |
| `2605-02611-lipschitz-forcing` | 120 | no | decision |
| `2607-24875v1-hybrid-uncertainty` | 120 | no | decision |
| `2608-23393-kellyboost` | 153 | no | decision |
| `2609-22632-perclass-gates` | 117 | no | decision |
| `physics-0607166-kelly-backtest` | 114 | no | decision |
| `1803-01984-bps-outcome-pools` | 127 | no | ensemble |
| `2010-10435v1-time-varying-forecast-combination` | 125 | no | ensemble |
| `2011-02077-factor-graphical-ensemble` | 141 | no | ensemble |
| `2012-01643-diversity-weighted-combiner` | 118 | no | ensemble |
| `2101-08954-hierarchical-stacking` | 86 | no | ensemble |
| `2104-04918v2-weighted-quantile-combination` | 87 | no | ensemble |
| `2107-06268-smoothed-boa-ensemble` | 81 | no | ensemble |
| `2108-02082v3-regime-blender-febama` | 196 | no | ensemble |
| `2111-15365-weekly-boa-consensus` | 81 | no | ensemble |
| `2202-11834-beta-linear-pool` | 81 | no | ensemble |
| `2203-03279v3-fforma-fusion` | 86 | no | ensemble |
| `2209-01697-regime-factor-glasso` | 141 | no | ensemble |
| `2406-15760-icm-drift-monitor` | 73 | no | ensemble |
| `2408-00785v4-kairosis-forecast-aggregation` | 100 | no | ensemble |
| `1601-04302v6-footballonomics-bootstrap` | 134 | no | experimental |
| `1708-02715v1-order-flow-resiliency` | 178 | no | experimental |
| `1804-04226v1-cfov-decomposition` | 135 | no | experimental |
| `1805-01271v1-its-break-harness` | 154 | no | experimental |
| `1811-03931v1-riskneutral-inplay-pricer` | 121 | no | experimental |
| `1905-03628v1-nested-poisson-totals` | 124 | no | experimental |
| `2006-04551v4-mimic-model-tree` | 66 | no | experimental |
| `2101-10385v1-bandit-model-selector` | 80 | no | experimental |
| `2103-04349v1-irl-situational-decisions` | 55 | no | experimental |
| `2106-05174v1-nested-zigp-simulation` | 220 | no | experimental |
| `2108-00821v2-news-reaction-ssm` | 159 | no | experimental |
| `2109-06625v1-off-policy-coach-rl` | 80 | no | experimental |
| `2206-01038v1-video-action-recognition-menu` | 63 | no | experimental |
| `2206-09654v1-season-total-lstm-ensemble` | 96 | no | experimental |
| `2206-11578v1-doubly-online-changepoint` | 125 | no | experimental |
| `2209-07274v5-convexity-grid-war` | 134 | no | experimental |
| `2211-04459v3-flexbart-tabular-learner` | 115 | no | experimental |
| `2308-02414v3-bivariate-ssm-skill-rating` | 86 | no | experimental |
| `1705-03918-two-version-causal` | 185 | no | injuries |
| `1710-08749v1-ppta-causal` | 309 | no | injuries |
| `1801-07104-hot-hand-repetition` | 119 | no | injuries |
| `2009-06750-icing-causal-dag` | 102 | no | injuries |
| `2011-11691-fourth-down-att-matching` | 162 | no | injuries |
| `2108-08797-synthetic-pretraining-detector` | 66 | no | injuries |
| `2202-08500-recurrent-competing-events` | 84 | no | injuries |
| `2205-07193v2-division-pair-hfa-causal` | 162 | no | injuries |
| `2305-14612-acl-risk-video-scoring` | 63 | no | injuries |
| `2103-04647-marked-point-process-live` | 77 | no | inplay |
| `literature-causal` | 323 | no | literature |
| `1106-4509-ml-market-pooling` | 126 | no | markets |
| `1310-6998v1-twitter-volume-momentum` | 105 | no | markets |
| `1802-08848v1-odds-history-fusion` | 77 | no | markets |
| `1910-08858v2-spread-win-probability-table` | 134 | no | markets |
| `2003-09384v2-static-theta-threshold-policy` | 172 | no | markets |
| `2010-12508v1-decorrelation-penalty-loss` | 250 | no | markets |
| `2107-08827v1-fractional-kelly-sizing` | 62 | no | markets |
| `2112-13001v3-dcp-prop-framework` | 165 | no | markets |
| `2401-06086v1-imitation-inplay-betting` | 80 | no | markets |
| `1703-03400v3-maml-rookie-adapter` | 119 | no | metalearning |
| `1807-08912v2-alpaca-online-regression` | 123 | no | metalearning |
| `1901-09890v1-meta-metric-librarian` | 126 | no | metalearning |
| `2006-06707v2-metavrf-kernel-learning` | 128 | no | metalearning |
| `2009-03228v3-gp-vib-meta-learning` | 128 | no | metalearning |
| `2208-08135v1-uncertainty-weighted-metalearning` | 185 | no | metalearning |
| `mlb-independent-model` | 127 | yes | ROOT |
| `2010-00526v1-liveqa-nfl-benchmark` | 82 | no | nlp |
| `2211-04534v1-goal-nfl-retrieval` | 121 | no | nlp |
| `2401-01505v5-afa-tracking-qa` | 121 | no | nlp |
| `1505-01147v2-local-matrix-completion` | 209 | no | props-dfs |
| `1909-12938v1-ts-forecast-dfs-optimizer` | 64 | no | props-dfs |
| `1912-10417v1-regime-switching-synergy-network` | 158 | no | props-dfs |
| `2003-01712v1-joi-stack-metric` | 53 | no | props-dfs |
| `2004-08428v1-era-adjusted-features` | 79 | no | props-dfs |
| `2005-07742-seam-matchup-shrinkage` | 73 | no | props-dfs |
| `2006-07513-bayesian-shot-archetypes` | 154 | no | props-dfs |
| `2009-01206v1-chalk-meter-contrarian` | 66 | no | props-dfs |
| `2112-07002-emax-duel-optimizer` | 99 | no | props-dfs |
| `2212-11041v1-future-value-models` | 89 | no | props-dfs |
| `2302-13386-player2vec-embeddings` | 58 | no | props-dfs |
| `2303-04963v1-elite-lineup-order-stats` | 53 | no | props-dfs |
| `2407-13438-ems-gpp-portfolio` | 128 | no | props-dfs |
| `2407-17832-group-lasso-plus-minus` | 99 | no | props-dfs |
| `1707-06887v1-distributional-slate-rl` | 131 | no | rl |
| `1806-06923v2-iqn-critic` | 93 | no | rl |
| `1902-08102v2-expectile-critic` | 80 | no | rl |
| `2006-04779v2-cql-stake-policy` | 80 | no | rl |
| `2105-08877v2-c51-optimal-stopping` | 103 | no | rl |
| `2202-00769v1-sinkhorn-drl-staking` | 59 | no | rl |
| `2203-03003v1-offline-cql-staking` | 80 | no | rl |
| `shadow-calibration-eprocess` | 337 | yes | ROOT |
| `2306-00840v1-muzero-planning-audit` | 59 | no | simulators |
| `0803-1364v2-generalized-kelly-solver` | 249 | no | sizing |
| `2006-10782v2-aifeynman-pareto-pruning` | 77 | no | symreg |
| `2312-11955v1-vertical-symbolic-regression` | 77 | no | symreg |
| `2401-00282v1-dgsr-lite-refinement` | 73 | no | symreg |
| `1109-2825v2-scoring-random-walk` | 181 | no | team-ratings |
| `1403-7642-college-ranking-sensitivity` | 111 | no | team-ratings |
| `1609-01176v1-player-kernel-gp` | 100 | no | team-ratings |
| `2010-11187-g-elo-margin-model` | 134 | no | team-ratings |
| `2207-12147v1-sparse-tvp-team-ratings` | 141 | no | team-ratings |
| `2012-11717v3-social-nce-trajectories` | 75 | no | tracking |
| `2305-02968v1-masked-trajectory-models` | 77 | no | tracking |
| `2407-20028v1-atscc-route-primitives` | 75 | no | tracking |
| `2106-00175-stacked-live-wp-bakeoff` | 86 | no | weather |
| `2109-09287-stadium-factor-decomposition` | 180 | no | weather |
| `1908-07372-sde-inplay-win-probability` | 86 | no | win-spread-total |
| `2008-13005-budescu-chen-aggregation` | 63 | no | win-spread-total |
| `2207-13191-gcn-win-prediction` | 95 | no | win-spread-total |
