# Epistemic Calibration & Sanity Gate — triage map (2026-11-21)

**Run:** 44870532419 on main `9feec3c13` (push). **Result:** 58 failed, 1493 passed, 52 skipped, 14 deselected.

**Status:** chronic — red on every push since the waves advance (10+ consecutive runs back to 2026-11-20 19:30Z). This is accumulated engine/data debt, NOT a regression from the CI-repair lane. The ci.yml JS test wall is green; this is the separate Python epistemic wall (`epistemic_gate.yml`).

**Scope decision (takeover-build-loop, 2026-11-21):** the orchestrator psutil regression was fixed this cycle (commit a152499c4). The 58 epistemic failures are predominantly engine/data-lane judgment calls, active-lane files, and owner calls — they are catalogued here for the owning lanes rather than blind-relaxed. Relaxing quality floors (class D) or fail-closed gates (class B) without verification would violate the zero-fabrication / fail-closed doctrine.

**Class totals:** A=1, B=5, C=15, D=5, E=4, F=2, G=26. Total 58.


## A. Missing module on subprocess PYTHONPATH (1)

MECHANICAL / test-harness. `test_future_week_simulation_hold_gate_blocks_week11_without_approval` spawns `scripts/ops/gse_t_minus_lock_orchestrator.py` via subprocess without `src` on PYTHONPATH, so `import gse_engine` fails. The CI job sets PYTHONPATH for itself but the test's child env does not inherit it. Fix: pass `env={**os.environ, 'PYTHONPATH': src+root}` in the test's subprocess call. Safe, no engine semantics touched.

| Test | Failure (truncated) |
|---|---|
| `tests/unit/test_knowledge_continuity_and_gsi_rlvr.py::test_future_week_simulation_hold_gate_blocks_week11_without_approval` | assert 'OPERATOR_SIM_HOLD' in 'Traceback (most recent call last):\n  File "/home/runner/work/Sports/Sports/scripts/ops/gse_t_minus_lock_orchestrator...n\n    from gse_engine.governance.simulation_hold_gate import (\nModuleNotFoundError: No  |

## B. Stage-0 roster gate on stale week9 DEFAULT config (5)

DATA/TEST lane, NOT a prod blocker. These tests call the gate with its DEFAULT_CONFIG = `data/nflverse/week9_live_roster_transactions_and_starters_2026.json` (as_of 2026-11-16, age 5 > max 3). The gate is correctly fail-closed (origin: Week-9 TNF recommended an OUT Lamar Jackson). The current `week11_...json` is fresh (as_of 2026-11-19, age 2) so the production Week-11 sim path passes. Fix: point these tests at the current-week config (or refresh the week9 fixture); do NOT loosen max_age_days. NOTE: week11 config itself expires Mon 2026-11-23 (age 4) — refresh before MNF.

| Test | Failure (truncated) |
|---|---|
| `tests/unit/test_aws_ngs_going_deep_gse_gsi_suite.py::TestAWSNGSGoingDeepGSEGSI::test_08_stage2_integrator_registry_354_report_and_rlvr_220` | scripts.ops.preflight_live_roster_injury_gate.PreflightRosterGateError: roster config as_of 2026-11-16 is 5 days old (max 3); refresh transactions/injuries before running |
| `tests/unit/test_gsi_translational_and_datascience_bridge.py::test_stage2_live_wiring_composer_tasks_and_adr0003_cap` | scripts.ops.preflight_live_roster_injury_gate.PreflightRosterGateError: roster config as_of 2026-11-16 is 5 days old (max 3); refresh transactions/injuries before running |
| `tests/unit/test_wave30_deepmind_mctx_bayesnf_weatherbench_and_ngs.py::test_wave30_stage2_integrator_registry_346_report_and_rlvr_210` | scripts.ops.preflight_live_roster_injury_gate.PreflightRosterGateError: roster config as_of 2026-11-16 is 5 days old (max 3); refresh transactions/injuries before running |
| `tests/unit/test_wave9_books_pdfs_ig_x_situational_and_sim_upgrade.py::test_phase_a_all_five_corpus_pillars_wired_on_week10_matchup` | scripts.ops.preflight_live_roster_injury_gate.PreflightRosterGateError: roster config as_of 2026-11-16 is 5 days old (max 3); refresh transactions/injuries before running |
| `tests/unit/test_wave9_books_pdfs_ig_x_situational_and_sim_upgrade.py::test_wave12_intelligence_efficiency_and_snap_effectiveness` | scripts.ops.preflight_live_roster_injury_gate.PreflightRosterGateError: roster config as_of 2026-11-16 is 5 days old (max 3); refresh transactions/injuries before running |

