# MIMO corpus digest (fast-path retry)

- Extraction reused as-is: `C:\Users\Garrett\AppData\Local\Temp\gse-extract\mimo\corpus-intelligence\briefs\` (clusters c01..c07, c07d). No re-extraction.
- Scope: every `*.md` under those cluster dirs EXCEPT `c03\r48\**` (already digested; skipped).
- Method: `rg --count-matches` only (never `grep -r`; no `for f in $(find ...)` sweep).
  - Signal pattern (a): `Brier|ECE|\bCLV\b|sample size|threshold|acceptance gate|ADOPT|REFUSE|REBUILD|n ?= ?[0-9]`
  - GSE-seam pattern (b): `GSE seam|GSE-seam|fail-closed|DataGap|founder-gated`
  - Score = 3*b + a, descending. Ties broken by a desc, then path.
- Coverage honesty: only the top 60 ranked files were fully read. The remaining files are covered by the ranking pass alone (counts only, no full read).
- Signal files: 1368 of 2543 in-scope files had >=1 match on either pattern; 1175 had zero matches on both (covered by census only).

## Pass 1 — ranking table (top 150 by score)

| rank | score (3b+a) | a (signal) | b (seam) | file |
|---:|---:|---:|---:|---|
| 1 | 51 | 51 | 0 | `c07d/c07d-d42/GATE-SPECS.brief.md` |
| 2 | 35 | 35 | 0 | `c07d/c07d-d54/2026-09-13-confidence-calibration-baseline.brief.md` |
| 3 | 35 | 29 | 2 | `c07d/c07d-d60/competitive-landscape-2026.brief.md` |
| 4 | 34 | 34 | 0 | `c07d/c07d-d38/RESEARCH_TO_PRODUCT_PLAYBOOK.brief.md` |
| 5 | 34 | 34 | 0 | `c04/c04-r12/docs__arxiv-program__research__2026-09-21__arxiv-deep__1520-ranking-approach-measuring-calibration.md.brief.md` |
| 6 | 33 | 33 | 0 | `c01/reader-48/AGENTS_history_main_2026_09_26.brief.md` |
| 7 | 31 | 31 | 0 | `c02/c02-r44/docs__ops__AGENTS-history-through-2026-09-24.md.brief.md` |
| 8 | 30 | 30 | 0 | `c02/c02-r45/docs__ops__CALIBRATION_ECE_ESTIMATOR_2026-09-09.brief.md` |
| 9 | 30 | 27 | 1 | `c06/d16/LAUNCH_FINISH_LINE_2026-09-05.brief.md` |
| 10 | 29 | 29 | 0 | `c07/c07-r27/2026-09-13-confidence-calibration-baseline.brief.md` |
| 11 | 29 | 29 | 0 | `c02/c02-r36/docs__dfs__research__2026-09-25__arxiv-deep__2607.00164-verifiable-rewards-calibrated-forecasting.md.brief.md` |
| 12 | 28 | 25 | 1 | `c04/c04-r65/strategy__RESEARCH_MAP.md.brief.md` |
| 13 | 27 | 27 | 0 | `c05/c05b-r18/two-labeled-bands.md.brief.md` |
| 14 | 26 | 20 | 2 | `c05/c05-r17/galaxy-sports-edge-research-audit.brief.md` |
| 15 | 24 | 24 | 0 | `c07d/c07d-d14/0691-verifiable-rewards-calibrated-probabilistic-forecasting.brief.md` |
| 16 | 23 | 23 | 0 | `c07d/c07d-d06/0290-machine-learning-for-sports-betting-should.brief.md` |
| 17 | 22 | 22 | 0 | `c05/c05b-r18/MODEL_PROMOTION_GATE_CONTRACT.md.brief.md` |
| 18 | 21 | 21 | 0 | `c07/c07-r07/0691-verifiable-rewards-calibrated-probabilistic-forecasting.brief.md` |
| 19 | 20 | 20 | 0 | `c07d/c07d-d48/MURPHY_RES_AND_BRIER_MIN.brief.md` |
| 20 | 20 | 20 | 0 | `c06/r06/0766-how-proper-scoring-rules-shape-llm.brief.md` |
| 21 | 20 | 20 | 0 | `c05/c05b-r22/CALIBRATION_PIPELINE.md.brief.md` |
| 22 | 20 | 20 | 0 | `c04/c04-r80/docs__calibration-proposals__2026-09-05-market-anchored-display-probability-v5.2.8.md.brief.md` |
| 23 | 20 | 11 | 3 | `c03/r39/docs__arxiv-program__research__2026-09-21__drive-deep__conformal-prediction-small-sample-calibration-audit.brief.md` |
| 24 | 19 | 19 | 0 | `c07d/c07d-d25/1648-trust-your-models-uncertainty-dataset-shift.brief.md` |
| 25 | 19 | 19 | 0 | `c05/c05b-r32/MARKET_CALIBRATION_2026-09-04.md.brief.md` |
| 26 | 19 | 16 | 1 | `c07/c07-r30/competitive-landscape-2026.brief.md` |
| 27 | 18 | 18 | 0 | `c07d/c07d-d36/CONVERGENT_CALIBRATION_EVIDENCE_2026-09-04.brief.md` |
| 28 | 18 | 18 | 0 | `c04/c04-r81/docs__data-sources__research__2026-09-24__live-database-intelligence-report.md.brief.md` |
| 29 | 18 | 18 | 0 | `c01/reader-23/1310-llm-soccerarena-benchmarking-llms-on-real-world.brief.md` |
| 30 | 18 | 15 | 1 | `c05/c05b-r30/opportunity-ledger.md.brief.md` |
| 31 | 18 | 15 | 1 | `c05/c05-r24/HANDOFF_2026-09-20_CLAUDE_SESSION.md.brief.md` |
| 32 | 18 | 9 | 3 | `c03/r39/docs__arxiv-program__research__2026-09-21__wiring__WIRING-PLAN.brief.md` |
| 33 | 17 | 17 | 0 | `c07/c07-r19/RESEARCH_TO_PRODUCT_PLAYBOOK.brief.md` |
| 34 | 17 | 17 | 0 | `c02/c02-r42/docs__gse-research-summary-2026-09-18.md.brief.md` |
| 35 | 16 | 16 | 0 | `c07d/c07d-d09/a-statistical-audit-of-physical-ai.brief.md` |
| 36 | 16 | 16 | 0 | `c03/r50/docs__ops__LEVERAGE_LOOP_2026-08-10.brief.md` |
| 37 | 16 | 16 | 0 | `c02/c02-r59/docs__strategy__PATH_TO_PROVEN_EDGE.md.brief.md` |
| 38 | 16 | 7 | 3 | `c05/c05-r17/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.brief.md` |
| 39 | 15 | 15 | 0 | `c07d/c07d-d48/LAUNCH_MAX_PATH_2026-08-09.brief.md` |
| 40 | 15 | 15 | 0 | `c07d/c07d-d46/CALIBRATION_UNCERTAINTY_STACK.brief.md` |
| 41 | 15 | 15 | 0 | `c07/c07-r03/0290-machine-learning-for-sports-betting-should.brief.md` |
| 42 | 15 | 15 | 0 | `c06/r04/0460-rethinking-evaluation-metric-for-probability-estimation.brief.md` |
| 43 | 15 | 15 | 0 | `c06/d03/NFL_REPLAY_CALIBRATION_2026-09-04.brief.md` |
| 44 | 15 | 15 | 0 | `c05/c05-r18/MARKET_CALIBRATION_2026-09-04.brief.md` |
| 45 | 15 | 15 | 0 | `c03/r56/docs__reasoning__week3-props.brief.md` |
| 46 | 15 | 15 | 0 | `c03/r42/docs__dfs__research__2026-09-25__arxiv-deep__2609.01337-leap-likelihood-elicitation-aggregation.brief.md` |
| 47 | 15 | 0 | 5 | `c07d/c07d-d58/RESCUE-2026-09-26-1-pr884-and-stragglers.brief.md` |
| 48 | 14 | 14 | 0 | `c03/r59/docs__strategy__PROOF_SPINE_INTEGRATION.brief.md` |
| 49 | 14 | 11 | 1 | `c03/r54/docs__path-to-70.brief.md` |
| 50 | 14 | 5 | 3 | `c07d/c07d-d43/overnight-audit-report.brief.md` |
| 51 | 14 | 5 | 3 | `c07/c07-r02/0116-governed-mcp-kernel-level-tool-governance.brief.md` |
| 52 | 13 | 13 | 0 | `c07d/c07d-d33/BUILD-QUEUE.brief.md` |
| 53 | 13 | 13 | 0 | `c06/r02/0279-bayesian-weighted-discretetime-dynamic-models-for.brief.md` |
| 54 | 13 | 13 | 0 | `c04/c04-r47/ops__CLAUDE_DECISIONS_20260902.md.brief.md` |
| 55 | 13 | 13 | 0 | `c03/r44/docs__fable__MODEL_CALIBRATION.brief.md` |
| 56 | 13 | 13 | 0 | `c01/reader-58/coding_agent_briefs.brief.md` |
| 57 | 13 | 7 | 2 | `c06/r25/FINAL_REPORT.brief.md` |
| 58 | 13 | 7 | 2 | `c02/c02-r35/docs__data__GRIND_WORK_ORDER.md.brief.md` |
| 59 | 13 | 4 | 3 | `c03/r47/docs__math__GSE_PROPRIETARY_METRIC_BIBLE.brief.md` |
| 60 | 13 | 1 | 4 | `c01/reader-40/CARDS_INCENTIVE_CALENDAR.brief.md` |
| 61 | 12 | 12 | 0 | `c07d/c07d-d17/1006-bounded-abstention-rate-binary.brief.md` |
| 62 | 12 | 12 | 0 | `c02/c02-r52/docs__ops__hermes__CONTINUOUS.md.brief.md` |
| 63 | 12 | 12 | 0 | `c01/reader-48/CHAOS_CAMPAIGN_2026_09_04.brief.md` |
| 64 | 12 | 9 | 1 | `c03/r56/docs__reasoning__morning-2026-09-27.brief.md` |
| 65 | 12 | 6 | 2 | `c07d/c07d-d04/0116-governed-mcp-kernel-level-tool-governance.brief.md` |
| 66 | 12 | 6 | 2 | `c03/r42/docs__dfs__research__2026-09-25__youtube-builder-research__handoff-video-model-builds-v3-fullspec-2026-09-25.brief.md` |
| 67 | 12 | 3 | 3 | `c05/c05-r18/CARDS_SHARE_CORE_WIRING.brief.md` |
| 68 | 12 | 3 | 3 | `c01/reader-42/2605_23597_structure_guided_entity_resolution.brief.md` |
| 69 | 11 | 11 | 0 | `c07d/c07d-d50/autonomous-operating-system.brief.md` |
| 70 | 11 | 11 | 0 | `c07d/c07d-d22/1461-beyond-winning-margin-of-victory-relative.brief.md` |
| 71 | 11 | 11 | 0 | `c07d/c07d-d19/1140-fancric-multi-agent-fantasy-cricket.brief.md` |
| 72 | 11 | 11 | 0 | `c07d/c07d-d10/0501-statistical-enhanced-learning-for-modeling-and.brief.md` |
| 73 | 11 | 11 | 0 | `c07d/c07d-d01/hermes-final-pass-2026-09-10.brief.md` |
| 74 | 11 | 11 | 0 | `c07/c07-r13/1648-trust-your-models-uncertainty-dataset-shift.brief.md` |
| 75 | 11 | 11 | 0 | `c06/d23/ngs-st-pace.brief.md` |
| 76 | 11 | 11 | 0 | `c05/c05b-r28/prop-prompt-pack.md.brief.md` |
| 77 | 11 | 11 | 0 | `c05/c05b-r26/2026-08-19-edge-roadmap.md.brief.md` |
| 78 | 11 | 11 | 0 | `c03/r57/research__2026-09-24__keenum-target-splits.brief.md` |
| 79 | 11 | 11 | 0 | `c03/r26/docs__arxiv-program__research__2026-09-21__arxiv-deep__1519-edge-directed-calibration-test.brief.md` |
| 80 | 11 | 11 | 0 | `c01/reader-49/hermes_night_log_2026_09_04.brief.md` |
| 81 | 11 | 8 | 1 | `c03/r42/docs__dfs__research__2026-09-25__model-process-checklist.brief.md` |
| 82 | 10 | 10 | 0 | `c07d/c07d-d49/SAMPLE_N_VS_MAP_N.brief.md` |
| 83 | 10 | 10 | 0 | `c07d/c07d-d49/PROVEN_PATH_HONEST_2026-08-09.brief.md` |
| 84 | 10 | 10 | 0 | `c07d/c07d-d46/CLOSEOUT_ALL_LEVERS_2026-08-10.brief.md` |
| 85 | 10 | 10 | 0 | `c07d/c07d-d11/0531-isotonic-bradleyterry-model-for-paired-comparison.brief.md` |
| 86 | 10 | 10 | 0 | `c06/d15/INDEPENDENT_TRUEPROB_BACKFILL_AND_CALIBRATION.brief.md` |
| 87 | 10 | 10 | 0 | `c06/c01/1480-local-temperature-scaling-for-probability.brief.md` |
| 88 | 10 | 10 | 0 | `c05/c05b-r02/0001-profit-bias-identity.md.brief.md` |
| 89 | 10 | 10 | 0 | `c03/r58/docs__research__session-handoff-2026-09-12.brief.md` |
| 90 | 10 | 10 | 0 | `c03/r55/docs__reasoning__REDTEAM-AUDIT-2026-09-27.brief.md` |
| 91 | 10 | 10 | 0 | `c03/r49/docs__ops__COMPLETED_UNITS.brief.md` |
| 92 | 10 | 10 | 0 | `c03/r26/docs__arxiv-program__research__2026-09-21__arxiv-deep__1542-bayesian-estimation-of-in-game-home-team.brief.md` |
| 93 | 10 | 10 | 0 | `c01/reader-48/COMPETITIVE_DOCTRINE.brief.md` |
| 94 | 10 | 10 | 0 | `c01/reader-19/1074_binary_classifier_calibration_enir.brief.md` |
| 95 | 10 | 7 | 1 | `c06/r16/world-class-sports-probability-engine-corpus-audit.brief.md` |
| 96 | 10 | 7 | 1 | `c05/c05b-r21/2026-08-21-master-research-build-charter.md.brief.md` |
| 97 | 10 | 7 | 1 | `c01/reader-47/gse_expected_metrics.brief.md` |
| 98 | 10 | 4 | 2 | `c07d/c07d-d01/nova_convergence_freeze_2026-07-22.brief.md` |
| 99 | 10 | 4 | 2 | `c02/c02-r32/docs__arxiv-program__research__2026-09-21__drive-deep__architectural-blueprint-calibrated-tracking-decoupled-engine.md.brief.md` |
| 100 | 10 | 1 | 3 | `c07d/c07d-d52/2026-08-19-odds-widget-integration-design.brief.md` |
| 101 | 10 | 1 | 3 | `c07/c07-r22/overnight-audit-report.brief.md` |
| 102 | 9 | 9 | 0 | `c07d/c07d-d46/EVIDENCE_PACK_RANKING_TEMPLATE.brief.md` |
| 103 | 9 | 9 | 0 | `c07d/c07d-d27/1775-optimal-strategies-reject-option-classifiers.brief.md` |
| 104 | 9 | 9 | 0 | `c07d/c07d-d23/1523-enforcing-tail-calibration.brief.md` |
| 105 | 9 | 9 | 0 | `c07d/c07d-d14/0723-on-calibration-of-modern-neural-networks.brief.md` |
| 106 | 9 | 9 | 0 | `c07d/c07d-d13/0643-bettors-reaction-match-dynamics-evidence.brief.md` |
| 107 | 9 | 9 | 0 | `c07d/c07d-d10/0471-more-on-verification-of-probability-forecasts.brief.md` |
| 108 | 9 | 9 | 0 | `c07/c07-r23/CALIBRATION_UNCERTAINTY_STACK.brief.md` |
| 109 | 9 | 9 | 0 | `c06/d02/CFB_SOURCE_DECISION_2026-09-04.brief.md` |
| 110 | 9 | 9 | 0 | `c06/c01/1732-when-do-prophets-profit-prediction-markets.brief.md` |
| 111 | 9 | 9 | 0 | `c06/c01/1079-calibration-vs-accuracy-sports-betting.brief.md` |
| 112 | 9 | 9 | 0 | `c03/r29/docs__arxiv-program__research__2026-09-21__arxiv-deep__1693-linear-acceleration-concussion-risk.brief.md` |
| 113 | 9 | 9 | 0 | `c03/r01/docs__architecture__ADVANCED_SYSTEMS_SPINE_2026-06-22.brief.md` |
| 114 | 9 | 9 | 0 | `c02/c02-r51/docs__ops__edge__2026-08-19-deepseek-adversary-round2.md.brief.md` |
| 115 | 9 | 9 | 0 | `c02/c02-r50/docs__ops__archive__root-museum__COMPETITIVE_INTELLIGENCE.md.brief.md` |
| 116 | 9 | 9 | 0 | `c02/c02-r24/docs__arxiv-program__research__2026-09-21__arxiv-deep__1656-bayesian-nba-in-game-win-probability.md.brief.md` |
| 117 | 9 | 9 | 0 | `c02/c02-r01/docs__architecture__2026-09-18-signal-architecture.md.brief.md` |
| 118 | 9 | 9 | 0 | `c01/reader-56/parent_still_moves_20260926.brief.md` |
| 119 | 9 | 9 | 0 | `c01/reader-52/clv_slices_results_2026_08_19.brief.md` |
| 120 | 9 | 9 | 0 | `c01/reader-46/half_life_and_band_calibration.brief.md` |
| 121 | 9 | 9 | 0 | `c01/reader-39/2026_08_10_closeout_v5_2_6.brief.md` |
| 122 | 9 | 9 | 0 | `c01/reader-11/1310_llm_soccerarena_benchmarking_llms_on_real_world.brief.md` |
| 123 | 9 | 6 | 1 | `c03/r49/docs__ops__GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.brief.md` |
| 124 | 9 | 3 | 2 | `c03/r53/docs__ops__hermes__FINAL-RUN-2026-08-20.brief.md` |
| 125 | 9 | 3 | 2 | `c02/c02-r32/docs__arxiv-program__research__2026-09-21__wiring__IMPLEMENTED.md.brief.md` |
| 126 | 9 | 0 | 3 | `c07d/c07d-d52/blog-generation-parse-error.brief.md` |
| 127 | 9 | 0 | 3 | `c07/c07-r29/RESCUE-2026-09-26-1-pr884-and-stragglers.brief.md` |
| 128 | 9 | 0 | 3 | `c04/c04-r82/docs__design__2026-09-19-independent-fair-value-registry.md.brief.md` |
| 129 | 8 | 8 | 0 | `c07d/c07d-d50/zk-proof-evolution-roadmap.brief.md` |
| 130 | 8 | 8 | 0 | `c07d/c07d-d37/dfs-week3-pool-notes.brief.md` |
| 131 | 8 | 8 | 0 | `c07d/c07d-d28/1882-early-concept-drift-detection-via-prediction.brief.md` |
| 132 | 8 | 8 | 0 | `c07d/c07d-d14/0701-distributional-regression-reject-option.brief.md` |
| 133 | 8 | 8 | 0 | `c07/c07-r24/MURPHY_RES_AND_BRIER_MIN.brief.md` |
| 134 | 8 | 8 | 0 | `c07/c07-r05/0501-statistical-enhanced-learning-for-modeling-and.brief.md` |
| 135 | 8 | 8 | 0 | `c07/c07-r01/hermes-final-pass-2026-09-10.brief.md` |
| 136 | 8 | 8 | 0 | `c06/r19/HONEST_CEPT.brief.md` |
| 137 | 8 | 8 | 0 | `c06/r14/2008-conbatch-bal-batch-bayesian-active-learning.brief.md` |
| 138 | 8 | 8 | 0 | `c06/r06/0700-dual-threshold-conformal-abstention.brief.md` |
| 139 | 8 | 8 | 0 | `c06/d18/OVERNIGHT-2026-08-19.brief.md` |
| 140 | 8 | 8 | 0 | `c06/c00/0885-predicting-outcomes-redefining-winning.brief.md` |
| 141 | 8 | 8 | 0 | `c05/c05b-r31/2026-09-17-advanced-analytics-landscape.md.brief.md` |
| 142 | 8 | 8 | 0 | `c05/c05b-r24/GROK_BUILD_MASTER_PROMPT_NEXT.md.brief.md` |
| 143 | 8 | 8 | 0 | `c05/c05b-r21/BRUTAL_AUDIT_2026-07-29.md.brief.md` |
| 144 | 8 | 8 | 0 | `c04/c04-r62/research__2026-09-28__orchestration__full-orchestration.md.brief.md` |
| 145 | 8 | 8 | 0 | `c04/c04-r47/ops__BRIER_OPTIMIZATION_TECHNIQUES.md.brief.md` |
| 146 | 8 | 8 | 0 | `c03/r57/research__2026-09-21__arxiv-program__phase2__quarantined__1029-node-classification-integrated-reject-option.brief.md` |
| 147 | 8 | 8 | 0 | `c03/r54/docs__ops__hermes__l16-book-microstructure__RESULTS.brief.md` |
| 148 | 8 | 8 | 0 | `c03/r41/docs__data__CARDS_PROOF_LADDER.brief.md` |
| 149 | 8 | 8 | 0 | `c02/c02-r57/docs__research__2026-09-28__orchestration__coding-agent-handoff.md.brief.md` |
| 150 | 8 | 8 | 0 | `c02/c02-r45/docs__ops__CURRENT_STATE.brief.md` |

## Pass 2 — top-60 full-read digest (one row per file)

| rank | file | paper/subject | method (1 line) | strongest numeric result (verbatim) | GSE seam (or "none stated") | disposition |
|---:|---|---|---|---|---|---|
| 1 | `c07d/c07d-d42/GATE-SPECS.brief.md` | Transcription of acceptance gates in JSDoc headers of 179 prediction-engine modules (23 families) | Headers-only read of first ~30-80 lines per module; no code run, no tests | "179 gates specified: 116 `NOT EVALUATED`, 63 "gate stated, no status line", 0 `NO GATE STATED`" | none stated (evaluation gap, not a seam) | QUEUED-BUILDABLE |
| 2 | `c07d/c07d-d54/2026-09-13-confidence-calibration-baseline.brief.md` | "Before" calibration baseline for v5.3.0 rebuild, 2,641 settled picks | Bucketed realized win rate by confidence + temporal-split fitted book-path calibrator (logistic on confidence+sport+market wins) | "book confidence 50 → 0.449; book confidence 100 → 0.536" with test log-loss 0.6678 | none stated | QUEUED-BUILDABLE |
| 3 | `c07d/c07d-d60/competitive-landscape-2026.brief.md` | 2026 competitive teardown (touts, +EV tools, AI sites, trackers); CLV as only sharp-accepted benchmark | Competitor inventory + capability-vs-competitor table; market close as calibration baseline | "market closing line at Brier 0.2111, ECE 0.0180 over 5,281 games" | founder-gated `assessEdge`; gated CLV report ("no number shown until defensible") | QUEUED-RESEARCH |
| 4 | `c07d/c07d-d38/RESEARCH_TO_PRODUCT_PLAYBOOK.brief.md` | Synthesis of 750-paper arXiv program into ranked method transfers + P0-P5 execution order | Ledger synthesis with numeric acceptance gates per transfer; frozen holdout E1/E2/E3 pre-registered | "BEAT_CLOSE 23.2% (Wilson ~0.212–0.253) vs bar 52.4%" | none stated | QUEUED-BUILDABLE |
| 5 | `c04/c04-r12/...1520-ranking-approach-measuring-calibration.md.brief.md` | Ledger of arXiv:2609.13100 (Chatterjee & Barber 2026), rankECE tuning-free calibration estimator | Closed-form concentration bounds + asymptotic martingale-CLT miscalibration test on sorted residual pairs | "rankECE tests run in ~0.02–0.03 ms vs. SKCE-U's 3–60 ms (MacBook Pro M4)" | none stated | QUEUED-BUILDABLE |
| 6 | `c01/reader-48/AGENTS_history_main_2026_09_26.brief.md` | Frozen 2026-09-26 AGENTS.md snapshot: pick-pipeline audits, analytics catalog, lab NFL numbers | Production-ledger audit: replay corpus (6,967 games), bucketed calibration, metric CSV inventory | "Confidence AUC 0.4965 (p=0.41, n=13,646); live >=80 tail 152 graded, 61 wins, 40%, INVERTED" | none stated | QUEUED-BUILDABLE |
| 7 | `c02/c02-r44/...AGENTS-history-through-2026-09-24.md.brief.md` | Frozen AGENTS.md operations ledger 2026-08-21→09-24 (4,233 lines) | Same production numbers as rank 6, earlier cut; adverse-edge gate + PROVEN gate history | "conf 80+ claims 0.8663, realizes 0.5191, gap −0.3472, z=−10.7; Brier of the conf band as a probability = 0.3617" | fail-closed not named; conviction gate may only WITHHOLD | DUPLICATE (rank 6 covers it; earlier snapshot of same ledger) |
| 8 | `c02/c02-r45/...CALIBRATION_ECE_ESTIMATOR_2026-09-09.brief.md` | Calibration-gate postmortem: raw binned-ECE finite-sample bias + 3 sample bugs | Null-ECE simulation (Beta forecasts, 400 reps) → per-bin variance-corrected debiased ECE | "n=100 → 0.080-0.096; n=487 → 0.039-0.043" null ECE under perfect calibration | none stated | QUEUED-BUILDABLE |
| 9 | `c06/d16/LAUNCH_FINISH_LINE_2026-09-05.brief.md` | Pre-NFL-kickoff production audit; v5.2.8 market-anchored calibration decision | Observed-state table + 60 work packages; market-anchored p replaces confidence-as-probability | "non-soccer moneylines: n 115, Brier 0.1444, ECE 0.0440 ... all floors met" | fail-closed named once (FPI rights-gated); free-path CLOSE stamps | QUEUED-BUILDABLE |
| 10 | `c07/c07-r27/2026-09-13-confidence-calibration-baseline.brief.md` | Same "before" calibration baseline as rank 2 (cluster c07 copy) | Same bucketed method + flat fitted mapping | "book confidence 50 → 0.449, 100 → 0.536 — a "100" book pick is a ~54% proposition" | none stated | DUPLICATE (rank 2 covers it) |
| 11 | `c02/c02-r36/...2607.00164-verifiable-rewards-calibrated-forecasting.md.brief.md` | Full-paper ledger on arXiv 2607.00164 (RLVR calibrated NFL in-game win probabilities) | GRPO with denoised rate reward r=1−(p−p̂(x))² vs outcome reward; 40,246 train states, market as withheld ceiling | "empirical-rate reward 0.154 / 0.050" vs "realized-outcome reward Brier 0.166 / ECE 0.10" (in-training held-out n=128) | none stated | QUEUED-BUILDABLE |
| 12 | `c04/c04-r65/strategy__RESEARCH_MAP.md.brief.md` | 190-line master index of repo built-vs-doctrine state across 12 domains (2026-06-22, 572 docs) | 12-agent doc sweep mapped to REAL/enforced vs doctrine-only; Phase 1–3 proven-edge sequence | "Production DB verification: nothing has ever been verified against a live production DB" | clearance-engine `checkClearance()` 14 checks; banned-phrase CI | QUEUED-RESEARCH |
| 13 | `c05/c05b-r18/two-labeled-bands.md.brief.md` | Measurement report proving shipped fantasy variance-band z values wrong; replaced with measured z | EB shrinkage + walk-forward (fit 2021-2024 w1-3, eval 2025 w4-18); coverage measured on n=155 | "68% → z = 0.806 (mean width +/-62%, measured coverage 68.0%); 90% → z = 1.113 (mean width +/-86%, measured coverage 90.0%)" | none stated | QUEUED-BUILDABLE |
| 14 | `c05/c05-r17/galaxy-sports-edge-research-audit.brief.md` | 1,126-line deep read: arXiv corpus quality audit + GSE launch-readiness audit | Launch Readiness Index Σw·S over 8 dims; dual CLV reporting contract | "Composite = 2.40+4.20+6.30+0.00+2.50+3.40+2.00+8.20 = 29.00" with "DO NOT OPEN verdict on the customer board" | fail-closed conformal rule ("if n < ⌈1/α⌉ − 1 → No-Bet/abstain") | QUEUED-RESEARCH |
| 15 | `c07d/c07d-d14/0691-verifiable-rewards-calibrated-probabilistic-forecasting.brief.md` | Read-and-ledger of Singh/Reddy/Chopra 2026 RLVR calibrated forecasting (same paper as rank 11) | Same rate-reward method; ADAPT verdict, LLM machinery not transferred | "Direct RLVR Brier 0.1443 [0.1394, 0.1491], ECE 0.0292" vs "Market: 0.1355 [0.1307, 0.1403], ECE 0.0273" (test 2024 n=5,185) | none stated | DUPLICATE (rank 11 covers it; c07 copy of same ledger) |
| 16 | `c07d/c07d-d06/0290-machine-learning-for-sports-betting-should.brief.md` | Walsh & Joshi 2024: identical NBA pipelines differing ONLY in selection metric (accuracy vs classwise-ECE) | Two-branch SFS+BO-TPE bake-off; bet every value bet at fixed $100 or eighth-Kelly from $10,000 | "calibration-driven SVM — 87.55% of games bet, 38.8% bets won ... average ROI 34.69%. Accuracy-driven SVM ... average ROI −35.17%" | none stated | QUEUED-BUILDABLE |
| 17 | `c05/c05b-r18/MODEL_PROMOTION_GATE_CONTRACT.md.brief.md` | Frozen 3-leg model promotion gate inverting the DEC-062 fake-promoter failure | Paired Brier empirical-Bernstein LCB (leg 1) + CLV Welch non-inferiority ε=5bps (leg 2) + procedural integrity (leg 3) | "δ_prac = 0.002 Brier points; N_min = 500 paired events; coverageFloor = 0.95; ε = 5 bps CLV margin" | row corruption rejected not filtered; founder gate | QUEUED-BUILDABLE |
| 18 | `c07/c07-r07/0691-verifiable-rewards-calibrated-probabilistic-forecasting.brief.md` | Same 2607.00164 ledger (cluster c07 copy) | Same empirical-rate-teacher method | "All three static estimators (direct, DeepSeek-V4, teacher) converge ≈0.143–0.144 and trail the market by the same 0.008" | none stated | DUPLICATE (rank 11 covers it; c07 copy of same ledger) |
| 19 | `c07d/c07d-d48/MURPHY_RES_AND_BRIER_MIN.brief.md` | Founder explainer: Brier + Murphy decomposition with live values and RES-first plan | 10-bin Murphy diagnostic on settled picks; back-of-envelope RES target from Brier floor | "to hit Brier ≤ 0.22 you need roughly RES ≳ 0.03 (order of magnitude) — ~15× live 0.002" | none stated | QUEUED-BUILDABLE |
| 20 | `c06/r06/0766-how-proper-scoring-rules-shape-llm.brief.md` | Turtel et al. 2026: GPT-OSS-120b trained with 5 proper scoring rules as terminal rewards (8,041 news-event questions) | Rank-32 LoRA Dr.GRPO per-rule; BIN decomposition + 2,000-resample bootstrap CIs | "Log — Brier 0.1653***, ECE 0.0434 (best) ... Brier — 0.1648*** (best Brier) ... AUC 0.7511 (best)" | none stated | QUEUED-RESEARCH |
| 21 | `c05/c05b-r22/CALIBRATION_PIPELINE.md.brief.md` | R&D-only settled-picks → calibration → fractional/portfolio Kelly pipeline doc | Time hold-out → CenteredIsotonic (CIR) → selected-slice ECE → CLV-deflator-gated Kelly; live scoring gated | "CLV deflator floor: stakes zeroed until ~50 settled CLV samples" | Polymarket compliance hold (not a calibration target) | QUEUED-BUILDABLE |
| 22 | `c04/c04-r80/...market-anchored-display-probability-v5.2.8.md.brief.md` | 2026-09-05 design proposal: market-anchored number as only honest public win probability | Proportional de-vig vs Shin head-to-head on paired Brier; isotonic-limit argument from non-monotone confidence | "Shin vs proportional head-to-head (n 621): ALL paired Brier diff +0.002151 (t = 1.798)" — not significant, Shin rejected | receipt method tag `proportional_devig_v1`; confidence never shown as percent | QUEUED-BUILDABLE |
| 23 | `c03/r39/...conformal-prediction-small-sample-calibration-audit.brief.md` | Audit report: conformal prediction + small-sample calibration doctrine ("eliminate fake tightness") | CQR/Jackknife+/split-conformal formulas + n=5 hand computation forcing +Infinity/No-Bet | "rank k = ceil(6*0.90) = 6 > n=5 → quantile at level >1.0 is +infinity → must refuse/No-Bet; minimum n for alpha=0.1 is ceil(1/alpha)−1 = 9" | fail-closed scarce-segment policy; Venn-Abers width 0.20 gate; ECE 0.05 gate | QUEUED-BUILDABLE |
| 24 | `c07d/c07d-d25/1648-trust-your-models-uncertainty-dataset-shift.brief.md` | NeurIPS 2019 benchmark of uncertainty methods under dataset shift (temp scaling fails, ensembles win) | Cross-modal shift-intensity sweep of Brier/NLL/ECE for vanilla vs temp-scaling vs dropout vs ensembles vs SVI | "on Criteo temperature scaling has a WORSE Brier score than vanilla — post-hoc calibration on the validation set actually HARMS calibration under dataset shift" | none stated | QUEUED-BUILDABLE |
| 25 | `c05/c05b-r32/MARKET_CALIBRATION_2026-09-04.md.brief.md` | Walk-forward study: de-vigged closing NFL moneylines vs home-win outcomes, 5,281 games 2006–2025 | Train≤N→eval-N+1 walk-forward; isotonic/Platt/beta vs identity on held-out ΔBrier | "Calibrator comparison, mean held-out ΔBrier across 10 folds: isotonic +0.00007, Platt −0.00003, beta −0.00014" — "The closing line is already the calibration" | none stated | QUEUED-BUILDABLE |
| 26 | `c07/c07-r30/competitive-landscape-2026.brief.md` | Same competitive teardown as rank 3 (cluster c07 copy) | Same segment analysis + shipped-since-teardown list | "Reported market calibration baseline: Brier 0.2111, ECE 0.0180 over 5,281 games (closing line as predictor)" | founder-gated `assessEdge` | DUPLICATE (rank 3 covers it) |
| 27 | `c07d/c07d-d36/CONVERGENT_CALIBRATION_EVIDENCE_2026-09-04.brief.md` | Three independent measurements converging: confidence score has no resolution, ≥80 tier inverted | Tail win-rate vs claimed + Brier resolution term + replay AUC with permutation p | "152 graded picks at confidence ≥80, live production, read 2026-09-02 → 61 wins = 40.13% vs mean claimed 86% (inverted)" | hard floors Brier ≤0.22 / ECE ≤0.05; surfaces closed | QUEUED-BUILDABLE |
| 28 | `c04/c04-r81/...live-database-intelligence-report.md.brief.md` | Read-only snapshot of live Neon Postgres: table scale, live calibration (3,263 graded), wiring queue | Table census + by-type/sport/model win splits + signal-coverage gaps | "By pick type: MONEYLINE 66.6% (n=1,162, weight 1.22, BOOST); SPREAD 47.2% (n=1,076, weight 0.86, SHRINK)" | none stated | QUEUED-BUILDABLE |
| 29 | `c01/reader-23/1310-llm-soccerarena-benchmarking-llms-on-real-world.brief.md` | Ledger on Schröder et al. 2026 LLM-SoccerArena: prospective 7-LLM World Cup forecasting protocol | 8,736 match forecasts scored Brier/log-loss vs de-vigged market with sign-flip permutation tests | "Open-book T−2h vs de-vigged closing market: Gemini Brier 0.497 vs market 0.498 — essentially market-equal" | none stated | QUEUED-RESEARCH |
| 30 | `c05/c05b-r30/opportunity-ledger.md.brief.md` | 2026-06-03 Master Opportunity Ledger: cross-area ADOPT/EXPERIMENT/GATED/SKIP sweep + 11 blind spots | Exhaustive tiered sourcing/tooling/viz/SEO/growth/monetization tagging with honesty doctrine | "GDELT 2.0 tone updates every 15 min, free, no key — the fastest free sentiment signal named" | per-prediction provenance stamps; freshness SLAs; 2 leaked keys owed rotation | QUEUED-RESEARCH |
| 31 | `c05/c05-r24/HANDOFF_2026-09-20_CLAUDE_SESSION.md.brief.md` | Zero-context handoff from 2026-09-20 session: measured production state, 5 non-bug "traps", 4 ranked priorities | Live endpoint measurement (gates GREEN n=527); publish-deadlock diagnosis; CLV denominator correction | "graded 1677 = beat 393 / matched 720 / lost 564 ... published raw 393/1677 = 0.2343, decided-only 393/957 = 0.4107" | CLV floor `VIG_BREAK_EVEN = 0.524` never moves; 18h fail-closed fixture matcher | QUEUED-BUILDABLE |
| 32 | `c03/r39/...wiring__WIRING-PLAN.brief.md` | Additive-only reconciliation of all wiring plans into W-1/W-2/W-3 modules + 12 NGS lab projects | Quantile-isotonize / SCRPS / bounded-log-score modules each with property tests + adoption gates | "bounded proper scoring rule: log score floored at s_min = −57.27" (W-3) | CQR fail-closed repair landed (commit 1d38140); schema/migration changes forbidden to agents | QUEUED-BUILDABLE |
| 33 | `c07/c07-r19/RESEARCH_TO_PRODUCT_PLAYBOOK.brief.md` | Same playbook synthesis as rank 4 (cluster c07 copy) | Same acceptance-gate table + P0–P5 order | "never claim PROVEN until book-priced CLV/Wilson clears 52.4% with n and exclusions" | none stated | DUPLICATE (rank 4 covers it) |
| 34 | `c02/c02-r42/...gse-research-summary-2026-09-18.md.brief.md` | Autonomous research summary: 13 signal compounds on 2,895 NFL games + Minis props lab + self-audit | Expanding-window CV Δlog-loss with pre-registered kill gates (n≥150, ΔLL 0.002 nats) | "Result headline: 0 of 13 executed compounds passed the pre-registered gate" | version-mixing contamination → HCI normalization | QUEUED-RESEARCH |
| 35 | `c07d/c07d-d09/a-statistical-audit-of-physical-ai.brief.md` | Navasardyan & Davtyan 2026: 51-models×12-benchmarks redundancy/sufficiency audit (physical AI) | Pairwise Spearman + LOO-ridge predictability + greedy forward selection U(b\|S)=g(b)·(1−R²) | "Median benchmark has roughly half its variance reconstructible from the other 11" | none stated | QUEUED-RESEARCH |
| 36 | `c03/r50/...LEVERAGE_LOOP_2026-08-10.brief.md` | 2026-08-10 calibration/integrity ops log: leverage loop shipped, no gate flips | Murphy-diagnostic discipline; pause-group + selective-δ bookkeeping vs PROVEN floors | "Live snapshot: n = 339; Brier = 0.2467; ECE = 0.0387; consecutiveGreen = 0; Murphy RES live ≈ 0.002" | pause-group integrity (`RANKING_PAUSE_APPLY` founder-only) | QUEUED-BUILDABLE |
| 37 | `c02/c02-r59/...PATH_TO_PROVEN_EDGE.md.brief.md` | Strategic charter replacing "path to 70%" with CLV/EV north star + grading pipeline | CLV pipeline spec (lock→history→close→math→grade→gate) + 4-phase roadmap + OOS discipline | "A 55% ATS bettor and a break-even one are statistically indistinguishable across a few hundred picks" | coverage gates credibility; freeze-before-result; no fabricated data | QUEUED-RESEARCH |
| 38 | `c05/c05-r17/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.brief.md` | PROPOSED (unimplemented) 5-move engine spec: calibrated confidence, thresholds, beat desk, props, context | Regularized-logistic calibrated_p + conjunction Premium gate + beat-desk trust tiers + prop-script alignment | "2026-10-01: none of the five moves is implemented as of 2026-10-01" | tipster leaderboard (trust earned by realized correlation); Reddit founder-gated | QUEUED-RESEARCH |
| 39 | `c07d/c07d-d48/LAUNCH_MAX_PATH_2026-08-09.brief.md` | 2026-08-09 integrity-safe max-path ops snapshot (pre-launch) | Eligibility snapshot + surface flip rules while RED | "Calibration eligibility snapshot: Brier 0.275, ECE 0.112, RES 0.002 — state labeled RED" | no invented odds/ROI; no PROVEN copy; rankingP sort-key only | QUEUED-BUILDABLE |
| 40 | `c07d/c07d-d46/CALIBRATION_UNCERTAINTY_STACK.brief.md` | Internal spec: binary-p calibration stack + numeric QRF+CQR intervals + eligibility gates | Binary Temp/Platt/PAVA/EB-τ → Brier·ECE·Murphy → eligibility; numeric QRF→CQR as separate layer | "Stationary bootstrap: Mean block ≈ 14 (days/events). Resample contiguous geometric blocks with wrap." | conformal-abstain default OFF; CQR never unlocks eligibility; EB-τ clamp [0.05,2] | QUEUED-BUILDABLE |
| 41 | `c07/c07-r03/0290-machine-learning-for-sports-betting-should.brief.md` | Same Walsh & Joshi 2024 deep-dive as rank 16 (cluster c07 copy) | Same two-branch SFS+BO-TPE method | "Betting simulation 2018/19 ($10,000 start): fixed $100 — calibration SVM $13,244.51 (ROI 32.45%), accuracy SVM $10,556.29 (ROI 5.56%)" | none stated | DUPLICATE (rank 16 covers it) |
| 42 | `c06/r04/0460-rethinking-evaluation-metric-for-probability-estimation.brief.md` | Dossier on "Balance score" binning-free calibration metric; verdict REJECT | Signed per-example gain/loss vs binned ECE + ordering stress test exposing cancellation flaw | "Paper's Table II: Balance ≈ 0 (−0.0004 to 0.0043) on all six settings while ECE ranges 0.0017–0.0078" | none stated | NOT-APPLICABLE |
| 43 | `c06/d03/NFL_REPLAY_CALIBRATION_2026-09-04.brief.md` | Honest backtest: frozen GSE NFL model vs 27 seasons nflverse closing lines | 15,939-pick replay with lookahead-error counter + zero-push anomaly check + per-market ROI | "Per-market ROI (units staked): SPREAD 48.86% win / ROI −6.53% (n=6778); TOTAL 49.49% / ROI −5.44%; MONEYLINE 76.71% / ROI −1.96%; overall ROI −5.48%" | rights posture (CC BY 4.0 attribution required); CFBD unverified | QUEUED-BUILDABLE |
| 44 | `c05/c05-r18/MARKET_CALIBRATION_2026-09-04.brief.md` | Same walk-forward closing-moneyline study as rank 25 (cluster c05 copy) | Same walk-forward folds + calibrator comparison | "Calibrator comparison (mean held-out Δ across 10 folds): isotonic (PAVA) +0.00007; Platt −0.00003; beta −0.00014" | none stated | DUPLICATE (rank 25 covers it) |
| 45 | `c03/r56/...reasoning__week3-props.brief.md` | Week 3 player-props surface: frozen projections regressed toward actuals via 2025 position slopes | 2025-slope regression weights per prop family/position; publishes_pick=false, no market join | "passing_yards (n=583, MAE 68.04, slope 0.62308493, intercept 75.743, w=0.6)" | honesty boundary held (no pick without market price) | QUEUED-BUILDABLE |
| 46 | `c03/r42/...2609.01337-leap-likelihood-elicitation-aggregation.brief.md` | Deep read of LEAP (Chen et al. Sep 2026): evidence-isolated elicitation + tempered Bayesian aggregation | Posterior P(θ\|E) with dependency clustering + reliability shrinkage + per-evidence LOO audits | "Calibration: ECE 0.1840 → 0.0876, Adaptive ECE 0.1765 → 0.0912, overconfidence 0.3167 → 0.1500 (roughly halved)" | none stated | QUEUED-BUILDABLE |
| 47 | `c07d/c07d-d58/RESCUE-2026-09-26-1-pr884-and-stragglers.brief.md` | Rescue-task report: PR #884 red-test fix + 4 unmerged conformal-file ports | Mock-symbol fix + esbuild-transpile verification (36/36 pass); CI as real gate | "conformal quantile now fails closed when rank > n instead of returning +Infinity" | fail-closed conformal quantile | QUEUED-BUILDABLE |
| 48 | `c03/r59/...strategy__PROOF_SPINE_INTEGRATION.brief.md` | Integration guide: proof-spine primitives (receipts, commit-reveal, anchor CLV, Wilson) into live pipeline | SHA-256 pre-result receipts + slate commitments + anchor-CLV on single vig basis | "5 fully wired (CLV coverage invariant, settlement health, segmented CLV, Wilson intervals, public CLV policy), 5 pending" | never pass confidence/100 as modelProb; coverage-gated renders | QUEUED-BUILDABLE |
| 49 | `c03/r54/...path-to-70.brief.md` | Strategy-of-record: honest "70%" = calibrated tier, founder-gated path + first replay measurement | Time-ordered holdout + 11-market-shape edge hunt with Wilson lower-bound bars | "11 market shapes tested ... zero cleared break-even on the Wilson lower bound (best: TOTAL ≤40 at 50.49%, lower bound 48.14%, ROI −3.57%)" | calibration machinery built but human-gated, never autonomous | QUEUED-RESEARCH |
| 50 | `c07d/c07d-d43/overnight-audit-report.brief.md` | 2026-06-30 overnight autonomous-run consolidation (72 additive commits, adversarial review, 5 defects fixed) | Additive-only waves with typecheck/lint/build gates + 4-skeptic diff-only review | "clarkWestTest fail-closed gate: load-bearing n≥30 AND tStat>1.64 to open the gate" | dataQualityScore-30-on-empty flagged as live trust defect (owner call) | QUEUED-RESEARCH |
| 51 | `c07/c07-r02/0116-governed-mcp-kernel-level-tool-governance.brief.md` | Kernel-resident MCP tool-governance gateway (Anima OS, ~286K Rust lines); verdict ADAPT the portable pattern | 6-layer pipeline (schema/trust/rate/prefilter/ProbeLogits/policy) + Blake3 audit chain; Custom-101/260 + HarmBench/XSTest/ToxicChat evals | "Custom-101 full pipeline: F1 = 0.789 (accuracy 84.2%, precision 0.769, recall 0.811; TP 30, FN 7, FP 9, TN 55)" | FAIL-CLOSED (engine down → all calls denied); audit hash chain | QUEUED-RESEARCH |
| 52 | `c07d/c07d-d33/BUILD-QUEUE.brief.md` | Ranked top-20 build queue from 48 ADOPT verdicts (2026-09-22), each with owner + numeric gate | Gate-as-acceptance-test process (fail gate = no ship); remaining 28 ADOPTs via jq query | "MinervaScore signal validation: on permuted-label nulls, MinervaScore achieves AUROC ≥ 0.95 separating null from historically-profitable signals" | conformal selective prediction as publish/no-publish honesty gate | QUEUED-BUILDABLE |
| 53 | `c06/r02/0279-bayesian-weighted-discretetime-dynamic-models-for.brief.md` | Macri-Demartino et al. 2025: Bayesian soccer prediction with adaptive commensurate-prior time weighting | Spike-and-slab hyperprior on period precision across 6 goal-count likelihoods; Stan 4×2000 | "Last 3 rounds: Bundesliga BP weighted Brier 0.678 vs Egidi 0.683 vs Owen 0.687" — gains consistent but modest (Brier deltas ~0.002-0.02) | no-ROI caveat; compare vs bookmaker consensus, not just model baselines | QUEUED-RESEARCH |
| 54 | `c04/c04-r47/ops__CLAUDE_DECISIONS_20260902.md.brief.md` | 2026-09-02 final launch-pass decision log (D1–D13): settlement, floors, tail monitoring, dedup, CI | Production-read Brier decomposition vs floors; MLB skill-score comparison; dedup-by-alias-tombstone | "Production read, 1,663 graded WIN/LOSS picks: overall Brier 0.2727, Murphy uncertainty 0.2493 (base rate 52.6%), reliability 0.0288, resolution 0.0054" | gates-closed posture as launch-ready state; no fabricated numbers | QUEUED-BUILDABLE |
| 55 | `c03/r44/...fable__MODEL_CALIBRATION.brief.md` | Short governance note: FABLE lane calibration surfaces + evidence rules + blocked-claim example | Ruleset (measured-only Brier/ECE with baseline/recent window, n, metric defs, command output); no runtime added | No numeric result (ruleset, not a results report — "contains no measured Brier/ECE numbers") | measured-only evidence rules | QUEUED-RESEARCH |
| 56 | `c01/reader-58/coding_agent_briefs.brief.md` | Evidence-only coding-agent briefs (2026-09-28): DK imports, CLV history, NGS plan, licenses, rankings, surface doctrine | Salary-endpoint probes + Neon table census + license verdicts + benchmark inventory | "picks (~4,030 rows, 2,189 CLV-graded, avg CLV -0.193, zero positive)" | DK ToS vs standing-rule conflict (Garrett decision pending); BDB CC BY-NC never training input | QUEUED-RESEARCH |
| 57 | `c06/r25/FINAL_REPORT.brief.md` | 2026-07-16 final report: autonomous Glass Ledger + Edge Engine build (18 commits, all INERT/founder-gated) | Leak-free foundation (shuffled-time placebo) + Venn-Abers honesty gates + hash-chained CLV ledger + 3 edge models | "HB props closed-form EB Gamma-Poisson/NegBinomial — Brier 0.2189 < climatology 0.2285 on 111,329 real player-weeks, decile calibration fully monotone (0 inversions)" | firing NOTHING = product working (refusal doctrine); sealed 2025 holdout | QUEUED-BUILDABLE |
| 58 | `c02/c02-r35/...data__GRIND_WORK_ORDER.md.brief.md` | 7-day OX-BETA sprint work order: token substrate → validation bench → NFL edges → fleet factory | Walk-forward expanding-window CV (random K-fold BANNED) + CLV referee + BH-FDR mining; priced:false, fail-closed | No numeric result (work order, not results — done-when = "data:dict, repo:map ... all run green in CI") | Clearance Engine + source-rights before any new source; CC-BY-SA must not reach derived p | QUEUED-RESEARCH |
| 59 | `c03/r47/...math__GSE_PROPRIETARY_METRIC_BIBLE.brief.md` | Canonical metric-system definition (2026-07-06, Slice 1+): 17+ governed SHADOW metrics + graduation/validation ladders | DRI formula + protected basis expansion + SHADOW→APPROVED ladders; 885-test + 8,239-test verification runs | "final logged prediction-engine run PASS — 107 files, 885 tests; full all-workspaces aggregate PASS — 670 files, 8,239 tests" | SHADOW-only with INTERNAL exposure; `probability: null` on market metrics; fail-closed payload kinds | QUEUED-BUILDABLE |
| 60 | `c01/reader-40/CARDS_INCENTIVE_CALENDAR.brief.md` | Nine-card incentive-calendar deck: per-team incentive state machine + coach fingerprints + rule-change machinery | Standings-math state machine + shrunk PROE/pace + widenGammaPrior re-estimation + BH-FDR q=0.10 admission | "shrinkage proeShrunk = (n·proeRaw + n0·leagueProe)/(n+n0), n0 = pseudoPlays default 300" (method spec; results CANDIDATE — admission via trials registry) | fail-closed rest refusal (`rest_risk_unquantified`); deck-wide priced:false | QUEUED-RESEARCH |

## Pass 3 — coverage check (briefs per cluster)

`rg --files -g '*.md'` under the extraction, in-scope clusters only, `c03/r48/**` excluded:

| cluster | brief files |
|---|---:|
| c01 | 359 |
| c02 | 300 |
| c03 (minus r48) | 345 |
| c04 | 327 |
| c05 | 312 |
| c06 | 300 |
| c07 | 300 |
| c07d | 300 |
| **in-scope total** | **2543** |
| excluded (`c03/r48/**`, already digested) | 7 |

Reconciliation note: the in-scope census here is **2,543** files, which does NOT match the "2,221 brief files" figure the prompt cites for the corpus-deep distilled layer — a gap of ~322 files. Possible causes (not resolved in this pass): the census figure may predate later extraction waves, count a different file glob, or cover a different cluster set. The per-cluster counts above are the measured `rg --files` values and should be used as the reconciling baseline.

## Coverage honesty statement

- **Fully read (full file, digest row above): only the top 60 ranked files** (ranks 1–60 of the Pass 1 ranking).
- **Ranking-pass coverage only (counts, no full read): the remaining files.** 1,368 of 2,543 in-scope files had ≥1 match on either pattern; 1,175 had zero matches on both and are covered by the census counts alone.
- **Top 61–150 listed in the Pass 1 table with their (score, a, b) counts** — not full-read.
- Disposition tally across the 60 full reads: QUEUED-BUILDABLE 33 / QUEUED-RESEARCH 18 / DUPLICATE 8 / NOT-APPLICABLE 1.
- No git commands were run. No writes were made outside the temp dir (`C:\Users\Garrett\AppData\Local\Temp\opencode\`) and this report file.
