#!/usr/bin/env python3
"""TDD gate verifying Stage-2 live corpus situational conditioner wiring."""

from __future__ import annotations

import ast
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
OPS_DIR = REPO_ROOT / "scripts" / "ops"
if str(OPS_DIR) not in sys.path:
    sys.path.insert(0, str(OPS_DIR))

from gse_coach_mind_simulator import (  # noqa: E402
    load_live_corpus_situational_conditioner,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)


def test_live_corpus_conditioner_loaded_with_all_six_families() -> None:
    cond = load_live_corpus_situational_conditioner()
    assert cond["loaded"] is True
    assert int(cond["sovereign_books_loaded"]) > 0
    assert int(cond["sovereign_primitives_routed"]) > 0
    expected_families = {
        "pressure",
        "weather",
        "restFatigue",
        "coveragePersonnel",
        "qbSkillScript",
        "marketMicrostructure",
    }
    assert expected_families.issubset(set(cond["six_family_priors"].keys()))


def test_workflow_source_imports_and_passes_corpus_conditioner() -> None:
    workflow_path = REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py"
    src = workflow_path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(workflow_path))

    imported_names: set[str] = set()
    sim_calls_with_kw = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in {
            "gse_coach_mind_simulator",
            "scripts.ops.gse_coach_mind_simulator",
        }:
            imported_names.update(alias.name for alias in node.names)
        if isinstance(node, ast.Call):
            func_name = node.func.id if isinstance(node.func, ast.Name) else ""
            if func_name == "simulate_matchup_pbp":
                kw_names = {kw.arg for kw in node.keywords if kw.arg}
                if "corpus_conditioner" in kw_names:
                    sim_calls_with_kw += 1

    assert "load_live_corpus_situational_conditioner" in imported_names
    assert sim_calls_with_kw >= 2
    assert '"corpus_situational_conditioner_applied"' in src
    assert '"corpus_conditioner_summary"' in src


def test_simulate_matchup_pbp_applies_corpus_conditioner_on_week10() -> None:
    cond = load_live_corpus_situational_conditioner()
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    sim = simulate_matchup_pbp(
        away="KC",
        home="ATL",
        away_inj={},
        home_inj={},
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=200,
        seed=20261115,
        corpus_conditioner=cond,
    )
    assert sim["corpus_situational_conditioner_applied"] is True
