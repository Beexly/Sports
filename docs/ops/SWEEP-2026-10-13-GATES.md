# SWEEP-2026-10-13 GATES: code-level wiring audit vs census 2026-10-12
Repo: C:/Users/Garrett/Sports  branch: fix/galaxy-odds-first-2026-10-08 (dirty, read-only sweep)
Census source: origin/motif/gate-census-2026-10-12:docs/gates/GATE_CENSUS_2026-10-12.json (sha 3c2d2b041)
Method: for each census entry, locate the code path(s) named in code_location, then search all non-test
production importers across apps/ packages/ workers/ plus all repo .py files (tests excluded).
Barrel re-exports do NOT count as wiring: packages/prediction-engine/src/index.ts is a pure re-export barrel.

## Counts per category (229 census entries checked)

- wired-live: 8
- landed-not-wired: 186
- quarantined: 4
- spec-only: 5
- not-found: 26
- unclear: 0

Census self-reported statuses for comparison: SPEC-ONLY 157, LANDED-NOT-WIRED 34, INFERRED-SPEC-QUARANTINE 24, WIRED-LIVE 14.

## Independent structural finding: prediction-engine barrel reachability

- PE src modules total (non-test .ts): 987
- Reachable from src/index.ts export graph: 515
- NOT reachable from the barrel at all (dead from every production entrypoint): 472
- Non-test production importers of any PE subpath file (not the barrel): 0
This means the 24 census 'landed-not-wired' PE modules sit on top of a much larger un-wired mass.

## Discrepancies vs census

### Census said WIRED-LIVE, code shows NO non-test production caller (13)