## C. Stale integer count pins vs grown data (15)

ENGINE/DATA lane judgment. Pins like `assert 149 == 147` (walk-forward game count), `26246 == 18738` (snaps), `15477 == 15400`, `2747 == 2584`, `219 == 225` (manifest). The slate/snap corpus legitimately grew (147->147+2 games). Re-pin ONLY after verifying the new counts against the real ingested slate (stale-test-repair discipline) — never blind-relax. Several wave32/35/43/44/45/46/48 tests share the 147->149 game pin.

| Test | Failure (truncated) |
|---|---|
| `tests/ops/test_overnight_w1_to_w11_simulation_battery.py::test_overnight_battery_fast_mode_produces_sealed_w1_10_matrix_and_w11_slate` | assert 149 == 147 |
| `tests/test_ftn_role_zone_pressure_hazard_15q.py::test_stream_15q_profiles_cover_32_teams_and_are_strictly_causal` | assert 33 == 32 |
| `tests/test_red_team_7vector_forensic_audit.py::test_vector1_web_coach_writeups_and_redline_world_clean_week9` | AssertionError: assert 28 == 14 |
| `tests/test_week10_360_dfs_and_stage0_gates.py::test_slice3_classic_main_and_sun_mon_14core_and_markdown_packet` | AssertionError: assert 2 == 1 |
| `tests/unit/test_run_0730_cst_fresh_pull_and_email_dispatch.py::test_pull_fresh_0730_cst_data_manifest_and_sha256_verification` | assert 219 == 225 |
| `tests/unit/test_wave32_unified_all_sports_live_engine_alignment.py::test_real_2026_snaps_going_deep_optimization` | assert 26246 == 18738 |
| `tests/unit/test_wave32_unified_all_sports_live_engine_alignment.py::test_147_game_walk_forward_ablation_beats_close_across_all_5_metrics` | assert 149 == 147 |
| `tests/unit/test_wave32_unified_all_sports_live_engine_alignment.py::test_wave32_full_benchmark_smoke_and_rlvr_hygiene` | assert 149 == 147 |
| `tests/unit/test_wave35_gsi_lifesaving_and_player_micro_metrics.py::test_gsi_cte_waveguide_koopman_ecg_wbgt_and_six_skill_channels` | assert 15477 == 15400 |
| `tests/unit/test_wave35_gsi_lifesaving_and_player_micro_metrics.py::test_gse_causal_micro_metrics_csv_gate_and_live_honest_asts` | assert 2747 == 2584 |
| `tests/unit/test_wave43_alphaxiv_31papers_ebm_lf_wsp_arithmetic_and_nfl_engine.py::test_wave43_nfl_causal_iwsp_ebm_placebo_quarantine_and_ast` | assert 149 == 147 |
| `tests/unit/test_wave44_alphaxiv_28papers_dfl_causal_integrity_and_nfl_engine.py::test_wave44_causal_nfl_hold_placebo_baitbench_ast_and_wiring` | assert 149 == 147 |
| `tests/unit/test_wave45_alphaxiv_78papers_conformal_copula_and_picks_props_dfs_engine.py::test_wave45_causal_nfl_props_milp_dfs_placebo_ast_and_wiring` | assert 149 == 147 |
| `tests/unit/test_wave46_alphaxiv_66papers_memtx_ci_upa_ledger_picks_7props_dfs.py::test_wave46_causal_nfl_7props_stacked_dfs_placebo_ast_and_wiring` | assert 149 == 147 |
| `tests/unit/test_wave48_stage0_weather_showdown_and_cold_start_opt.py::test_wave48_vault_audit_causal_signals_wf_showdown_martingale_and_wiring` | assert 149 == 147 |

