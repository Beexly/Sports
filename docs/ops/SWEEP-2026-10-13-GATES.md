# SWEEP-2026-10-13 GATES: code-level wiring audit vs GATE_CENSUS_2026-10-12

Repo C:/Users/Garrett/Sports | branch fix/galaxy-odds-first-2026-10-08 (dirty, read-only sweep)
Census: origin/motif/gate-census-2026-10-12 (sha 3c2d2b041), docs/gates/GATE_CENSUS_2026-10-12.json/.md

## Counts per category (all 229 census entries checked)

- wired-live: 8
- landed-not-wired: 185
- quarantined: 24
- spec-only: 3
- not-found: 3
- unclear: 6

Census self-reported: SPEC-ONLY 157, LANDED-NOT-WIRED 34, INFERRED-SPEC-QUARANTINE 24, WIRED-LIVE 14.

## Method

Per entry: locate every path named in code_location; confirm existence; count non-test production importers
(TS/JS under apps|packages|workers and all repo .py) with tests excluded. Barrel-only re-exports do not count.
Structural backbone: packages/prediction-engine/src/index.ts is a pure re-export barrel; a PE module is only
reachable in production if the barrel reaches it AND some production file imports the barrel.

## Structural findings (prediction-engine)

- non-test PE src .ts modules: 987
- reachable from src/index.ts: 515
- NOT reachable from the barrel: 472
- non-test production importers of any PE subpath file other than the barrel: 0
- non-test production importers of the barrel: 199 files

## Discrepancies vs census

### 1. Census WIRED-LIVE but NO non-test production caller found (13)

- G-01 FreshnessGate :: docs/research/2026-10-09/rating-atlas/minis/freshness_gate.py + docs/research/2026-10-09/rating-atlas/minis/api/freshnes [unclear]
- G-03 CollegeGuard :: docs/research/2026-10-09/rating-atlas/minis/live_board.py (branch research/rating-atlas-2026-10-09-packet) [unclear]
- G-04 Signal Spine :: apps/web/lib/signals/spine.ts + apps/web/lib/fantasy/dfs-signals.ts (main) [landed-not-wired]
- G-05 Contest-Shape Guard (adviseMode) :: apps/web/lib/fantasy/dfs-signals.ts (main) [landed-not-wired]
- G-06 Per-Market Calibration Gate :: apps/web/lib/ops/per-market-gate.ts (main) [landed-not-wired]
- G-10 Proper Scoring Gate :: packages/ingestion-pipeline/src/publish-guards-bridge.ts (evalReliability) (main) [landed-not-wired]
- G-11 JEV 10K Correlated Monte Carlo Engine :: apps/web/lib/fantasy/dfs-correlation.ts (main) [landed-not-wired]
- G-15 DFS Lineup Validation :: apps/web/lib/fantasy/dfs-lineup-validation.ts (main) [landed-not-wired]
- G-16 Board Gate Rows (Honesty Mapping) :: apps/web/lib/board/gate-rows.ts + apps/web/lib/board/gate-consumer.ts (main) [landed-not-wired]
- G-17 Live Board Honesty Labels :: docs/research/2026-10-09/rating-atlas/minis/live_board.py + docs/research/2026-10-09/rating-atlas/minis/api/live_board.p [unclear]
- G-18 Kill Ledger :: docs/research/2026-10-09/rating-atlas/minis/kill_ledger.jsonl + rating-atlas/KILL_LEDGER.md + dfs/kill_ledger_freshness. [unclear]
- G-19 GSE Score Honesty :: apps/web/lib/fantasy/gse-score.ts (main) [landed-not-wired]
- G-20 Banned Language Filter (Board Output) :: docs/research/2026-10-09/rating-atlas/minis/live_board.py (branch research/rating-atlas-2026-10-09-packet) [unclear]

### 2. Census SPEC-ONLY but executable code exists (151 of 157)

Examples with line counts: PE-001(85 lines), PE-002(167 lines), PE-003(154 lines), PE-004(313 lines), PE-005(100 lines), PE-006(113 lines), PE-007(193 lines), PE-008(164 lines), PE-013(85 lines), PE-014(147 lines), PE-015(72 lines), PE-016(85 lines), PE-021(146 lines), PE-022(166 lines), PE-023(267 lines)

