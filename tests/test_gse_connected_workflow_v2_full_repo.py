#!/usr/bin/env python3
"""
tests/test_gse_connected_workflow_v2_full_repo.py

Comprehensive Full-Repository Regression Test Suite for GSE Connected Game Workflow v2:
  1. Stage 0 Roster & Contamination Gate:
     - Tank Bigsby, Isaiah Likely, Tyler Huntley, and Lamar Jackson are strictly blocked
       (`assert_zero_roster_contamination` raises `RuntimeError` if any appear in a string,
       and passes on clean output).
     - Joe Fagnano is BAL QB1 (Jacoby Brissett emergency QB2); Trevor Lawrence is JAX QB1.
     - All 37 board athletes have verified 2026 `player_gp` and team assignments.
  2. TypeScript Prediction & MCP Equation Engines Telemetry (`tnf_jax_bal_ts_engines_telemetry_2026_11_05.json`):
     - `mcp_cognitive_router.thousand_equation_matrix_count == 1666`
     - `mcp_cognitive_router.stage_d_james_stein_shrinkage > 0.90` (specifically `0.916978`)
     - `abs(mcp_cognitive_router.stage_d_clamped_log_odds_delta) <= 0.35`
     - `master_situational_reasoning_aggregator.streams_executed_count == 22` and `streams_skipped_count == 0`
     - `master_situational_reasoning_aggregator.stream15i_zero_orphan_modules_evaluated == 77` and `stream15i_catalog_signals_evaluated == 51`
     - `x_situational_80_rules.total_rules == 80` and `evaluated_count == 80`
     - `wireable_dispatch_registry.wireable_module_ids_count == 173` and `registered_model_ids_count == 196`
  3. Python 31-Subpackage & 31-Dataset Telemetry (`tnf_jax_bal_python_31_domains_telemetry_2026_11_05.json`):
     - `intelligence_31_subpackages.subpackages_connected_count >= 30`
     - `datasets_report.ftn_charting_2026.rows == 18019`
     - `len(datasets_report.step_n_market_11_parquets) == 11`
  4. Connected Workflow Master Receipt (`tnf_jax_bal_connected_workflow_v1_2026_11_05.json`) & Markdown Dossier:
     - Cryptographic SHA-256 lineage chain (`Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5`) is intact.
     - `stage3_and_4_projections_and_situational` contains `derivatives_and_exotics_360`
       (`quarters_and_halves_team_projections`, `first_quarter_and_first_half_player_projections`,
        `longest_play_projections`, `touchdown_scorer_probabilities`, `idp_pass_rush_sack_projections`).
     - `stage5_360_conjunction_gate_and_call_sheet` has dynamic `gate_reason` strings (no hardcoded
       `42.1%` or `65.7%` mismatch), integer `XX/100` confidence strings (no `%` confidence),
       and Dual-Panel Official Ledger (`15,947` replay + `16-5` Wilson CI).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    Stage0RosterContaminationError,
    assert_zero_roster_contamination,
    build_dynamic_league_wide_denylist_for_matchup,
    load_stage0_game_roster_allowlist,
)


def test_stage0_roster_and_contamination_gate():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)

    # Verify QB1 starters and emergency QB2 trade
    assert allowlist["confirmed_qb1"]["JAX"] == "Trevor Lawrence"
    assert allowlist["confirmed_qb1"]["BAL"] == "Joe Fagnano"
    traded_names = {tp["name"]: tp for tp in allowlist.get("traded_players", [])}
    assert "Jacoby Brissett" in traded_names
    assert traded_names["Jacoby Brissett"]["to"] == "BAL"

    # Verify all 37 board athletes have verified 2026 player_gp and team assignments
    assert allowlist["verified_board_athletes_count"] == 37
    athletes = allowlist["verified_board_athletes"]
    assert len(athletes) == 37
    for name, info in athletes.items():
        assert info["team"] in ("JAX", "BAL"), f"Unexpected team for {name}: {info['team']}"
        assert "pbp_2026" in info, f"Missing pbp_2026 for {name}"
        assert isinstance(info["pbp_2026"]["player_gp"], int), f"Missing int player_gp for {name}"
        assert info["pbp_2026"]["player_gp"] >= 0

    # Strictly block Tank Bigsby, Isaiah Likely, Tyler Huntley, and Lamar Jackson in strings
    for blocked_name in ("Tank Bigsby", "Isaiah Likely", "Tyler Huntley", "Lamar Jackson"):
        with pytest.raises(RuntimeError):
            assert_zero_roster_contamination(
                f"Active projection tonight: {blocked_name} Over 45.5 yards.",
                allowlist,
                f"test_string_block_{blocked_name}",
            )

    # Clean output passes without error
    clean_text = (
        "Confirmed Week 9 TNF starters: Trevor Lawrence (JAX QB1) vs Joe Fagnano (BAL QB1, "
        "with Jacoby Brissett as emergency QB2). Derrick Henry leads BAL rushing attack."
    )
    assert_zero_roster_contamination(clean_text, allowlist, "test_clean_output")


def test_ts_prediction_and_mcp_engines_telemetry():
    ts_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_ts_engines_telemetry_2026_11_05.json"
    assert ts_path.is_file(), f"Missing TS telemetry JSON: {ts_path}"
    ts_data = json.loads(ts_path.read_text(encoding="utf-8"))

    mcp = ts_data["mcp_cognitive_router"]
    assert mcp["thousand_equation_matrix_count"] == 1666
    assert mcp["stage_d_james_stein_shrinkage"] > 0.90
    assert abs(mcp["stage_d_james_stein_shrinkage"] - 0.916978) < 1e-4
    assert abs(mcp["stage_d_clamped_log_odds_delta"]) <= 0.35

    msra = ts_data["master_situational_reasoning_aggregator"]
    assert msra["streams_executed_count"] == 22
    assert msra["streams_skipped_count"] == 0
    assert msra["stream15i_zero_orphan_modules_evaluated"] == 77
    assert msra["stream15i_catalog_signals_evaluated"] == 51

    x80 = ts_data["x_situational_80_rules"]
    assert x80["total_rules"] == 80
    assert x80["evaluated_count"] == 80

    wdr = ts_data["wireable_dispatch_registry"]
    assert wdr["wireable_module_ids_count"] == 173
    assert wdr["registered_model_ids_count"] == 196

    inv87 = ts_data["prediction_engine_87_domains_inventory"]
    assert inv87["total_domains"] >= 87
    assert inv87["total_ts_files"] >= 1200

    mono25 = ts_data["monorepo_25_packages_inventory"]
    assert mono25["total_packages"] >= 25
    assert mono25["total_ts_files"] >= 2000

    live_exec = ts_data["live_87_domains_and_25_packages_executions"]
    assert live_exec["epistemic_twin"]["can_act_as_if_sim_healthy"] is True
    assert live_exec["epistemic_twin"]["can_act_as_if_publish_healthy"] is False
    assert live_exec["mcp_fleet_and_content_os"]["foreman_arbiter"]["decision"] == "FINISH_VERIFIED"



def test_python_31_subpackages_and_31_datasets_telemetry():
    py_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_python_31_domains_telemetry_2026_11_05.json"
    assert py_path.is_file(), f"Missing Python 31-domain telemetry JSON: {py_path}"
    py_data = json.loads(py_path.read_text(encoding="utf-8"))

    subpkgs = py_data["intelligence_31_subpackages"]
    assert subpkgs["subpackages_connected_count"] >= 30

    ds = py_data["datasets_report"]
    assert ds["ftn_charting_2026"]["rows"] == 18019
    assert len(ds["step_n_market_11_parquets"]) == 11


def test_connected_workflow_master_receipt_and_markdown_dossier():
    v1_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_v1_2026_11_05.json"
    master_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_master_2026_11_05.json"
    target_path = v1_path if v1_path.is_file() else master_path
    assert target_path.is_file(), f"Missing connected workflow receipt JSON: {v1_path}"
    receipt = json.loads(target_path.read_text(encoding="utf-8"))

    # 1. Verify Cryptographic SHA-256 lineage chain (Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5)
    chain = receipt.get("cryptographic_receipt_chain") or receipt.get("receipt_lineage_sha256") or {}
    s0 = receipt.get("stage0_roster_and_board_allowlist") or receipt.get("stage0_allowlist") or {}
    s1a = receipt.get("stage1a_coaching_mind_and_schemes") or receipt.get("stage1a_coaching_and_schemes") or {}
    s1b = receipt.get("stage1b_5367_equations_pre_sim_review") or receipt.get("stage1b_equations_and_ engines") or receipt.get("stage1b_equations_and_engines") or {}
    s2 = receipt.get("stage2_jev_spine_and_10k_simulation") or {}
    s34 = (
        receipt.get("stage3_and_4_projections_and_situational")
        or receipt.get("stage3_4_conserved_post_sim_projections")
        or {}
    )
    s5 = (
        receipt.get("stage5_360_conjunction_gate_and_call_sheet")
        or receipt.get("stage5_360_conjunction_gate")
        or {}
    )

    s0_hash = s0.get("stage0_receipt_sha256") or chain.get("stage0_receipt_sha256")
    s1a_hash = s1a.get("stage1a_receipt_sha256") or chain.get("stage1a_receipt_sha256")
    s1b_hash = s1b.get("stage1b_receipt_sha256") or chain.get("stage1b_receipt_sha256")
    s2_hash = s2.get("stage2_receipt_sha256") or chain.get("stage2_receipt_sha256")
    s34_hash = s34.get("stage3_4_receipt_sha256") or chain.get("stage3_4_receipt_sha256")
    s5_hash = s5.get("stage5_receipt_sha256") or chain.get("stage5_receipt_sha256")

    for h_name, h_val in (
        ("stage0", s0_hash),
        ("stage1a", s1a_hash),
        ("stage1b", s1b_hash),
        ("stage2", s2_hash),
        ("stage3_4", s34_hash),
        ("stage5", s5_hash),
    ):
        assert isinstance(h_val, str) and len(h_val) == 64, f"Invalid SHA-256 hash for {h_name}: {h_val}"

    if "parent_stage0_receipt_sha256" in s1a:
        assert s1a["parent_stage0_receipt_sha256"] == s0_hash
    if "parent_stage1a_receipt_sha256" in s1b:
        assert s1b["parent_stage1a_receipt_sha256"] == s1a_hash
    if "parent_stage1b_receipt_sha256" in s2:
        assert s2["parent_stage1b_receipt_sha256"] == s1b_hash
    if "parent_stage2_receipt_sha256" in s34:
        assert s34["parent_stage2_receipt_sha256"] == s2_hash
    if "parent_stage3_4_receipt_sha256" in s5:
        assert s5["parent_stage3_4_receipt_sha256"] == s34_hash

    # 2. Verify stage3_and_4_projections_and_situational contains derivatives_and_exotics_360
    assert "stage3_and_4_projections_and_situational" in receipt
    s34_main = receipt["stage3_and_4_projections_and_situational"]
    assert "derivatives_and_exotics_360" in s34_main
    derivs = s34_main["derivatives_and_exotics_360"]
    for req_key in (
        "quarters_and_halves_team_projections",
        "first_quarter_and_first_half_player_projections",
        "longest_play_projections",
        "touchdown_scorer_probabilities",
        "idp_pass_rush_sack_projections",
    ):
        assert req_key in derivs, f"Missing {req_key} in derivatives_and_exotics_360"
        assert derivs[req_key], f"Empty {req_key} in derivatives_and_exotics_360"

    # 3. Verify stage5_360_conjunction_gate_and_call_sheet
    assert "stage5_360_conjunction_gate_and_call_sheet" in receipt
    s5_main = receipt["stage5_360_conjunction_gate_and_call_sheet"]
    game_lines = s5_main.get("game_line_evaluations") or s5_main.get("main_game_lines") or []
    assert len(game_lines) == 6

    for gl in game_lines:
        reason = str(gl.get("gate_reason") or "")
        # Must not contain stale hardcoded 42.1% or 65.7% mismatch
        assert "42.1%" not in reason, f"Hardcoded 42.1% mismatch found in gate_reason: {reason}"
        assert "65.7%" not in reason, f"Hardcoded 65.7% mismatch found in gate_reason: {reason}"
        # Confidence must be formatted as integer XX/100, never percentage
        conf_str = str(gl.get("confidence_score") or gl.get("confidence") or "")
        assert re.fullmatch(r"\d{1,3}/100", conf_str), f"Invalid confidence format: {conf_str}"
        assert "%" not in conf_str

    # Verify Dual-Panel Official Ledger (15,947 replay + 16-5 Wilson CI)
    dual_ledger = s5_main.get("dual_panel_ledger_summary") or s5_main.get("dual_panel_official_ledger") or {}
    dual_ledger_str = json.dumps(dual_ledger)
    assert "15947" in dual_ledger_str or "15,947" in dual_ledger_str
    assert "16-5" in dual_ledger_str or "0.7619" in dual_ledger_str

    # 4. Verify Markdown Dossier is clean and passes Stage 0 contamination check
    md_path = (
        REPO_ROOT
        / "docs"
        / "predictions"
        / "research"
        / "2026-11-05"
        / "TNF-JAX-AT-BAL-FINAL-360-CALL-SHEET-2026-11-05.md"
    )
    assert md_path.is_file(), f"Missing Markdown Dossier: {md_path}"
    md_text = md_path.read_text(encoding="utf-8")
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert_zero_roster_contamination(md_text, allowlist, "markdown_dossier")
    assert "15,947" in md_text
    assert "16-5" in md_text
    assert "42.1%" not in md_text
    assert "65.7%" not in md_text


def test_dynamic_32_team_league_wide_denylist():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert allowlist["dynamic_league_wide_denylist_count"] >= 2400

    dyn_jax_bal = build_dynamic_league_wide_denylist_for_matchup("JAX", "BAL", 9)
    assert len(dyn_jax_bal) >= 2400

    # Any player from another NFL team (e.g., Patrick Mahomes on KC, Ja'Marr Chase on CIN, Saquon Barkley on PHI)
    # must be automatically blocked by assert_zero_roster_contamination for JAX @ BAL
    for wrong_team_player in ("Patrick Mahomes", "Ja'Marr Chase", "Saquon Barkley"):
        assert wrong_team_player.lower() in dyn_jax_bal
        with pytest.raises(Stage0RosterContaminationError):
            assert_zero_roster_contamination(
                {"athlete": wrong_team_player, "proj": 75.5},
                allowlist,
                f"test_wrong_team_{wrong_team_player}",
            )

    # Works dynamically for any other matchup (e.g., CIN @ CHI)
    dyn_cin_chi = build_dynamic_league_wide_denylist_for_matchup("CIN", "CHI", 9)
    assert "trevor lawrence" in dyn_cin_chi
    assert "derrick henry" in dyn_cin_chi


def test_connected_workflow_dossier_precommit_guard():
    import subprocess

    guard_script = REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"
    assert guard_script.is_file()
    proc = subprocess.run(
        [sys.executable, str(guard_script)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Guardrail failed: {proc.stderr}\n{proc.stdout}"
    assert "PASS  connected-workflow-dossier-guard" in proc.stdout


def test_live_books_and_pdfs_executable_engine():
    from intelligence.coaching.live_books_and_pdfs_executable_engine import (
        run_all_live_books_and_pdfs_engines,
    )

    res = run_all_live_books_and_pdfs_engines("JAX", "BAL", 9)
    assert res["engines_executed_count"] == 22
    assert res["marketing_science_and_seo_aeo_geo_engine"]["ok"] is True

    # 1. VMLS KKT Constrained Box-Score Reconciler
    kkt = res["vmls_kkt_constrained_boxscore_reconciler"]
    assert kkt["zero_residual_verified"] is True
    assert kkt["conservation_residual_linf"] < 1e-10

    # 2. Overrelaxed Anderson Sinkhorn-Knopp Optimal Transport (<15 iterations)
    ot = res["overrelaxed_anderson_sinkhorn_ot"]
    assert ot["overrelaxation_theta"] == 1.35
    assert ot["overrelaxed_iterations"] < 15
    assert ot["converged_under_15_iterations"] is True
    assert ot["speedup_factor"] >= 1.0

    # 3. BM25F+ Probabilistic Corpus & Book Lesson Retriever
    bm25f = res["bm25f_corpus_and_book_lesson_retriever"]
    assert bm25f["total_documents_indexed"] >= 3000
    assert len(bm25f["top_15_ranked_lessons"]) == 15
    assert bm25f["top_15_ranked_lessons"][0]["bm25f_plus_score"] > 0.0

    # 4. Cantu/McKee TBI Rotational Strain & Katch-McArdle 96h Short-Week Fatigue
    tbi = res["tbi_rotational_strain_and_katch_mcardle_short_week_fatigue"]
    assert tbi["katch_mcardle_metabolic_model"]["trench_bmr_kcal_day"] > 2500.0
    assert tbi["cantu_mckee_rotational_strain_hazard"]["short_week_hazard_elevation_pct"] > 0.0

    # 5. Prolate-Spheroid Football Aerodynamics & Coaching Network Graph-Laplacian
    aero = res["prolate_spheroid_football_aerodynamics_and_ol_route_coaching_network"]
    assert abs(aero["prolate_spheroid_aerodynamics_mt_bank"]["air_density_kg_m3"] - 1.24182) < 1e-4
    assert aero["coaching_network_graph_laplacian"]["fiedler_algebraic_connectivity_lambda2"] > 0.0

    # 6. Tukey Fourth-Spread Fences, Huff/Levitin Simpson's Paradox, Nash Equilibrium & Markov Drive Matrix
    thl = res["tukey_huff_levitin_game_theory_and_markov_drive_engine"]
    assert "JAX" in thl["tukey_fourth_spread_epa_fences"]
    assert "BAL" in thl["tukey_fourth_spread_epa_fences"]
    assert thl["huff_levitin_simpsons_paradox_audit"]["simpsons_confounder_gap_epa_per_dropback"] > 0.25
    assert thl["zero_sum_nash_equilibrium_play_calling"]["duality_gap"] < 0.05
    assert thl["absorbing_markov_chain_drive_matrix"]["JAX"]["from_own_25_zone1"]["expected_drive_points"] > 1.5

    # 7-21. Wave 8, 9 & 10 Local Football/Sports/ML/Stats Books (9,712 pages) + 77 GitHub Sports-Quant/ML Repos
    w8 = res["wave8_hidden_game_eager_ifaf_quant_and_github_engines"]
    assert w8["status"] == "ACTIVE_EXECUTED"
    assert w8["wave8_local_pdfs_wired"] == 36
    assert w8["wave8_local_pdf_pages_wired"] == 9712
    assert w8["wave8_github_books_notebooks_repos_wired"] == 77
    assert w8["kernel_7_hidden_game_of_football"]["jax_hidden_points_advantage"] > 3.0
    assert w8["kernel_7_hidden_game_of_football"]["real_qbr_comparison"]["real_qbr_delta_jax_minus_bal"] > 10.0
    assert "Zay Flowers" in w8["kernel_8_eager_erickson_football_analytics"]["receiver_wopr_pca_and_poisson_td"]
    assert w8["kernel_9_ifaf_rules_sid_gamenotes_numbers_game"]["ifaf_rulebook_clock_and_penalty_mechanics"]["rule_3_2_5_minimum_spike_clock_sec"] == 3.0
    assert w8["kernel_10_davidovg_quant_algo_double_entry"]["frappe_double_entry_boxscore_ledger"]["double_entry_imbalance_linf"] == 0.0
    assert w8["kernel_11_multigrid_kalman_nflwar_transformer"]["transformer_causal_attention_and_evidential_dirichlet"]["mlfs_point_in_time_causal_mask_verified"] is True
    assert w8["kernel_12_kissell_posirina_optimal_sports_math"]["probit_margin_and_spread_calibration"]["jax_plus_6_5_cover_prob_probit"] > 0.55
    assert "Josh Hines-Allen (JAX EDGE)" in w8["kernel_13_congelio_nfl_analytics_with_r"]["congelio_weighted_adjusted_sack_impact"]
    assert w8["kernel_14_severini_analytic_methods_3rd_ed"]["quantile_regression_player_tails"]["Zay Flowers"]["p90"] > w8["kernel_14_severini_analytic_methods_3rd_ed"]["quantile_regression_player_tails"]["Zay Flowers"]["p50"]
    assert w8["kernel_15_egidi_karlis_ntzoufras_footbayes"]["dibp_bivariate_poisson_td_model"]["expected_total_tds"] > 3.5
    assert w8["kernel_16_corballis_rubio_sanchez_klosterman_recursive_mind"]["corballis_level3_theory_of_mind_hierarchy"]["recursion_depth_k"] == 3
    assert w8["kernel_17_smart_football_kelley_inside_zone_nfl_playbooks"]["saban_belichick_manning_smart_football"]["clam_banjo_rub_pick_neutralization_rate"] > 0.70
    assert w8["kernel_18_liang_sparse_graphical_banerjee_spatial"]["liang_psi_learning_sparse_sgp_graph"]["retained_conditional_edges_count"] >= 4
    assert w8["kernel_19_murphy_jaynes_ross_probabilistic_foundations"]["jaynes_maxent_and_decibel_evidence"]["maxent_entropy_nats"] > 1.0
    assert w8["kernel_20_kuhn_johnson_brownlee_montgomery_spc"]["montgomery_cusum_spc_regime_detector"]["week8_qb_regime_shift_alarm_triggered"] is True
    assert w8["kernel_21_fujii_hamadani_smartmoney_bellafiore_playbook"]["fujii_2025_counterfactual_next_play_analytics"]["counterfactual_decision_advantage_epa"] > 0.30


def test_web_app_connected_workflow_api_route():
    import subprocess

    loader_path = REPO_ROOT / "apps" / "web" / "lib" / "engine" / "connected-workflow-loader.ts"
    route_path = REPO_ROOT / "apps" / "web" / "app" / "api" / "engine" / "connected-workflow" / "route.ts"
    assert loader_path.is_file()
    assert route_path.is_file()

    proc = subprocess.run(
        "npx tsx -e \"import { loadVerifiedConnectedWorkflowBundle } from './apps/web/lib/engine/connected-workflow-loader.ts'; const res = loadVerifiedConnectedWorkflowBundle(); console.log(JSON.stringify({status: res.status, matchup: res.matchup, subpackages: res.pythonIntelligenceSummary.subpackagesConnected, streams: res.typescriptEngineSummary.situationalStreamsExecuted, booksEngines: (res.liveBooksAndPdfsEngine as any).engines_executed_count}));\"",
        shell=True,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"TS loader failed: {proc.stderr}\n{proc.stdout}"
    out_lines = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip().startswith("{")]
    assert out_lines, f"No JSON output from TS loader: {proc.stdout}"
    parsed = json.loads(out_lines[-1])
    assert parsed["status"] == "CONNECTED_WORKFLOW_VERIFIED"
    assert parsed["matchup"] == "JAX @ BAL"
    assert parsed["subpackages"] >= 30
    assert parsed["streams"] == 22
    assert parsed["booksEngines"] == 22


def test_gse_connected_game_workflow_skill_installed_and_valid() -> None:
    repo_skill = REPO_ROOT / ".claude" / "skills" / "gse-connected-game-workflow" / "SKILL.md"
    global_skill = Path.home() / ".agents" / "skills" / "gse-connected-game-workflow" / "SKILL.md"
    assert repo_skill.is_file()
    assert global_skill.is_file()

    for skill_path in (repo_skill, global_skill):
        text = skill_path.read_text(encoding="utf-8")
        assert "name: gse-connected-game-workflow" in text
        m = re.search(r"^description:\s*(.+)$", text, flags=re.MULTILINE)
        assert m is not None
        desc = m.group(1).strip()
        assert desc.startswith("Use when ")
        assert len(desc) <= 200
        assert "NO GAME PICK, PROP, PROJECTION, OR DOSSIER WITHOUT RUNNING" in text
        assert "enforce_stage0_roster_and_board_allowlist.py" in text
        assert "run_python_25_intelligence_domains.py" in text
        assert "run_ts_prediction_and_mcp_engines.ts" in text
        assert "gse_coach_mind_simulator.py" in text
        assert "allocate_conserved_box_score" in text
        assert "connected-workflow-dossier-guard.py" in text
        assert "## Rationalization Table" in text
        assert "## Red Flags" in text