## D. Ablation quality floors drifted (5)

ENGINE/CALIBRATION lane judgment — DO NOT auto-relax. wave43-48 tests require each wave's ablation metric to beat the prior wave's RLVR floor; measured 7.0193 now sits just above floors 7.019 / 7.0141 / 7.0097 / 7.0078 / 7.0063. These are monotonic-improvement quality gates. A slight regression is a real signal for the calibration lane to investigate, not a pin to bump. Flagged, untouched.

| Test | Failure (truncated) |
|---|---|
| `tests/unit/test_wave43_alphaxiv_31papers_ebm_lf_wsp_arithmetic_and_nfl_engine.py::test_wave43_ablation_beats_w42_rlvr_364_and_hygiene` | assert 7.0193 < 7.019 |
| `tests/unit/test_wave44_alphaxiv_28papers_dfl_causal_integrity_and_nfl_engine.py::test_wave44_ablation_beats_w43_rlvr_376_and_hygiene` | assert 7.0193 < 7.0141 |
| `tests/unit/test_wave45_alphaxiv_78papers_conformal_copula_and_picks_props_dfs_engine.py::test_wave45_ablation_beats_w44_rlvr_388_and_hygiene` | assert 7.0193 < 7.0097 |
| `tests/unit/test_wave46_alphaxiv_66papers_memtx_ci_upa_ledger_picks_7props_dfs.py::test_wave46_ablation_beats_w45_rlvr_400_and_hygiene` | assert 7.0193 < 7.0078 |
| `tests/unit/test_wave48_stage0_weather_showdown_and_cold_start_opt.py::test_wave48_ablation_beats_w46_rlvr_412_and_hygiene` | assert 7.0193 < 7.0063 |

## E. Two-Host Rule portability violations (4)

CALIBRATION lane (revenue lane active here). `intelligence/calibration/gse_master_compendium_2026_loader.py` hardcodes `C:\Users\Garrett` paths, tripping 4 zero-hardcoded-host-path tests. Real portability bug. Fix: resolve paths relative to repo root / env. Mechanical but the file is in an actively-rewritten lane — coordinate before editing to avoid a merge collision.

