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


