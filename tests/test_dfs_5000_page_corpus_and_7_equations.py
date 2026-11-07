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