| Test | Failure (truncated) |
|---|---|
| `tests/unit/test_bojieli_ai_agent_book_and_multi_agent_patterns_engine.py::test_two_host_rule_zero_hardcoded_local_user_paths` | AssertionError: Two-Host Rule violations found: ['intelligence/calibration/gse_master_compendium_2026_loader.py contains C:\\Users\\Garrett'] |
| `tests/unit/test_deep_read_books_pdfs_21419_equations.py::test_zero_hardcoded_local_host_paths_in_intelligence` | AssertionError: Found hardcoded local host paths in intelligence/*.py: ['intelligence/calibration/gse_master_compendium_2026_loader.py: C:\\Users\\Garrett', 'intelligence/calibration/gse_master_compendium_2026_loader.py: C:\\Users\\Garrett' |
| `tests/unit/test_deep_read_grok_muse_motif_comp_intel.py::test_zero_hardcoded_local_host_paths_in_intelligence_py` | AssertionError: Two-Host Rule violation in intelligence/*.py: ['intelligence/calibration/gse_master_compendium_2026_loader.py'] |
| `tests/unit/test_deep_read_multi_cli_and_laptop_workspaces.py::test_zero_hardcoded_local_host_paths_across_intelligence_py` | AssertionError: Found hardcoded local host paths in intelligence/*.py: ['intelligence/calibration/gse_master_compendium_2026_loader.py'] |

## F. Malik Davis week-9 pack defect (2)

OWNER CALL (Garrett), already reported in prior cycles. Sub-floor trap Malik Davis in Lineup 1; props dossier KeyError 'Malik Davis'. Left untouched pending owner decision.

| Test | Failure (truncated) |
|---|---|
| `tests/test_red_team_7vector_forensic_audit.py::test_vector2_content_pack_4_lineups_and_json_packets_match_real_dk_csv` | AssertionError: Sub-floor trap Malik Davis in Lineup 1 |
| `tests/test_red_team_7vector_forensic_audit.py::test_vector4_top_10_props_match_dossiers_on_disk` | KeyError: 'Malik Davis' |

## G. Mixed product/engine defects + stale artifacts (26)

RESPECTIVE LANES. Genuine fail-closed catches and stale-artifact pins, e.g. week10 DFS late-swap FLEX ordering violations, munich_ne_det provenance sha256 mismatch, Tre Harris KeyError, qb_rush_tds cap 0.1 vs 2.7, stale 2024 artifact data/context_packets/2026_09_IND_MIN.json, catalog.ts tnf-all-in-pack block missing, stale ledger string '47-19-1 (+24.92u)', missing data/corpus/research_records.jsonl, remediated-guardrail relapses. Each belongs to its product/engine lane; listed below verbatim for triage. Not mechanical CI fixes.

| Test | Failure (truncated) |
|---|---|
| `tests/e2e/test_tier5_adversarial_plugins_and_guardrails_challenger.py::TestTier5AdversarialM8GuardrailsAndPythonLedger::test_03_run_all_manifest_fail_closed_and_4_remediated_guardrails_live_pass` | AssertionError: 1 != 0 : 4 remediated guardrails failed: |
| `tests/e2e/test_tier5_adversarial_plugins_and_guardrails_challenger.py::TestTier5AdversarialM8GuardrailsAndPythonLedger::test_04_f18_zero_hybrid_ledger_strings_and_overnight_dry_run_and_seo_lcp` | AssertionError: False is not true |
| `tests/test_chronological_index_and_ci_guards.py::test_calibration_metrics_governance_locks_and_offload_guards` | AssertionError: assert True is False |
| `tests/test_dfs_5000_page_corpus_and_7_equations.py::test_10_gate_dfs_and_fantasy_accuracy_engine_eliminates_all_traps` | AssertionError: assert False |
| `tests/test_week10_360_dfs_and_stage0_gates.py::test_week10_classic_cash_medians_and_hold_status` | AssertionError: munich_ne_det invalid dk_scratch_json_provenance sha256 |
| `tests/test_week10_360_dfs_and_stage0_gates.py::test_week10_dossiers_physical_conservation_and_stage0_qb1_conflict_fail_closed` | KeyError: 'Tre Harris' |
| `tests/test_week10_360_dfs_and_stage0_gates.py::test_qb_rush_tds_capped_at_045_in_both_branches` | assert 0.1 == 2.7 ± 1.0e-06 |
| `tests/test_week10_360_dfs_and_stage0_gates.py::test_week10_santa_remediation_invariants_across_all_13_dossiers_and_sims` | assert True is False |
| `tests/test_week10_impeccable_dfs_hard_gate.py::test_week10_sunday_main_slate_artifact` | AssertionError: Main slate violations: ['Lineup 2 violates late-swap FLEX ordering (early player in FLEX)', 'Lineup 3 violates late-swap FLEX ordering (early player in FLEX)', 'Lineup 13 violates late-swap FLEX ordering (early player in FLE |
| `tests/test_week10_impeccable_dfs_hard_gate.py::test_week10_sun_mon_expanded_artifact` | AssertionError: Sun-Mon expanded violations: ['Lineup 13 violates late-swap FLEX ordering (early player in FLEX)', 'Lineup 18 violates late-swap FLEX ordering (early player in FLEX)'] |
| `tests/test_week9_forensic_autopsy_fixes.py::test_14_storefront_quarantine_verification` | AssertionError: Could not locate tnf-all-in-pack block in catalog.ts |
| `tests/test_week9_forensic_autopsy_fixes.py::test_31_firecrawl_alexandria_live_sync_and_zero_duplicate_teams_gate` | AssertionError: Stale 2024 Week 9 artifact file still present on disk: /home/runner/work/Sports/Sports/data/context_packets/2026_09_IND_MIN.json |
| `tests/test_week9_forensic_autopsy_fixes.py::test_32_full_stack_performance_and_seo_lcp_19_skills_suite` | assert '47-19-1 (+24.92u)' in '/**\n * Search & Discovery Metadata Module for Galaxy Sports Edge (`apps/web`).\n *\n * Provides structured JSON-LD a...sportsbook parlay pricing leaves clear value.",\n            },\n          },\n        ], |
| `tests/test_week9_forensic_autopsy_fixes.py::test_34_understand_anything_knowledge_graph_and_session_librarian_immunization_wired` | AssertionError: assert 2 >= 150 |
| `tests/test_weeks_1_to_8_replay_trainer.py::test_no_fabricated_week8` | assert 8 not in [1, 2, 3, 4, 5, 6, ...] |
| `tests/unit/test_bojieli_ai_agent_book_and_multi_agent_patterns_engine.py::test_end_to_end_two_wave_projections_and_200pt_dfs_workflow` | AssertionError: assert 'FAIL' == 'PASS' |
| `tests/unit/test_comprehensive_full_stack_and_engine_review.py::test_phase_1_code_quality_and_architecture_passes` | AssertionError: assert 'FAIL' == 'PASS' |
| `tests/unit/test_comprehensive_full_stack_and_engine_review.py::test_phase_4_best_practices_and_cicd_passes` | AssertionError: assert 'FAIL' == 'PASS' |
| `tests/unit/test_comprehensive_full_stack_and_engine_review.py::test_full_review_end_to_end_receipt_and_markdown_report` | AssertionError: assert 'FAIL' == 'PASS' |
| `tests/unit/test_deep_read_grok_muse_motif_comp_intel.py::test_receipt_exists_and_all_referenced_paths_resolve` | AssertionError: Missing Grok/xAI target: data/corpus/research_records.jsonl |
| `tests/unit/test_dk_200pt_situational_dfs_and_projection_engine.py::test_200pt_dk_championship_portfolio_and_full_omniverse_suite` | assert False is True |
| `tests/unit/test_gse_27_skill_unified_execution_and_verification_engine.py::test_pillar4_ui_ux_component_and_doop` | AssertionError: assert False is True |
| `tests/unit/test_gse_27_skill_unified_execution_and_verification_engine.py::test_run_all_27_skills_execution_and_verification_persists_receipt` | assert False is True |
| `tests/unit/test_packt_17repo_conformal_sports_arrow_and_agent_harness.py::test_end_to_end_packt_95_suite_and_dk_200pt_integration` | assert 1.05 > 1.5 |
| `tests/unit/test_run_0730_cst_fresh_pull_and_email_dispatch.py::test_run_entire_process_from_scratch_on_fresh_data` | AssertionError: assert 'FAIL' == 'PASS' |
| `tests/unit/test_run_0730_cst_fresh_pull_and_email_dispatch.py::test_compose_and_dispatch_0730_morning_email_and_receipt` | AssertionError: assert '10/10 PASS' in '================================================================================\nGALAXY SPORTS EDGE — 07:30 AM CST F...5 Pass Yds, Amon-Ra St. Brown OVER 18.5 1Q Rec Yds, Jahmyr Gibbs Anytime TD / Co |

## Recommended sequencing

1. **A (1)** — trivial test-harness PYTHONPATH fix; clears 1, safe anytime.

2. **E (4)** — portable-path fix in gse_master_compendium_2026_loader.py; coordinate with revenue lane; clears 4.

3. **B (5)** — repoint tests to current-week roster config; clears 5; refresh week11 config before Mon 11-23 MNF.

4. **C (15)** — verify grown counts vs real slate, then re-pin; clears up to 15.

5. **D (5)** — calibration lane investigates the ablation regression; do NOT bump floors.

6. **F (2)** — owner call (Malik Davis).

7. **G (26)** — distribute to product/engine lanes per artifact.