- G-01 FreshnessGate :: docs/research/2026-10-09/rating-atlas/minis/freshness_gate.py + docs/research/2026-10-09/rating-atlas/minis/api/freshness_gate.py (branch research/rat
- G-03 CollegeGuard :: docs/research/2026-10-09/rating-atlas/minis/live_board.py (branch research/rating-atlas-2026-10-09-packet)
- G-04 Signal Spine :: apps/web/lib/signals/spine.ts + apps/web/lib/fantasy/dfs-signals.ts (main)
- G-05 Contest-Shape Guard (adviseMode) :: apps/web/lib/fantasy/dfs-signals.ts (main)
- G-06 Per-Market Calibration Gate :: apps/web/lib/ops/per-market-gate.ts (main)
- G-10 Proper Scoring Gate :: packages/ingestion-pipeline/src/publish-guards-bridge.ts (evalReliability) (main)
- G-11 JEV 10K Correlated Monte Carlo Engine :: apps/web/lib/fantasy/dfs-correlation.ts (main)
- G-15 DFS Lineup Validation :: apps/web/lib/fantasy/dfs-lineup-validation.ts (main)
- G-16 Board Gate Rows (Honesty Mapping) :: apps/web/lib/board/gate-rows.ts + apps/web/lib/board/gate-consumer.ts (main)
- G-17 Live Board Honesty Labels :: docs/research/2026-10-09/rating-atlas/minis/live_board.py + docs/research/2026-10-09/rating-atlas/minis/api/live_board.py (branch research/rating-atla
- G-18 Kill Ledger :: docs/research/2026-10-09/rating-atlas/minis/kill_ledger.jsonl + rating-atlas/KILL_LEDGER.md + dfs/kill_ledger_freshness.jsonl (branch research/rating-
- G-19 GSE Score Honesty :: apps/web/lib/fantasy/gse-score.ts (main)
- G-20 Banned Language Filter (Board Output) :: docs/research/2026-10-09/rating-atlas/minis/live_board.py (branch research/rating-atlas-2026-10-09-packet)

### Census said SPEC-ONLY, code shows an executable module exists (151)

PE-001, PE-002, PE-003, PE-004, PE-005, PE-006, PE-007, PE-008, PE-013, PE-014, PE-015, PE-016, PE-021, PE-022, PE-023, PE-024, PE-025, PE-026, PE-027, PE-028, PE-029, PE-030, PE-031, PE-032, PE-033, PE-034, PE-035, PE-036, PE-041, PE-042, PE-043, PE-044, PE-045, PE-046, PE-047, PE-048, PE-065, PE-066, PE-067, PE-068, PE-069, PE-070, PE-071, PE-072, PE-073, PE-074, PE-075, PE-076, PE-077, PE-078, PE-079, PE-080, PE-081, PE-082, PE-083, PE-084, PE-085, PE-086, PE-087, PE-088, PE-089, PE-090, PE-091, PE-092, PE-093, PE-094, PE-095, PE-096, PE-097, PE-098, PE-099, PE-100, PE-101, PE-102, PE-103, PE-104, PE-105, PE-106, PE-107, PE-108, PE-109, PE-110, PE-111, PE-112, PE-113, PE-114, PE-115, PE-116, PE-117, PE-118, PE-119, PE-120, PE-121, PE-122, PE-123, PE-124, PE-125, PE-126, PE-127, PE-128, PE-129, PE-130, PE-131, PE-132, PE-133, PE-134, PE-135, PE-136, PE-137, PE-138, PE-139, PE-140, PE-141, PE-142, PE-143, PE-144, PE-145, PE-146, PE-147, PE-148, PE-149, PE-150, PE-151, PE-152, PE-153, PE-154, PE-155, PE-156, PE-157, PE-158, PE-159, PE-160, PE-161, PE-162, PE-163, PE-164, PE-165, PE-166, PE-167, PE-168, PE-169, PE-170, PE-171, PE-172, PE-173, PE-174, PE-175, PE-176, PE-177, PE-178, PE-179

### Census said WIRED-LIVE and a caller WAS found (1)

- G-09 Selective Abstention Gate (Chow/NP-style) :: packages/prediction-engine/src/certificate/index.ts

### Census named a path that does not exist in this workspace (26)

Reason for all: code_location is branch-scoped (see the '(branch ...)' suffix) or a LOCAL-inferred path; not present on the checked-out branch.

G-01(docs/research/2026-10-09/rating-atlas/minis/freshness_gate.p), G-03(docs/research/2026-10-09/rating-atlas/minis/live_board.py (b), G-12(NO CODE IN THIS REPO ? implementation on Garrett's Windows h), G-17(docs/research/2026-10-09/rating-atlas/minis/live_board.py + ), G-18(docs/research/2026-10-09/rating-atlas/minis/kill_ledger.json), G-20(docs/research/2026-10-09/rating-atlas/minis/live_board.py (b), LOCAL-1(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-2(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-3(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-4(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-5(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-6(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-7(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-8(~/workspace/gates/prediction_engine/prediction_engine_module), LOCAL-13(~/workspace/gse_gates_pe_13_16/pe_modules_13_16.py), LOCAL-14(~/workspace/gse_gates_pe_13_16/pe_modules_13_16.py), LOCAL-15(~/workspace/gse_gates_pe_13_16/pe_modules_13_16.py), LOCAL-16(~/workspace/gse_gates_pe_13_16/pe_modules_13_16.py), LOCAL-21(~/workspace/gates/prediction_engine/prediction_engine_gates.), LOCAL-22(~/workspace/gates/prediction_engine/prediction_engine_gates.), LOCAL-23(~/workspace/gates/prediction_engine/prediction_engine_gates.), LOCAL-24(~/workspace/gates/prediction_engine/prediction_engine_gates.), LOCAL-25(~/workspace/gates_staging/prediction_engine/idx25_boldness_r), LOCAL-26(~/workspace/gates_staging/prediction_engine/idx26_imagebind.), LOCAL-27(~/workspace/gates_staging/prediction_engine/idx27_transfer_l), LOCAL-28(~/workspace/gates_staging/prediction_engine/idx28_acl_injury)

## LANDED-NOT-WIRED list (insertion points)

All entries below have executable code and zero non-test production callers.

- G-04 Signal Spine :: apps/web/lib/signals/spine.ts
- G-05 Contest-Shape Guard (adviseMode) :: apps/web/lib/fantasy/dfs-signals.ts
- G-06 Per-Market Calibration Gate :: apps/web/lib/ops/per-market-gate.ts
- G-07 Prediction-Engine Acceptance Gates (179-module roll-up) :: ?
- G-08 Model Promotion Gate (Champion/Challenger) :: docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md
- G-10 Proper Scoring Gate :: packages/ingestion-pipeline/src/publish-guards-bridge.ts
- G-11 JEV 10K Correlated Monte Carlo Engine :: apps/web/lib/fantasy/dfs-correlation.ts
- G-15 DFS Lineup Validation :: apps/web/lib/fantasy/dfs-lineup-validation.ts
- G-16 Board Gate Rows (Honesty Mapping) :: apps/web/lib/board/gate-rows.ts
- G-19 GSE Score Honesty :: apps/web/lib/fantasy/gse-score.ts
- G-21 Age Gate :: apps/web/lib/auth/age-gate.ts
- G-22 CSRF Origin Guard :: apps/web/lib/auth/csrf-origin-guard.ts
- G-23 In-Play Guard :: packages/ingestion-pipeline/src/in-play-guard.ts
- G-24 Durable Write Guard :: packages/db/src/durable-write-guard.ts
- G-25 Numeric Guard :: apps/web/lib/claude-api/numeric-guard.ts
- G-26 Trust Gate :: scripts/guardrails/trust-gate.mjs
- PE-001 automl/2003-06505v1-autogluon-tabular-search :: packages/prediction-engine/src/automl/2003-06505v1-autogluon-tabular-search.ts
- PE-002 automl/2003-10865v2-async-hpo-service :: packages/prediction-engine/src/automl/2003-10865v2-async-hpo-service.ts
- PE-003 bayesian/1210-1016-dependent-bradley-terry :: packages/prediction-engine/src/bayesian/1210-1016-dependent-bradley-terry.ts
- PE-004 bayesian/1503-07642-ordinal-structure-select :: packages/prediction-engine/src/bayesian/1503-07642-ordinal-structure-select.ts
- PE-005 bayesian/1812-05170-hierarchical-ar1-shrinkage :: packages/prediction-engine/src/bayesian/1812-05170-hierarchical-ar1-shrinkage.ts
- PE-006 bayesian/1908-05745-nmf-target-archetypes :: packages/prediction-engine/src/bayesian/1908-05745-nmf-target-archetypes.ts
- PE-007 bayesian/1911-08138-sparse-form-hmm :: packages/prediction-engine/src/bayesian/1911-08138-sparse-form-hmm.ts
- PE-008 bayesian/1911-08791-three-module-score-factorization :: packages/prediction-engine/src/bayesian/1911-08791-three-module-score-factorization.ts
- PE-013 bayesian/2104-07537-dynamic-probit-vb :: packages/prediction-engine/src/bayesian/2104-07537-dynamic-probit-vb.ts
- PE-014 bayesian/2203-10706-dfs-monte-carlo-gamma :: packages/prediction-engine/src/bayesian/2203-10706-dfs-monte-carlo-gamma.ts
- PE-015 bayesian/2207-05114-wp-blender-beta-prior :: packages/prediction-engine/src/bayesian/2207-05114-wp-blender-beta-prior.ts
- PE-016 bayesian/2210-11010-efficient-vb-statespace :: packages/prediction-engine/src/bayesian/2210-11010-efficient-vb-statespace.ts
- PE-017 bayesian/2303-12401v2-hierarchical-live-probit :: packages/prediction-engine/src/bayesian/2303-12401v2-hierarchical-live-probit.ts
- PE-019 calibration/1905-07886-conformal-ncp-intervals :: packages/prediction-engine/src/calibration/1905-07886-conformal-ncp-intervals.ts
- PE-020 causal/1803-01422v2-notears-dag :: packages/prediction-engine/src/causal/1803-01422v2-notears-dag.ts
- PE-021 causal/2001-04197v4-rcd-quarantine-layer :: packages/prediction-engine/src/causal/2001-04197v4-rcd-quarantine-layer.ts
- PE-022 causal/2003-03685v2-pcmci-team-panel :: packages/prediction-engine/src/causal/2003-03685v2-pcmci-team-panel.ts
- PE-023 causal/2007-00267v1-regime-dependent-causal-discovery :: packages/prediction-engine/src/causal/2007-00267v1-regime-dependent-causal-discovery.ts
- PE-024 causal/2110-00637v4-ml4c-supervised-orienter :: packages/prediction-engine/src/causal/2110-00637v4-ml4c-supervised-orienter.ts
- PE-025 continual/1612-00796v2-ewc-feature-anchoring :: packages/prediction-engine/src/continual/1612-00796v2-ewc-feature-anchoring.ts
- PE-026 continual/1904-10644v1-certainty-weighted-continual-updates :: packages/prediction-engine/src/continual/1904-10644v1-certainty-weighted-continual-updates.ts
- PE-027 continual/2304-01239v1-teacher-student-continual :: packages/prediction-engine/src/continual/2304-01239v1-teacher-student-continual.ts
- PE-028 decision/0903-2910v1-ou-line-mean-reversion-sizing :: packages/prediction-engine/src/decision/0903-2910v1-ou-line-mean-reversion-sizing.ts
- PE-029 decision/1011-3177v3-data-replication-abstention :: packages/prediction-engine/src/decision/1011-3177v3-data-replication-abstention.ts
- PE-030 decision/1710-01787-kelly-saturation-hardening :: packages/prediction-engine/src/decision/1710-01787-kelly-saturation-hardening.ts
- PE-031 decision/1710-04818-drawdown-risk-frontier :: packages/prediction-engine/src/decision/1710-04818-drawdown-risk-frontier.ts
- PE-032 decision/1801-06737-bet-cadence-policy :: packages/prediction-engine/src/decision/1801-06737-bet-cadence-policy.ts
- PE-033 decision/1803-08355v2-structured-leg-abstention :: packages/prediction-engine/src/decision/1803-08355v2-structured-leg-abstention.ts
- PE-034 decision/1806-05293-multivariate-slate-sizer :: packages/prediction-engine/src/decision/1806-05293-multivariate-slate-sizer.ts
- PE-035 decision/1807-05265-dominance-screen :: packages/prediction-engine/src/decision/1807-05265-dominance-screen.ts
- PE-036 decision/1812-10371-robust-kelly-uncertainty-set :: packages/prediction-engine/src/decision/1812-10371-robust-kelly-uncertainty-set.ts
- PE-037 decision/1901-09192v4-selectivenet-selection-head :: packages/prediction-engine/src/decision/1901-09192v4-selectivenet-selection-head.ts
- PE-038 decision/1905-10964v2-dac-abstention-cleaning :: packages/prediction-engine/src/decision/1905-10964v2-dac-abstention-cleaning.ts
- PE-039 decision/1907-00208v2-gambler-reservation-filter :: packages/prediction-engine/src/decision/1907-00208v2-gambler-reservation-filter.ts
- PE-040 decision/1911-11253v1-hostile-market-abstain :: packages/prediction-engine/src/decision/1911-11253v1-hostile-market-abstain.ts
- PE-041 decision/2001-09097v1-gap-stat-ratings :: packages/prediction-engine/src/decision/2001-09097v1-gap-stat-ratings.ts
- PE-042 decision/2002-03448v1-levy-kelly-staking :: packages/prediction-engine/src/decision/2002-03448v1-levy-kelly-staking.ts
- PE-043 decision/2003-02743-temporal-correlation-kelly :: packages/prediction-engine/src/decision/2003-02743-temporal-correlation-kelly.ts
- PE-044 decision/2004-12099-kelly-kkt-certificate :: packages/prediction-engine/src/decision/2004-12099-kelly-kkt-certificate.ts
- PE-045 decision/2005-11698-fluctuation-frontier :: packages/prediction-engine/src/decision/2005-11698-fluctuation-frontier.ts
- PE-046 decision/2006-01862-expert-deferral-router :: packages/prediction-engine/src/decision/2006-01862-expert-deferral-router.ts
- PE-047 decision/2101-12523-sele-loss-gate :: packages/prediction-engine/src/decision/2101-12523-sele-loss-gate.ts
- PE-048 decision/2104-08236v1-totals-abstention-sigma :: packages/prediction-engine/src/decision/2104-08236v1-totals-abstention-sigma.ts
- PE-049 decision/2104-08281v1-cover-abstention-head :: packages/prediction-engine/src/decision/2104-08281v1-cover-abstention-head.ts
- PE-050 decision/2107-03090-risan-instance-abstention :: packages/prediction-engine/src/decision/2107-03090-risan-instance-abstention.ts
- PE-051 decision/2109-10814v1-variance-budgeted-kelly :: packages/prediction-engine/src/decision/2109-10814v1-variance-budgeted-kelly.ts
- PE-052 decision/2205-13532-training-disagreement-gate :: packages/prediction-engine/src/decision/2205-13532-training-disagreement-gate.ts
- PE-057 decision/2503-23782v1-regime-conditional-reject :: packages/prediction-engine/src/decision/2503-23782v1-regime-conditional-reject.ts
- PE-058 decision/2505-00724-crra-stake-dp :: packages/prediction-engine/src/decision/2505-00724-crra-stake-dp.ts
- PE-059 decision/2505-22422v2-star-bets-ci :: packages/prediction-engine/src/decision/2505-22422v2-star-bets-ci.ts
- PE-060 decision/2505-23437v2-baltor-selection :: packages/prediction-engine/src/decision/2505-23437v2-baltor-selection.ts
- PE-061 decision/2507-05994v1-kpup-allocation :: packages/prediction-engine/src/decision/2507-05994v1-kpup-allocation.ts
- PE-062 decision/2508-07556v2-instability-gate :: packages/prediction-engine/src/decision/2508-07556v2-instability-gate.ts
- PE-063 decision/2510-19672-committee-lcb :: packages/prediction-engine/src/decision/2510-19672-committee-lcb.ts
- PE-064 decision/2601-20452v1-whale-distortion :: packages/prediction-engine/src/decision/2601-20452v1-whale-distortion.ts
- PE-065 decision/2601-22570v1-memory-abstention :: packages/prediction-engine/src/decision/2601-22570v1-memory-abstention.ts
- PE-066 decision/2603-24704-evalue-screening :: packages/prediction-engine/src/decision/2603-24704-evalue-screening.ts
- PE-067 decision/2604-24723v2-multivariate-kelly :: packages/prediction-engine/src/decision/2604-24723v2-multivariate-kelly.ts
- PE-068 decision/2605-02611-lipschitz-forcing :: packages/prediction-engine/src/decision/2605-02611-lipschitz-forcing.ts
- PE-069 decision/2607-24875v1-hybrid-uncertainty :: packages/prediction-engine/src/decision/2607-24875v1-hybrid-uncertainty.ts
- PE-070 decision/2608-23393-kellyboost :: packages/prediction-engine/src/decision/2608-23393-kellyboost.ts
- PE-071 decision/2609-22632-perclass-gates :: packages/prediction-engine/src/decision/2609-22632-perclass-gates.ts
- PE-072 ensemble/1803-01984-bps-outcome-pools :: packages/prediction-engine/src/ensemble/1803-01984-bps-outcome-pools.ts
- PE-073 ensemble/2010-10435v1-time-varying-forecast-combination :: packages/prediction-engine/src/ensemble/2010-10435v1-time-varying-forecast-combination.ts
- PE-074 ensemble/2011-02077-factor-graphical-ensemble :: packages/prediction-engine/src/ensemble/2011-02077-factor-graphical-ensemble.ts
- PE-075 ensemble/2012-01643-diversity-weighted-combiner :: packages/prediction-engine/src/ensemble/2012-01643-diversity-weighted-combiner.ts
- PE-076 ensemble/2101-08954-hierarchical-stacking :: packages/prediction-engine/src/ensemble/2101-08954-hierarchical-stacking.ts
- PE-077 ensemble/2104-04918v2-weighted-quantile-combination :: packages/prediction-engine/src/ensemble/2104-04918v2-weighted-quantile-combination.ts
- PE-078 ensemble/2107-06268-smoothed-boa-ensemble :: packages/prediction-engine/src/ensemble/2107-06268-smoothed-boa-ensemble.ts
- PE-079 ensemble/2108-02082v3-regime-blender-febama :: packages/prediction-engine/src/ensemble/2108-02082v3-regime-blender-febama.ts
- PE-080 ensemble/2111-15365-weekly-boa-consensus :: packages/prediction-engine/src/ensemble/2111-15365-weekly-boa-consensus.ts
- PE-081 ensemble/2202-11834-beta-linear-pool :: packages/prediction-engine/src/ensemble/2202-11834-beta-linear-pool.ts
- PE-082 ensemble/2203-03279v3-fforma-fusion :: packages/prediction-engine/src/ensemble/2203-03279v3-fforma-fusion.ts
- PE-083 ensemble/2209-01697-regime-factor-glasso :: packages/prediction-engine/src/ensemble/2209-01697-regime-factor-glasso.ts
- PE-084 ensemble/2406-15760-icm-drift-monitor :: packages/prediction-engine/src/ensemble/2406-15760-icm-drift-monitor.ts
- PE-085 ensemble/2408-00785v4-kairosis-forecast-aggregation :: packages/prediction-engine/src/ensemble/2408-00785v4-kairosis-forecast-aggregation.ts
- PE-086 experimental/1601-04302v6-footballonomics-bootstrap :: packages/prediction-engine/src/experimental/1601-04302v6-footballonomics-bootstrap.ts
- PE-087 experimental/1708-02715v1-order-flow-resiliency :: packages/prediction-engine/src/experimental/1708-02715v1-order-flow-resiliency.ts
- PE-088 experimental/1804-04226v1-cfov-decomposition :: packages/prediction-engine/src/experimental/1804-04226v1-cfov-decomposition.ts
- PE-089 experimental/1805-01271v1-its-break-harness :: packages/prediction-engine/src/experimental/1805-01271v1-its-break-harness.ts
- PE-090 experimental/1811-03931v1-riskneutral-inplay-pricer :: packages/prediction-engine/src/experimental/1811-03931v1-riskneutral-inplay-pricer.ts
- PE-091 experimental/1905-03628v1-nested-poisson-totals :: packages/prediction-engine/src/experimental/1905-03628v1-nested-poisson-totals.ts
- PE-092 experimental/2006-04551v4-mimic-model-tree :: packages/prediction-engine/src/experimental/2006-04551v4-mimic-model-tree.ts
- PE-093 experimental/2101-10385v1-bandit-model-selector :: packages/prediction-engine/src/experimental/2101-10385v1-bandit-model-selector.ts
- PE-094 experimental/2103-04349v1-irl-situational-decisions :: packages/prediction-engine/src/experimental/2103-04349v1-irl-situational-decisions.ts
- PE-095 experimental/2106-05174v1-nested-zigp-simulation :: packages/prediction-engine/src/experimental/2106-05174v1-nested-zigp-simulation.ts
- PE-096 experimental/2108-00821v2-news-reaction-ssm :: packages/prediction-engine/src/experimental/2108-00821v2-news-reaction-ssm.ts
- PE-097 experimental/2109-06625v1-off-policy-coach-rl :: packages/prediction-engine/src/experimental/2109-06625v1-off-policy-coach-rl.ts
- PE-098 experimental/2206-01038v1-video-action-recognition-menu :: packages/prediction-engine/src/experimental/2206-01038v1-video-action-recognition-menu.ts
- PE-099 experimental/2206-09654v1-season-total-lstm-ensemble :: packages/prediction-engine/src/experimental/2206-09654v1-season-total-lstm-ensemble.ts
- PE-100 experimental/2206-11578v1-doubly-online-changepoint :: packages/prediction-engine/src/experimental/2206-11578v1-doubly-online-changepoint.ts
- PE-101 experimental/2209-07274v5-convexity-grid-war :: packages/prediction-engine/src/experimental/2209-07274v5-convexity-grid-war.ts
- PE-102 experimental/2211-04459v3-flexbart-tabular-learner :: packages/prediction-engine/src/experimental/2211-04459v3-flexbart-tabular-learner.ts
- PE-103 experimental/2308-02414v3-bivariate-ssm-skill-rating :: packages/prediction-engine/src/experimental/2308-02414v3-bivariate-ssm-skill-rating.ts
- PE-104 experimental/2402-01914v1-glmf-matchup-matrices :: packages/prediction-engine/src/experimental/2402-01914v1-glmf-matchup-matrices.ts
- PE-105 injuries/1705-03918-two-version-causal :: packages/prediction-engine/src/injuries/1705-03918-two-version-causal.ts
- PE-106 injuries/1710-08749v1-ppta-causal :: packages/prediction-engine/src/injuries/1710-08749v1-ppta-causal.ts
- PE-107 injuries/1801-07104-hot-hand-repetition :: packages/prediction-engine/src/injuries/1801-07104-hot-hand-repetition.ts
- PE-108 injuries/2009-06750-icing-causal-dag :: packages/prediction-engine/src/injuries/2009-06750-icing-causal-dag.ts
- PE-109 injuries/2011-11691-fourth-down-att-matching :: packages/prediction-engine/src/injuries/2011-11691-fourth-down-att-matching.ts
- PE-110 injuries/2108-08797-synthetic-pretraining-detector :: packages/prediction-engine/src/injuries/2108-08797-synthetic-pretraining-detector.ts
- PE-111 injuries/2202-08500-recurrent-competing-events :: packages/prediction-engine/src/injuries/2202-08500-recurrent-competing-events.ts
- PE-112 injuries/2205-07193v2-division-pair-hfa-causal :: packages/prediction-engine/src/injuries/2205-07193v2-division-pair-hfa-causal.ts
- PE-113 injuries/2305-14612-acl-risk-video-scoring :: packages/prediction-engine/src/injuries/2305-14612-acl-risk-video-scoring.ts
- PE-114 inplay/2103-04647-marked-point-process-live :: packages/prediction-engine/src/inplay/2103-04647-marked-point-process-live.ts
- PE-115 invention/1905-11481v2-ai-feynman-separability :: packages/prediction-engine/src/invention/1905-11481v2-ai-feynman-separability.ts
- PE-116 invention/1912-04871v4-risk-seeking-symreg :: packages/prediction-engine/src/invention/1912-04871v4-risk-seeking-symreg.ts
- PE-117 invention/2409-00629v2-dualmargin-bandit-experiment :: packages/prediction-engine/src/invention/2409-00629v2-dualmargin-bandit-experiment.ts
- PE-118 invention/2410-17238v1-sela-mcts :: packages/prediction-engine/src/invention/2410-17238v1-sela-mcts.ts
- PE-119 invention/2508-01285v2-biodisco-critic-stage :: packages/prediction-engine/src/invention/2508-01285v2-biodisco-critic-stage.ts
- PE-120 invention/2606-29823v1-experience-graph :: packages/prediction-engine/src/invention/2606-29823v1-experience-graph.ts
- PE-121 invention/2608-25770v2-hypoforge-split :: packages/prediction-engine/src/invention/2608-25770v2-hypoforge-split.ts
- PE-122 markets/1106-4509-ml-market-pooling :: packages/prediction-engine/src/markets/1106-4509-ml-market-pooling.ts
- PE-123 markets/1310-6998v1-twitter-volume-momentum :: packages/prediction-engine/src/markets/1310-6998v1-twitter-volume-momentum.ts
- PE-124 markets/1802-08848v1-odds-history-fusion :: packages/prediction-engine/src/markets/1802-08848v1-odds-history-fusion.ts
- PE-125 markets/1910-08858v2-spread-win-probability-table :: packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts
- PE-126 markets/2003-09384v2-static-theta-threshold-policy :: packages/prediction-engine/src/markets/2003-09384v2-static-theta-threshold-policy.ts
- PE-127 markets/2010-12508v1-decorrelation-penalty-loss :: packages/prediction-engine/src/markets/2010-12508v1-decorrelation-penalty-loss.ts
- PE-128 markets/2106-05799v1-hybrid-ability-xgboost :: packages/prediction-engine/src/markets/2106-05799v1-hybrid-ability-xgboost.ts
- PE-129 markets/2107-08827v1-fractional-kelly-sizing :: packages/prediction-engine/src/markets/2107-08827v1-fractional-kelly-sizing.ts
- PE-130 markets/2112-13001v3-dcp-prop-framework :: packages/prediction-engine/src/markets/2112-13001v3-dcp-prop-framework.ts
- PE-131 markets/2401-06086v1-imitation-inplay-betting :: packages/prediction-engine/src/markets/2401-06086v1-imitation-inplay-betting.ts
- PE-132 metalearning/1703-03400v3-maml-rookie-adapter :: packages/prediction-engine/src/metalearning/1703-03400v3-maml-rookie-adapter.ts
- PE-133 metalearning/1807-08912v2-alpaca-online-regression :: packages/prediction-engine/src/metalearning/1807-08912v2-alpaca-online-regression.ts
- PE-134 metalearning/1901-09890v1-meta-metric-librarian :: packages/prediction-engine/src/metalearning/1901-09890v1-meta-metric-librarian.ts
- PE-135 metalearning/2006-06707v2-metavrf-kernel-learning :: packages/prediction-engine/src/metalearning/2006-06707v2-metavrf-kernel-learning.ts
- PE-136 metalearning/2009-03228v3-gp-vib-meta-learning :: packages/prediction-engine/src/metalearning/2009-03228v3-gp-vib-meta-learning.ts
- PE-137 metalearning/2208-08135v1-uncertainty-weighted-metalearning :: packages/prediction-engine/src/metalearning/2208-08135v1-uncertainty-weighted-metalearning.ts
- PE-138 nlp/2010-00526v1-liveqa-nfl-benchmark :: packages/prediction-engine/src/nlp/2010-00526v1-liveqa-nfl-benchmark.ts
- PE-139 nlp/2211-04534v1-goal-nfl-retrieval :: packages/prediction-engine/src/nlp/2211-04534v1-goal-nfl-retrieval.ts
- PE-140 nlp/2401-01505v5-afa-tracking-qa :: packages/prediction-engine/src/nlp/2401-01505v5-afa-tracking-qa.ts
- PE-141 props-dfs/1505-01147v2-local-matrix-completion :: packages/prediction-engine/src/props-dfs/1505-01147v2-local-matrix-completion.ts
- PE-142 props-dfs/1909-12938v1-ts-forecast-dfs-optimizer :: packages/prediction-engine/src/props-dfs/1909-12938v1-ts-forecast-dfs-optimizer.ts
- PE-143 props-dfs/1912-10417v1-regime-switching-synergy-network :: packages/prediction-engine/src/props-dfs/1912-10417v1-regime-switching-synergy-network.ts
- PE-144 props-dfs/2003-01712v1-joi-stack-metric :: packages/prediction-engine/src/props-dfs/2003-01712v1-joi-stack-metric.ts
- PE-145 props-dfs/2004-08428v1-era-adjusted-features :: packages/prediction-engine/src/props-dfs/2004-08428v1-era-adjusted-features.ts
- PE-146 props-dfs/2005-07742-seam-matchup-shrinkage :: packages/prediction-engine/src/props-dfs/2005-07742-seam-matchup-shrinkage.ts
- PE-147 props-dfs/2006-07513-bayesian-shot-archetypes :: packages/prediction-engine/src/props-dfs/2006-07513-bayesian-shot-archetypes.ts
- PE-148 props-dfs/2009-01206v1-chalk-meter-contrarian :: packages/prediction-engine/src/props-dfs/2009-01206v1-chalk-meter-contrarian.ts
- PE-149 props-dfs/2112-07002-emax-duel-optimizer :: packages/prediction-engine/src/props-dfs/2112-07002-emax-duel-optimizer.ts
- PE-150 props-dfs/2212-11041v1-future-value-models :: packages/prediction-engine/src/props-dfs/2212-11041v1-future-value-models.ts
- PE-151 props-dfs/2302-13386-player2vec-embeddings :: packages/prediction-engine/src/props-dfs/2302-13386-player2vec-embeddings.ts
- PE-152 props-dfs/2303-04963v1-elite-lineup-order-stats :: packages/prediction-engine/src/props-dfs/2303-04963v1-elite-lineup-order-stats.ts
- PE-153 props-dfs/2407-13438-ems-gpp-portfolio :: packages/prediction-engine/src/props-dfs/2407-13438-ems-gpp-portfolio.ts
- PE-154 props-dfs/2407-17832-group-lasso-plus-minus :: packages/prediction-engine/src/props-dfs/2407-17832-group-lasso-plus-minus.ts
- PE-155 rl/1707-06887v1-distributional-slate-rl :: packages/prediction-engine/src/rl/1707-06887v1-distributional-slate-rl.ts
- PE-156 rl/1806-06923v2-iqn-critic :: packages/prediction-engine/src/rl/1806-06923v2-iqn-critic.ts
- PE-157 rl/1902-08102v2-expectile-critic :: packages/prediction-engine/src/rl/1902-08102v2-expectile-critic.ts
- PE-158 rl/2006-04779v2-cql-stake-policy :: packages/prediction-engine/src/rl/2006-04779v2-cql-stake-policy.ts
- PE-159 rl/2105-08877v2-c51-optimal-stopping :: packages/prediction-engine/src/rl/2105-08877v2-c51-optimal-stopping.ts
- PE-160 rl/2202-00769v1-sinkhorn-drl-staking :: packages/prediction-engine/src/rl/2202-00769v1-sinkhorn-drl-staking.ts
- PE-161 rl/2203-03003v1-offline-cql-staking :: packages/prediction-engine/src/rl/2203-03003v1-offline-cql-staking.ts
- PE-162 simulators/2306-00840v1-muzero-planning-audit :: packages/prediction-engine/src/simulators/2306-00840v1-muzero-planning-audit.ts
- PE-163 sizing/0803-1364v2-generalized-kelly-solver :: packages/prediction-engine/src/sizing/0803-1364v2-generalized-kelly-solver.ts
- PE-164 symreg/2006-10782v2-aifeynman-pareto-pruning :: packages/prediction-engine/src/symreg/2006-10782v2-aifeynman-pareto-pruning.ts
- PE-165 symreg/2312-11955v1-vertical-symbolic-regression :: packages/prediction-engine/src/symreg/2312-11955v1-vertical-symbolic-regression.ts
- PE-166 symreg/2401-00282v1-dgsr-lite-refinement :: packages/prediction-engine/src/symreg/2401-00282v1-dgsr-lite-refinement.ts
- PE-167 team-ratings/1109-2825v2-scoring-random-walk :: packages/prediction-engine/src/team-ratings/1109-2825v2-scoring-random-walk.ts
- PE-168 team-ratings/1403-7642-college-ranking-sensitivity :: packages/prediction-engine/src/team-ratings/1403-7642-college-ranking-sensitivity.ts
- PE-169 team-ratings/1609-01176v1-player-kernel-gp :: packages/prediction-engine/src/team-ratings/1609-01176v1-player-kernel-gp.ts
- PE-170 team-ratings/2010-11187-g-elo-margin-model :: packages/prediction-engine/src/team-ratings/2010-11187-g-elo-margin-model.ts
- PE-171 team-ratings/2207-12147v1-sparse-tvp-team-ratings :: packages/prediction-engine/src/team-ratings/2207-12147v1-sparse-tvp-team-ratings.ts
- PE-172 tracking/2012-11717v3-social-nce-trajectories :: packages/prediction-engine/src/tracking/2012-11717v3-social-nce-trajectories.ts
- PE-173 tracking/2305-02968v1-masked-trajectory-models :: packages/prediction-engine/src/tracking/2305-02968v1-masked-trajectory-models.ts
- PE-174 tracking/2407-20028v1-atscc-route-primitives :: packages/prediction-engine/src/tracking/2407-20028v1-atscc-route-primitives.ts
- PE-175 weather/2106-00175-stacked-live-wp-bakeoff :: packages/prediction-engine/src/weather/2106-00175-stacked-live-wp-bakeoff.ts
- PE-176 weather/2109-09287-stadium-factor-decomposition :: packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts
- PE-177 win-spread-total/1908-07372-sde-inplay-win-probability :: packages/prediction-engine/src/win-spread-total/1908-07372-sde-inplay-win-probability.ts
- PE-178 win-spread-total/2008-13005-budescu-chen-aggregation :: packages/prediction-engine/src/win-spread-total/2008-13005-budescu-chen-aggregation.ts
- PE-179 win-spread-total/2207-13191-gcn-win-prediction :: packages/prediction-engine/src/win-spread-total/2207-13191-gcn-win-prediction.ts