### 3. Census WIRED-LIVE and a caller WAS found (1)

- G-09 Selective Abstention Gate (Chow/NP-style) :: caller packages/prediction-engine/src/certificate/index.ts

### 4. Paths absent from this workspace (3 not-found, 6 unclear)

- not-found: G-12, G-13, G-14
- unclear (branch-scoped code_location, file not on this branch): G-01, G-03, G-07, G-17, G-18, G-20
- LOCAL-* entries point at ~/workspace/... (local-inferred); C:/Users/Garrett/workspace/gates does not exist.

## LANDED-NOT-WIRED list with insertion points (185)

- G-04 Signal Spine :: apps/web/lib/signals/spine.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-05 Contest-Shape Guard (adviseMode) :: apps/web/lib/fantasy/dfs-signals.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-06 Per-Market Calibration Gate :: apps/web/lib/ops/per-market-gate.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- G-08 Model Promotion Gate (Champion/Challenger) :: docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- G-10 Proper Scoring Gate :: packages/ingestion-pipeline/src/publish-guards-bridge.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-11 JEV 10K Correlated Monte Carlo Engine :: apps/web/lib/fantasy/dfs-correlation.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-15 DFS Lineup Validation :: apps/web/lib/fantasy/dfs-lineup-validation.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-16 Board Gate Rows (Honesty Mapping) :: apps/web/lib/board/gate-rows.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- G-19 GSE Score Honesty :: apps/web/lib/fantasy/gse-score.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- G-21 Age Gate :: apps/web/lib/auth/age-gate.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- G-22 CSRF Origin Guard :: apps/web/lib/auth/csrf-origin-guard.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-23 In-Play Guard :: packages/ingestion-pipeline/src/in-play-guard.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-24 Durable Write Guard :: packages/db/src/durable-write-guard.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-25 Numeric Guard :: apps/web/lib/claude-api/numeric-guard.ts :: wire packages/ingestion-pipeline/src/score-model-bridge.ts:52
- G-26 Trust Gate :: scripts/guardrails/trust-gate.mjs :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-001 automl/2003-06505v1-autogluon-tabular-search :: packages/prediction-engine/src/automl/2003-06505v1-autogluon-tabular-search.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-002 automl/2003-10865v2-async-hpo-service :: packages/prediction-engine/src/automl/2003-10865v2-async-hpo-service.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-003 bayesian/1210-1016-dependent-bradley-terry :: packages/prediction-engine/src/bayesian/1210-1016-dependent-bradley-terry.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-004 bayesian/1503-07642-ordinal-structure-select :: packages/prediction-engine/src/bayesian/1503-07642-ordinal-structure-select.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-005 bayesian/1812-05170-hierarchical-ar1-shrinkage :: packages/prediction-engine/src/bayesian/1812-05170-hierarchical-ar1-shrinkage.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-006 bayesian/1908-05745-nmf-target-archetypes :: packages/prediction-engine/src/bayesian/1908-05745-nmf-target-archetypes.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-007 bayesian/1911-08138-sparse-form-hmm :: packages/prediction-engine/src/bayesian/1911-08138-sparse-form-hmm.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-008 bayesian/1911-08791-three-module-score-factorization :: packages/prediction-engine/src/bayesian/1911-08791-three-module-score-factorization.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-013 bayesian/2104-07537-dynamic-probit-vb :: packages/prediction-engine/src/bayesian/2104-07537-dynamic-probit-vb.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-014 bayesian/2203-10706-dfs-monte-carlo-gamma :: packages/prediction-engine/src/bayesian/2203-10706-dfs-monte-carlo-gamma.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-015 bayesian/2207-05114-wp-blender-beta-prior :: packages/prediction-engine/src/bayesian/2207-05114-wp-blender-beta-prior.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-016 bayesian/2210-11010-efficient-vb-statespace :: packages/prediction-engine/src/bayesian/2210-11010-efficient-vb-statespace.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-017 bayesian/2303-12401v2-hierarchical-live-probit :: packages/prediction-engine/src/bayesian/2303-12401v2-hierarchical-live-probit.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-019 calibration/1905-07886-conformal-ncp-intervals :: packages/prediction-engine/src/calibration/1905-07886-conformal-ncp-intervals.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-020 causal/1803-01422v2-notears-dag :: packages/prediction-engine/src/causal/1803-01422v2-notears-dag.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-021 causal/2001-04197v4-rcd-quarantine-layer :: packages/prediction-engine/src/causal/2001-04197v4-rcd-quarantine-layer.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-022 causal/2003-03685v2-pcmci-team-panel :: packages/prediction-engine/src/causal/2003-03685v2-pcmci-team-panel.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-023 causal/2007-00267v1-regime-dependent-causal-discovery :: packages/prediction-engine/src/causal/2007-00267v1-regime-dependent-causal-discovery.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-024 causal/2110-00637v4-ml4c-supervised-orienter :: packages/prediction-engine/src/causal/2110-00637v4-ml4c-supervised-orienter.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-025 continual/1612-00796v2-ewc-feature-anchoring :: packages/prediction-engine/src/continual/1612-00796v2-ewc-feature-anchoring.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-026 continual/1904-10644v1-certainty-weighted-continual-updates :: packages/prediction-engine/src/continual/1904-10644v1-certainty-weighted-continual-updates.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-027 continual/2304-01239v1-teacher-student-continual :: packages/prediction-engine/src/continual/2304-01239v1-teacher-student-continual.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-028 decision/0903-2910v1-ou-line-mean-reversion-sizing :: packages/prediction-engine/src/decision/0903-2910v1-ou-line-mean-reversion-sizing.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-029 decision/1011-3177v3-data-replication-abstention :: packages/prediction-engine/src/decision/1011-3177v3-data-replication-abstention.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-030 decision/1710-01787-kelly-saturation-hardening :: packages/prediction-engine/src/decision/1710-01787-kelly-saturation-hardening.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-031 decision/1710-04818-drawdown-risk-frontier :: packages/prediction-engine/src/decision/1710-04818-drawdown-risk-frontier.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-032 decision/1801-06737-bet-cadence-policy :: packages/prediction-engine/src/decision/1801-06737-bet-cadence-policy.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-033 decision/1803-08355v2-structured-leg-abstention :: packages/prediction-engine/src/decision/1803-08355v2-structured-leg-abstention.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-034 decision/1806-05293-multivariate-slate-sizer :: packages/prediction-engine/src/decision/1806-05293-multivariate-slate-sizer.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-035 decision/1807-05265-dominance-screen :: packages/prediction-engine/src/decision/1807-05265-dominance-screen.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-036 decision/1812-10371-robust-kelly-uncertainty-set :: packages/prediction-engine/src/decision/1812-10371-robust-kelly-uncertainty-set.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-037 decision/1901-09192v4-selectivenet-selection-head :: packages/prediction-engine/src/decision/1901-09192v4-selectivenet-selection-head.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-038 decision/1905-10964v2-dac-abstention-cleaning :: packages/prediction-engine/src/decision/1905-10964v2-dac-abstention-cleaning.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-039 decision/1907-00208v2-gambler-reservation-filter :: packages/prediction-engine/src/decision/1907-00208v2-gambler-reservation-filter.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-040 decision/1911-11253v1-hostile-market-abstain :: packages/prediction-engine/src/decision/1911-11253v1-hostile-market-abstain.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-041 decision/2001-09097v1-gap-stat-ratings :: packages/prediction-engine/src/decision/2001-09097v1-gap-stat-ratings.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-042 decision/2002-03448v1-levy-kelly-staking :: packages/prediction-engine/src/decision/2002-03448v1-levy-kelly-staking.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-043 decision/2003-02743-temporal-correlation-kelly :: packages/prediction-engine/src/decision/2003-02743-temporal-correlation-kelly.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-044 decision/2004-12099-kelly-kkt-certificate :: packages/prediction-engine/src/decision/2004-12099-kelly-kkt-certificate.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-045 decision/2005-11698-fluctuation-frontier :: packages/prediction-engine/src/decision/2005-11698-fluctuation-frontier.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-046 decision/2006-01862-expert-deferral-router :: packages/prediction-engine/src/decision/2006-01862-expert-deferral-router.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-047 decision/2101-12523-sele-loss-gate :: packages/prediction-engine/src/decision/2101-12523-sele-loss-gate.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-048 decision/2104-08236v1-totals-abstention-sigma :: packages/prediction-engine/src/decision/2104-08236v1-totals-abstention-sigma.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-049 decision/2104-08281v1-cover-abstention-head :: packages/prediction-engine/src/decision/2104-08281v1-cover-abstention-head.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-050 decision/2107-03090-risan-instance-abstention :: packages/prediction-engine/src/decision/2107-03090-risan-instance-abstention.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-051 decision/2109-10814v1-variance-budgeted-kelly :: packages/prediction-engine/src/decision/2109-10814v1-variance-budgeted-kelly.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-052 decision/2205-13532-training-disagreement-gate :: packages/prediction-engine/src/decision/2205-13532-training-disagreement-gate.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-057 decision/2503-23782v1-regime-conditional-reject :: packages/prediction-engine/src/decision/2503-23782v1-regime-conditional-reject.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-058 decision/2505-00724-crra-stake-dp :: packages/prediction-engine/src/decision/2505-00724-crra-stake-dp.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-059 decision/2505-22422v2-star-bets-ci :: packages/prediction-engine/src/decision/2505-22422v2-star-bets-ci.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-060 decision/2505-23437v2-baltor-selection :: packages/prediction-engine/src/decision/2505-23437v2-baltor-selection.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-061 decision/2507-05994v1-kpup-allocation :: packages/prediction-engine/src/decision/2507-05994v1-kpup-allocation.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-062 decision/2508-07556v2-instability-gate :: packages/prediction-engine/src/decision/2508-07556v2-instability-gate.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-063 decision/2510-19672-committee-lcb :: packages/prediction-engine/src/decision/2510-19672-committee-lcb.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-064 decision/2601-20452v1-whale-distortion :: packages/prediction-engine/src/decision/2601-20452v1-whale-distortion.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-065 decision/2601-22570v1-memory-abstention :: packages/prediction-engine/src/decision/2601-22570v1-memory-abstention.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-066 decision/2603-24704-evalue-screening :: packages/prediction-engine/src/decision/2603-24704-evalue-screening.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-067 decision/2604-24723v2-multivariate-kelly :: packages/prediction-engine/src/decision/2604-24723v2-multivariate-kelly.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-068 decision/2605-02611-lipschitz-forcing :: packages/prediction-engine/src/decision/2605-02611-lipschitz-forcing.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-069 decision/2607-24875v1-hybrid-uncertainty :: packages/prediction-engine/src/decision/2607-24875v1-hybrid-uncertainty.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-070 decision/2608-23393-kellyboost :: packages/prediction-engine/src/decision/2608-23393-kellyboost.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-071 decision/2609-22632-perclass-gates :: packages/prediction-engine/src/decision/2609-22632-perclass-gates.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-072 ensemble/1803-01984-bps-outcome-pools :: packages/prediction-engine/src/ensemble/1803-01984-bps-outcome-pools.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-073 ensemble/2010-10435v1-time-varying-forecast-combination :: packages/prediction-engine/src/ensemble/2010-10435v1-time-varying-forecast-combination.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-074 ensemble/2011-02077-factor-graphical-ensemble :: packages/prediction-engine/src/ensemble/2011-02077-factor-graphical-ensemble.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-075 ensemble/2012-01643-diversity-weighted-combiner :: packages/prediction-engine/src/ensemble/2012-01643-diversity-weighted-combiner.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-076 ensemble/2101-08954-hierarchical-stacking :: packages/prediction-engine/src/ensemble/2101-08954-hierarchical-stacking.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-077 ensemble/2104-04918v2-weighted-quantile-combination :: packages/prediction-engine/src/ensemble/2104-04918v2-weighted-quantile-combination.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-078 ensemble/2107-06268-smoothed-boa-ensemble :: packages/prediction-engine/src/ensemble/2107-06268-smoothed-boa-ensemble.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-079 ensemble/2108-02082v3-regime-blender-febama :: packages/prediction-engine/src/ensemble/2108-02082v3-regime-blender-febama.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-080 ensemble/2111-15365-weekly-boa-consensus :: packages/prediction-engine/src/ensemble/2111-15365-weekly-boa-consensus.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-081 ensemble/2202-11834-beta-linear-pool :: packages/prediction-engine/src/ensemble/2202-11834-beta-linear-pool.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-082 ensemble/2203-03279v3-fforma-fusion :: packages/prediction-engine/src/ensemble/2203-03279v3-fforma-fusion.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-083 ensemble/2209-01697-regime-factor-glasso :: packages/prediction-engine/src/ensemble/2209-01697-regime-factor-glasso.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-084 ensemble/2406-15760-icm-drift-monitor :: packages/prediction-engine/src/ensemble/2406-15760-icm-drift-monitor.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-085 ensemble/2408-00785v4-kairosis-forecast-aggregation :: packages/prediction-engine/src/ensemble/2408-00785v4-kairosis-forecast-aggregation.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-086 experimental/1601-04302v6-footballonomics-bootstrap :: packages/prediction-engine/src/experimental/1601-04302v6-footballonomics-bootstrap.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-087 experimental/1708-02715v1-order-flow-resiliency :: packages/prediction-engine/src/experimental/1708-02715v1-order-flow-resiliency.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-088 experimental/1804-04226v1-cfov-decomposition :: packages/prediction-engine/src/experimental/1804-04226v1-cfov-decomposition.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-089 experimental/1805-01271v1-its-break-harness :: packages/prediction-engine/src/experimental/1805-01271v1-its-break-harness.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-090 experimental/1811-03931v1-riskneutral-inplay-pricer :: packages/prediction-engine/src/experimental/1811-03931v1-riskneutral-inplay-pricer.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-091 experimental/1905-03628v1-nested-poisson-totals :: packages/prediction-engine/src/experimental/1905-03628v1-nested-poisson-totals.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-092 experimental/2006-04551v4-mimic-model-tree :: packages/prediction-engine/src/experimental/2006-04551v4-mimic-model-tree.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-093 experimental/2101-10385v1-bandit-model-selector :: packages/prediction-engine/src/experimental/2101-10385v1-bandit-model-selector.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-094 experimental/2103-04349v1-irl-situational-decisions :: packages/prediction-engine/src/experimental/2103-04349v1-irl-situational-decisions.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-095 experimental/2106-05174v1-nested-zigp-simulation :: packages/prediction-engine/src/experimental/2106-05174v1-nested-zigp-simulation.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-096 experimental/2108-00821v2-news-reaction-ssm :: packages/prediction-engine/src/experimental/2108-00821v2-news-reaction-ssm.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-097 experimental/2109-06625v1-off-policy-coach-rl :: packages/prediction-engine/src/experimental/2109-06625v1-off-policy-coach-rl.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-098 experimental/2206-01038v1-video-action-recognition-menu :: packages/prediction-engine/src/experimental/2206-01038v1-video-action-recognition-menu.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-099 experimental/2206-09654v1-season-total-lstm-ensemble :: packages/prediction-engine/src/experimental/2206-09654v1-season-total-lstm-ensemble.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-100 experimental/2206-11578v1-doubly-online-changepoint :: packages/prediction-engine/src/experimental/2206-11578v1-doubly-online-changepoint.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-101 experimental/2209-07274v5-convexity-grid-war :: packages/prediction-engine/src/experimental/2209-07274v5-convexity-grid-war.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-102 experimental/2211-04459v3-flexbart-tabular-learner :: packages/prediction-engine/src/experimental/2211-04459v3-flexbart-tabular-learner.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-103 experimental/2308-02414v3-bivariate-ssm-skill-rating :: packages/prediction-engine/src/experimental/2308-02414v3-bivariate-ssm-skill-rating.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-104 experimental/2402-01914v1-glmf-matchup-matrices :: packages/prediction-engine/src/experimental/2402-01914v1-glmf-matchup-matrices.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-105 injuries/1705-03918-two-version-causal :: packages/prediction-engine/src/injuries/1705-03918-two-version-causal.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-106 injuries/1710-08749v1-ppta-causal :: packages/prediction-engine/src/injuries/1710-08749v1-ppta-causal.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-107 injuries/1801-07104-hot-hand-repetition :: packages/prediction-engine/src/injuries/1801-07104-hot-hand-repetition.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-108 injuries/2009-06750-icing-causal-dag :: packages/prediction-engine/src/injuries/2009-06750-icing-causal-dag.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-109 injuries/2011-11691-fourth-down-att-matching :: packages/prediction-engine/src/injuries/2011-11691-fourth-down-att-matching.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-110 injuries/2108-08797-synthetic-pretraining-detector :: packages/prediction-engine/src/injuries/2108-08797-synthetic-pretraining-detector.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-111 injuries/2202-08500-recurrent-competing-events :: packages/prediction-engine/src/injuries/2202-08500-recurrent-competing-events.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-112 injuries/2205-07193v2-division-pair-hfa-causal :: packages/prediction-engine/src/injuries/2205-07193v2-division-pair-hfa-causal.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-113 injuries/2305-14612-acl-risk-video-scoring :: packages/prediction-engine/src/injuries/2305-14612-acl-risk-video-scoring.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-114 inplay/2103-04647-marked-point-process-live :: packages/prediction-engine/src/inplay/2103-04647-marked-point-process-live.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-115 invention/1905-11481v2-ai-feynman-separability :: packages/prediction-engine/src/invention/1905-11481v2-ai-feynman-separability.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-116 invention/1912-04871v4-risk-seeking-symreg :: packages/prediction-engine/src/invention/1912-04871v4-risk-seeking-symreg.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-117 invention/2409-00629v2-dualmargin-bandit-experiment :: packages/prediction-engine/src/invention/2409-00629v2-dualmargin-bandit-experiment.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-118 invention/2410-17238v1-sela-mcts :: packages/prediction-engine/src/invention/2410-17238v1-sela-mcts.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-119 invention/2508-01285v2-biodisco-critic-stage :: packages/prediction-engine/src/invention/2508-01285v2-biodisco-critic-stage.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-120 invention/2606-29823v1-experience-graph :: packages/prediction-engine/src/invention/2606-29823v1-experience-graph.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-121 invention/2608-25770v2-hypoforge-split :: packages/prediction-engine/src/invention/2608-25770v2-hypoforge-split.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-122 markets/1106-4509-ml-market-pooling :: packages/prediction-engine/src/markets/1106-4509-ml-market-pooling.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-123 markets/1310-6998v1-twitter-volume-momentum :: packages/prediction-engine/src/markets/1310-6998v1-twitter-volume-momentum.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-124 markets/1802-08848v1-odds-history-fusion :: packages/prediction-engine/src/markets/1802-08848v1-odds-history-fusion.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-125 markets/1910-08858v2-spread-win-probability-table :: packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-126 markets/2003-09384v2-static-theta-threshold-policy :: packages/prediction-engine/src/markets/2003-09384v2-static-theta-threshold-policy.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-127 markets/2010-12508v1-decorrelation-penalty-loss :: packages/prediction-engine/src/markets/2010-12508v1-decorrelation-penalty-loss.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-128 markets/2106-05799v1-hybrid-ability-xgboost :: packages/prediction-engine/src/markets/2106-05799v1-hybrid-ability-xgboost.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-129 markets/2107-08827v1-fractional-kelly-sizing :: packages/prediction-engine/src/markets/2107-08827v1-fractional-kelly-sizing.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-130 markets/2112-13001v3-dcp-prop-framework :: packages/prediction-engine/src/markets/2112-13001v3-dcp-prop-framework.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-131 markets/2401-06086v1-imitation-inplay-betting :: packages/prediction-engine/src/markets/2401-06086v1-imitation-inplay-betting.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-132 metalearning/1703-03400v3-maml-rookie-adapter :: packages/prediction-engine/src/metalearning/1703-03400v3-maml-rookie-adapter.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-133 metalearning/1807-08912v2-alpaca-online-regression :: packages/prediction-engine/src/metalearning/1807-08912v2-alpaca-online-regression.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-134 metalearning/1901-09890v1-meta-metric-librarian :: packages/prediction-engine/src/metalearning/1901-09890v1-meta-metric-librarian.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-135 metalearning/2006-06707v2-metavrf-kernel-learning :: packages/prediction-engine/src/metalearning/2006-06707v2-metavrf-kernel-learning.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-136 metalearning/2009-03228v3-gp-vib-meta-learning :: packages/prediction-engine/src/metalearning/2009-03228v3-gp-vib-meta-learning.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-137 metalearning/2208-08135v1-uncertainty-weighted-metalearning :: packages/prediction-engine/src/metalearning/2208-08135v1-uncertainty-weighted-metalearning.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-138 nlp/2010-00526v1-liveqa-nfl-benchmark :: packages/prediction-engine/src/nlp/2010-00526v1-liveqa-nfl-benchmark.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-139 nlp/2211-04534v1-goal-nfl-retrieval :: packages/prediction-engine/src/nlp/2211-04534v1-goal-nfl-retrieval.ts :: wire packages/ingestion-pipeline/src/leakage-gate.ts:29
- PE-140 nlp/2401-01505v5-afa-tracking-qa :: packages/prediction-engine/src/nlp/2401-01505v5-afa-tracking-qa.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-141 props-dfs/1505-01147v2-local-matrix-completion :: packages/prediction-engine/src/props-dfs/1505-01147v2-local-matrix-completion.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-142 props-dfs/1909-12938v1-ts-forecast-dfs-optimizer :: packages/prediction-engine/src/props-dfs/1909-12938v1-ts-forecast-dfs-optimizer.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-143 props-dfs/1912-10417v1-regime-switching-synergy-network :: packages/prediction-engine/src/props-dfs/1912-10417v1-regime-switching-synergy-network.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-144 props-dfs/2003-01712v1-joi-stack-metric :: packages/prediction-engine/src/props-dfs/2003-01712v1-joi-stack-metric.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-145 props-dfs/2004-08428v1-era-adjusted-features :: packages/prediction-engine/src/props-dfs/2004-08428v1-era-adjusted-features.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-146 props-dfs/2005-07742-seam-matchup-shrinkage :: packages/prediction-engine/src/props-dfs/2005-07742-seam-matchup-shrinkage.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-147 props-dfs/2006-07513-bayesian-shot-archetypes :: packages/prediction-engine/src/props-dfs/2006-07513-bayesian-shot-archetypes.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-148 props-dfs/2009-01206v1-chalk-meter-contrarian :: packages/prediction-engine/src/props-dfs/2009-01206v1-chalk-meter-contrarian.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-149 props-dfs/2112-07002-emax-duel-optimizer :: packages/prediction-engine/src/props-dfs/2112-07002-emax-duel-optimizer.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-150 props-dfs/2212-11041v1-future-value-models :: packages/prediction-engine/src/props-dfs/2212-11041v1-future-value-models.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-151 props-dfs/2302-13386-player2vec-embeddings :: packages/prediction-engine/src/props-dfs/2302-13386-player2vec-embeddings.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-152 props-dfs/2303-04963v1-elite-lineup-order-stats :: packages/prediction-engine/src/props-dfs/2303-04963v1-elite-lineup-order-stats.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-153 props-dfs/2407-13438-ems-gpp-portfolio :: packages/prediction-engine/src/props-dfs/2407-13438-ems-gpp-portfolio.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-154 props-dfs/2407-17832-group-lasso-plus-minus :: packages/prediction-engine/src/props-dfs/2407-17832-group-lasso-plus-minus.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-155 rl/1707-06887v1-distributional-slate-rl :: packages/prediction-engine/src/rl/1707-06887v1-distributional-slate-rl.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-156 rl/1806-06923v2-iqn-critic :: packages/prediction-engine/src/rl/1806-06923v2-iqn-critic.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-157 rl/1902-08102v2-expectile-critic :: packages/prediction-engine/src/rl/1902-08102v2-expectile-critic.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-158 rl/2006-04779v2-cql-stake-policy :: packages/prediction-engine/src/rl/2006-04779v2-cql-stake-policy.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-159 rl/2105-08877v2-c51-optimal-stopping :: packages/prediction-engine/src/rl/2105-08877v2-c51-optimal-stopping.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-160 rl/2202-00769v1-sinkhorn-drl-staking :: packages/prediction-engine/src/rl/2202-00769v1-sinkhorn-drl-staking.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-161 rl/2203-03003v1-offline-cql-staking :: packages/prediction-engine/src/rl/2203-03003v1-offline-cql-staking.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-162 simulators/2306-00840v1-muzero-planning-audit :: packages/prediction-engine/src/simulators/2306-00840v1-muzero-planning-audit.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-163 sizing/0803-1364v2-generalized-kelly-solver :: packages/prediction-engine/src/sizing/0803-1364v2-generalized-kelly-solver.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-164 symreg/2006-10782v2-aifeynman-pareto-pruning :: packages/prediction-engine/src/symreg/2006-10782v2-aifeynman-pareto-pruning.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-165 symreg/2312-11955v1-vertical-symbolic-regression :: packages/prediction-engine/src/symreg/2312-11955v1-vertical-symbolic-regression.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-166 symreg/2401-00282v1-dgsr-lite-refinement :: packages/prediction-engine/src/symreg/2401-00282v1-dgsr-lite-refinement.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-167 team-ratings/1109-2825v2-scoring-random-walk :: packages/prediction-engine/src/team-ratings/1109-2825v2-scoring-random-walk.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-168 team-ratings/1403-7642-college-ranking-sensitivity :: packages/prediction-engine/src/team-ratings/1403-7642-college-ranking-sensitivity.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-169 team-ratings/1609-01176v1-player-kernel-gp :: packages/prediction-engine/src/team-ratings/1609-01176v1-player-kernel-gp.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-170 team-ratings/2010-11187-g-elo-margin-model :: packages/prediction-engine/src/team-ratings/2010-11187-g-elo-margin-model.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-171 team-ratings/2207-12147v1-sparse-tvp-team-ratings :: packages/prediction-engine/src/team-ratings/2207-12147v1-sparse-tvp-team-ratings.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-172 tracking/2012-11717v3-social-nce-trajectories :: packages/prediction-engine/src/tracking/2012-11717v3-social-nce-trajectories.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-173 tracking/2305-02968v1-masked-trajectory-models :: packages/prediction-engine/src/tracking/2305-02968v1-masked-trajectory-models.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-174 tracking/2407-20028v1-atscc-route-primitives :: packages/prediction-engine/src/tracking/2407-20028v1-atscc-route-primitives.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-175 weather/2106-00175-stacked-live-wp-bakeoff :: packages/prediction-engine/src/weather/2106-00175-stacked-live-wp-bakeoff.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-176 weather/2109-09287-stadium-factor-decomposition :: packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-177 win-spread-total/1908-07372-sde-inplay-win-probability :: packages/prediction-engine/src/win-spread-total/1908-07372-sde-inplay-win-probability.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-178 win-spread-total/2008-13005-budescu-chen-aggregation :: packages/prediction-engine/src/win-spread-total/2008-13005-budescu-chen-aggregation.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94
- PE-179 win-spread-total/2207-13191-gcn-win-prediction :: packages/prediction-engine/src/win-spread-total/2207-13191-gcn-win-prediction.ts :: wire packages/ingestion-pipeline/src/generate-signal-slate.ts:94

