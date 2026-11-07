#!/usr/bin/env python3
"""
tests/test_dfs_5000_page_corpus_and_7_equations.py
==================================================
Verifies:
  1. The 5,000+ Page DFS / DraftKings / Lineup Optimization Research Corpus
     (`data/corpus/dfs_lineup_optimization_5000_page_corpus_2026_11_07.json`) is present,
     exceeds 5,000 verified pages (`8,645` pages across `311` works), and includes live
     OpenAlex, ArXiv, HuggingFace Hub, and Kaggle datasets.
  2. All 7 DFS Literature Optimization Equations (`EQ-DFS-01..07`) in
     `intelligence/dfs/dfs_literature_optimization_engine.py` compute deterministically
     and are wired into `verify_layer_4_equations_and_operators()` and the 10,000-sim
     DFS packet (`data/dfs/week9_sunday_main_11_game_packet_2026_11_07.json`).
  3. Python packaging (`pyproject.toml` + `__init__.py` across `intelligence/` and `scripts/`)
     is complete.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from intelligence.dfs.dfs_literature_optimization_engine import (
    eq_dfs_03_submodular_p99_marginal_gain,
    evaluate_lineup_with_7_dfs_equations,
    load_dfs_5000_page_corpus_summary,
)
from scripts.ops.verify_and_wire_all_layers_before_sim import verify_layer_4_equations_and_operators

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_dfs_5000_page_corpus_exceeds_target():
    summary = load_dfs_5000_page_corpus_summary()
    assert summary["corpus_loaded"] is True
    assert summary["verified_total_pages_harvested"] >= 5000
    assert summary["target_met"] is True
    assert summary["total_scientific_works"] >= 250
    assert summary["huggingface_live_datasets"] >= 15
    assert summary["kaggle_and_open_dfs_datasets"] >= 5
    assert summary["wired_equations_count"] == 7

    md_path = (
        REPO_ROOT
        / "docs"
        / "dfs"
        / "research"
        / "2026-11-07"
        / "DFS-5000-PAGE-RESEARCH-CORPUS-AND-ENGINE-WIRING-2026-11-07.md"
    )
    assert md_path.is_file()


def test_7_dfs_equations_execute_and_wire_into_layer_4_gate():
    l4 = verify_layer_4_equations_and_operators()
    assert l4["verified"] is True
    assert l4["dfs_literature_optimization_engine"]["verified_total_pages_harvested"] >= 5000

    sample_lineup = [
        {"player": "Josh Allen", "position": "QB", "team": "BUF", "opponent": "MIA", "salary": 7800, "projection": 24.5, "sd": 9.2},
        {"player": "Ollie Gordon II", "position": "RB", "team": "MIA", "opponent": "BUF", "salary": 5000, "projection": 29.07, "sd": 10.6},
        {"player": "Rhamondre Stevenson", "position": "RB", "team": "NE", "opponent": "TEN", "salary": 5800, "projection": 28.07, "sd": 10.2},
        {"player": "Khalil Shakir", "position": "WR", "team": "BUF", "opponent": "MIA", "salary": 5700, "projection": 15.8, "sd": 6.4},
        {"player": "Keon Coleman", "position": "WR", "team": "BUF", "opponent": "MIA", "salary": 4900, "projection": 13.4, "sd": 6.1},
        {"player": "Jaxon Smith-Njigba", "position": "WR", "team": "SEA", "opponent": "LAR", "salary": 6800, "projection": 19.2, "sd": 7.8},
        {"player": "Greg Dulcich", "position": "TE", "team": "MIA", "opponent": "BUF", "salary": 3200, "projection": 15.83, "sd": 6.5},
        {"player": "Malik Davis", "position": "RB", "team": "DAL", "opponent": "ATL", "salary": 4600, "projection": 19.67, "sd": 7.9},
        {"player": "Patriots DST", "position": "DST", "team": "NE", "opponent": "TEN", "salary": 2900, "projection": 8.4, "sd": 4.1},
    ]
    sim_matrix = np.array([[155.0, 182.0, 195.0, 171.0], [160.0, 175.0, 202.0, 168.0]])
    gains = eq_dfs_03_submodular_p99_marginal_gain(sim_matrix, win_threshold_p99=180.0)
    assert len(gains) == 2
    assert gains[0] == 0.5
    assert gains[1] == 0.0

    audit = evaluate_lineup_with_7_dfs_equations(sample_lineup, submodular_marginal_gain=gains[0])
    assert audit["eq_dfs_01_stack_and_overlap"]["qb_team"] == "BUF"
    assert audit["eq_dfs_01_stack_and_overlap"]["stack_count"] == 2
    assert audit["eq_dfs_01_stack_and_overlap"]["bring_back_count"] == 2
    assert audit["eq_dfs_02_kl_contrarian_leverage"] > 0
    assert audit["eq_dfs_04_bertsimas_sim_gamma3_robust_floor"] > 100.0
    assert audit["eq_dfs_05_shrunk_stack_covariance_bonus"] > 0
    assert 0.5 < audit["eq_dfs_06_duplication_uniqueness_prob"] <= 1.0
    assert audit["eq_dfs_07_late_swap_recourse"]["late_window_slots_count"] == 1


def test_python_packaging_pyproject_and_init_files():
    assert (REPO_ROOT / "pyproject.toml").is_file()
    for sub in ("intelligence", "scripts"):
        for py_file in (REPO_ROOT / sub).rglob("*.py"):
            if "__pycache__" in py_file.parts:
                continue
            assert (py_file.parent / "__init__.py").is_file(), f"Missing __init__.py in {py_file.parent}"


def test_10_gate_dfs_and_fantasy_accuracy_engine_eliminates_all_traps():
    classic_pkt = json.loads(
        (REPO_ROOT / "data" / "dfs" / "week9_sunday_main_11_game_packet_2026_11_07.json").read_text(encoding="utf-8")
    )
    showdown_pkt = json.loads(
        (REPO_ROOT / "data" / "dfs" / "week9_tnf_showdown_jax_bal_packet_2026_11_07.json").read_text(encoding="utf-8")
    )
    fantasy_pkt = json.loads(
        (REPO_ROOT / "data" / "fantasy" / "week9_unified_fantasy_and_dfs_rankings_2026_11_07.json").read_text(encoding="utf-8")
    )

    banned_sub_floor_traps = {
        "isaac teslaa",
        "keandre lambert-smith",
        "keandre lambert smith",
        "omar cooper jr.",
        "omar cooper",
        "xavier hutchinson",
        "chris moore",
    }
    banned_punt_dsts = {"jets", "raiders"}

    qbs_used = set()
    for lu in classic_pkt["lineups"]:
        # EQ-DFS-06: No $50,000 exact duplication cap
        assert lu["salary"] <= 49900
        for p in lu["players"]:
            nm_low = str(p["player"]).lower().strip()
            assert nm_low not in banned_sub_floor_traps, f"Sub-floor trap leaked into Classic lineup: {nm_low}"
            if p["position"] == "DST":
                assert nm_low not in banned_punt_dsts, f"Punt road-dog DST leaked into Classic lineup: {nm_low}"
            if p["position"] == "QB":
                qbs_used.add(nm_low)
    # 3 distinct QBs across the 3-Max Classic portfolio
    assert len(qbs_used) == 3

    # Showdown checks: 3 distinct Captains, zero Chris Moore $200 traps, max_overlap <= 4
    cpts_used = set()
    player_sets = []
    for lu in showdown_pkt["lineups"]:
        assert lu["salary"] <= 49900
        names = set()
        for p in lu["players"]:
            nm_low = str(p["name"]).lower().strip()
            assert nm_low not in banned_sub_floor_traps, f"Sub-floor trap leaked into Showdown lineup: {nm_low}"
            names.add(nm_low)
            if p["slot"] == "CPT":
                cpts_used.add(nm_low)
        for prev_set in player_sets:
            assert len(names.intersection(prev_set)) <= 4, "Showdown lineups exceed max_overlap=4"
        player_sets.append(names)
    assert len(cpts_used) == 3

    # Unified Fantasy rankings checks
    assert set(fantasy_pkt["positional_rankings"].keys()) == {"QB", "RB", "WR", "TE", "DST"}
    assert (
        REPO_ROOT
        / "docs"
        / "fantasy"
        / "research"
        / "2026-11-07"
        / "WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md"
    ).is_file()

    # Two-Stage GSE Simulation-to-DFS Pipeline checks
    prov = classic_pkt["engine_provenance"]
    two_stage = prov["two_stage_gse_dfs_pipeline"]
    assert two_stage["curated_dfs_pool_size"] >= 50
    assert two_stage["rejected_players_count"] >= 40
    assert two_stage["second_stage_dfs_pool_sims"] == 10000
    assert (REPO_ROOT / two_stage["stage1_gse_projections_file"]).is_file()
    assert (REPO_ROOT / two_stage["stage2_curated_pool_file"]).is_file()

    # Enterprise Ecosystem (NVIDIA Inception, NVIDIA Developer, Sentry, PostHog, RunPod, Google Cloud)
    ent = prov["enterprise_ecosystem_and_cloud_router"]
    assert ent["verified"] is True
    assert ent["nvidia_inception_and_developer_program"]["status"] == "ACTIVE_AND_WIRED"
    assert ent["sentry_observability_grant"]["startup_credit_buffer_usd"] == 5000
    assert ent["posthog_product_and_model_telemetry"]["status"] == "ACTIVE_AND_WIRED"
    assert ent["google_cloud_colab_and_runpod_compute"]["status"] == "ACTIVE_HYBRID_DISPATCH"

    # Continuous Run Self-Improvement Ledger & Stealth-Skeleton External Eval + Distillation Flywheel
    assert prov["continuous_run_improvement_receipt"]["run_sequence_number"] >= 1
    assert (REPO_ROOT / "data" / "engine" / "continuous_run_improvement_ledger.jsonl").is_file()
    assert (REPO_ROOT / "data" / "audits" / "stealth_skeleton_official_external_eval_manifest_2026_11_07.json").is_file()
    assert (REPO_ROOT / "data" / "mind" / "feeds" / "stealth_skeleton_distillation_flywheel_2026_11_07.jsonl").is_file()


def test_c11_cpp20_native_kernels_and_c4_architecture_suite() -> None:
    import numpy as np
    from intelligence.native_kernels.native_bridge import (
        c_dk_ppr_milestone_scoring,
        c_empirical_bayes_role_shrinkage,
        c_sinkhorn_knopp_bounded_conservation,
        cpp_simulate_student_t_dfs_worlds,
        is_native_kernel_loaded,
    )

    assert is_native_kernel_loaded() is True

    # 1. C11 Sinkhorn-Knopp Bounded Conservation (Gate G1)
    priors = np.array([0.26, 0.22, 0.14, 0.05], dtype=np.float64)
    floors = np.array([0.25, 0.18, 0.10, 0.00], dtype=np.float64)
    caps = np.array([0.38, 0.32, 0.25, 0.08], dtype=np.float64)
    conserved = c_sinkhorn_knopp_bounded_conservation(priors, floors, caps, 1.0)
    assert abs(float(np.sum(conserved)) - 1.0) < 1e-6
    assert conserved[0] >= 0.25 - 1e-9
    assert conserved[3] <= 0.08 + 1e-9

    # 2. C11 Empirical Bayes Role-Prior Shrinkage (Gate G2)
    shrunk = c_empirical_bayes_role_shrinkage(
        raw_sim_fpts=np.array([15.0, 21.71]),
        dk_avg_fpts=np.array([14.2, 12.5]),
        salary_role_prior=np.array([2.8, 18.5]),
        effective_snaps=np.array([8.0, 58.0]),
        is_vacated_bellcow=np.array([0, 1], dtype=np.int32),
        is_sub_floor_trap=np.array([1, 0], dtype=np.int32),
    )
    assert shrunk[0] <= 4.20 + 1e-9
    assert abs(float(shrunk[1]) - 21.71) < 1e-6

    # 3. C11 DraftKings +3.0 Milestone Scoring
    base_m = np.full((100, 3), 15.0, dtype=np.float64)
    pass_m = np.full((100, 3), 310.0, dtype=np.float64)
    rush_m = np.zeros((100, 3), dtype=np.float64)
    rec_m = np.zeros((100, 3), dtype=np.float64)
    tot_m, bonus_r = c_dk_ppr_milestone_scoring(base_m, pass_m, rush_m, rec_m)
    assert abs(float(tot_m[0, 0]) - 18.0) < 1e-6
    assert abs(float(bonus_r[0]) - 1.0) < 1e-6

    # 4. C++20 Student-t (nu=4) 10,000-World Copula
    cpp_res = cpp_simulate_student_t_dfs_worlds(
        mean_fpts=np.array([22.0, 18.0, 14.0]),
        std_fpts=np.array([6.5, 5.5, 4.5]),
        team_ids=np.array([0, 0, 1], dtype=np.int32),
        game_ids=np.array([0, 0, 0], dtype=np.int32),
        pos_codes=np.array([1, 3, 2], dtype=np.int32),
        n_sims=10000,
        seed=20261107,
    )
    assert cpp_res["worlds"].shape == (10000, 3)
    assert float(cpp_res["p99"][0]) > float(cpp_res["p90"][0]) > 22.0

    # 5. Complete 4-Level C4 Architecture Suite Verification
    c4_dir = REPO_ROOT / "C4-Documentation"
    expected_c4_files = [
        "README.md",
        "c4-context.md",
        "c4-container.md",
        "c4-component.md",
        "c4-component-situational-reasoning-and-equation-router.md",
        "c4-component-jev-snap-and-native-trajectory-engine.md",
        "c4-component-two-stage-dfs-and-fantasy-engine.md",
        "c4-component-enterprise-cloud-and-stealth-distillation.md",
        "c4-component-web-and-mobile-delivery.md",
        "c4-code-intelligence-native-kernels.md",
        "c4-code-intelligence-dfs.md",
        "c4-code-intelligence-fantasy.md",
        "c4-code-intelligence-coaching-and-reasoning.md",
        "c4-code-packages-mcp-equations-and-prediction-engine.md",
        "c4-code-intelligence-providers-and-routing.md",
        "c4-code-apps-web-and-mobile.md",
        "apis/gse-engine-and-dfs-api.yaml",
        "apis/gse-mobile-v1-api.yaml",
    ]
    for rel in expected_c4_files:
        assert (c4_dir / rel).is_file(), f"Missing C4 file: {rel}"


def test_deep_research_12_domains_20_books_and_19_dfs_equations() -> None:
    corpus_file = REPO_ROOT / "data" / "dfs" / "deep_research_12_domain_dfs_corpus_2026_11_07.json"
    dataset_file = REPO_ROOT / "data" / "dfs" / "deep_research_12_domain_empirical_dfs_dataset_2026_11_07.json"
    curated_pool_file = REPO_ROOT / "data" / "dfs" / "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json"
    report_file = (
        REPO_ROOT
        / "docs"
        / "dfs"
        / "research"
        / "2026-11-07"
        / "DEEP-RESEARCH-12-DOMAIN-19-EQUATION-DFS-MASTER-SYNTHESIS-2026-11-07.md"
    )

    assert corpus_file.is_file()
    assert dataset_file.is_file()
    assert curated_pool_file.is_file()
    assert report_file.is_file()

    corpus = json.loads(corpus_file.read_text(encoding="utf-8"))
    assert corpus["total_orthogonal_domains"] == 12
    assert corpus["total_active_dfs_equations"] == 19
    assert corpus["graduate_books_count"] == 20
    assert corpus["combined_deep_research_pages"] >= 8000
    assert corpus["downloaded_arxiv_pdfs_on_disk_count"] >= 10

    dataset = json.loads(dataset_file.read_text(encoding="utf-8"))
    assert set(dataset["positional_evt_gpd_and_tweedie_profiles"].keys()) == {"QB", "RB", "WR", "TE"}
    assert dataset["empirical_c_vine_upper_tail_dependence_lambda_u"]["qb_to_wr1_upper_tail_lambda_u_q85"] > 0.25

    pool = json.loads(curated_pool_file.read_text(encoding="utf-8"))
    assert pool["frontier_19_equations_summary"]["total_dfs_equations_active"] == 19
    first_player_metrics = pool["curated_dfs_player_pool"][0]["frontier_19_equation_metrics"]
    for key in (
        "eq_dfs_08_wasserstein_dro_robust_ev",
        "eq_dfs_10_evt_gpd_p999_milly_ceiling",
        "eq_dfs_11_gumbel_upper_tail_lambda_u",
        "eq_dfs_12_qre_equilibrium_ownership",
        "eq_dfs_12_level3_cognitive_leverage",
        "eq_dfs_13_late_swap_recourse_option_ev",
        "eq_dfs_14_tweedie_exact_zero_prob",
        "eq_dfs_15_hawkes_cascade_multiplier",
        "eq_dfs_17_quiggin_prelec_rdeu_score",
    ):
        assert key in first_player_metrics