## MISSED BY CENSUS

- PE src modules with zero non-test importers: 431
- ... of which NOT named anywhere in the census: 307
- Example missed PE modules: packages/prediction-engine/src/automl/greedy-portfolio.ts, packages/prediction-engine/src/2601-15000v1-lineup-regularized-adjusted-plusminus-lrapm.ts, packages/prediction-engine/src/2608-28598-ohmicflow-forecasting-transit-passenger-flow.ts, packages/prediction-engine/src/2609-06005-price-dislocations-news-citations-and.ts, packages/prediction-engine/src/2410-09190v2-time-to-retrain-detecting-concept.ts, packages/prediction-engine/src/2411-15075v1-the-effects-of-major-league.ts, packages/prediction-engine/src/2512-11668v1-bridging-streaming-continual-learning-via.ts, packages/prediction-engine/src/ensemble/diversity-diagnostic.ts, packages/prediction-engine/src/ensemble/conflict-abstention.ts, packages/prediction-engine/src/ratings/target-pagerank.ts, packages/prediction-engine/src/2410-09068-modeling-and-prediction-of-the.ts, packages/prediction-engine/src/engine/market-odds-adapters.ts

## Coverage accounting

- census entries checked: 229 of 229
- entries with a production caller found: 58
- entries classified from direct file inspection: 200
- NOT verified: no vitest/tsc run (build verification owned elsewhere); no runtime execution; python callers
  counted from static imports only (subprocess/CLI invocation is invisible to this method); .worktrees ignored.
