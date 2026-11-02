"""Trench flag wire. Executes ol_provider, dc_pressure, and the simulator helper.

Equations exercised: EQ-B7-02 EQ-B7-05 EQ-B7-07 EQ-B7-09 EQ-B8-09.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts" / "ops"))

from intelligence.coaching.dc_pressure import pressure_index_with_trench
from intelligence.coaching.ol_provider import weak_link_survival_for_grades
from intelligence.coaching.trench_pocket_physics import (
    analyze_qb_escape_vectors,
    compute_cox_weibull_pocket_survival,
    compute_fourth_down_uncertainty_gate,
    compute_pipping_adjusted_ol_efficiency,
    compute_ruscio_pressure_win_probability,
    compute_weak_link_ol_efficiency,
)
from gse_coach_mind_simulator import trench_survival_drop


def test_backup_lt_drops_weak_link_more_than_arithmetic_mean(monkeypatch):
    monkeypatch.setenv("ENABLE_TRENCH_POCKET_PHYSICS_V2", "1")
    other = [0.88, 0.86, 0.84, 0.85]
    elite_grades = [0.92, *other]
    backup_grades = [0.52, *other]
    elite = weak_link_survival_for_grades(elite_grades)
    backup = weak_link_survival_for_grades(backup_grades)
    arith_drop = (sum(elite_grades) / 5) - (sum(backup_grades) / 5)
    assert elite - backup > arith_drop
    report = trench_survival_drop(0.92, 0.52)
    assert report["enabled"] == 1.0
    assert report["drop"] > arith_drop
    pressure = pressure_index_with_trench(report["drop"])
    assert pressure["enabled"] == 1.0
    assert pressure["win_probability"] is not None


def test_named_trench_functions_execute():
    weak = compute_weak_link_ol_efficiency([0.92, 0.88, 0.86, 0.84, 0.52])
    assert weak["efficiency"] < weak["arithmetic_mean"]
    pip = compute_pipping_adjusted_ol_efficiency([0.9, 0.88, 0.86, 0.84, 0.82], opponent_pass_rush=0.4, chip_help=0.2)
    assert 0.0 < pip["pipping_survival"] < 1.0
    surv = compute_cox_weibull_pocket_survival(2.8, {"rusher_threat": 0.6})
    assert 0.0 < surv["survival_at_throw"] <= 1.0
    escape = analyze_qb_escape_vectors([(0, 0), (1, 0), (2, 0)], [(3, 0), (2, 0), (1, 0)])
    assert "mean_cosine" in escape
    wp = compute_ruscio_pressure_win_probability(0.8)
    assert 0.0 < wp["win_probability"] < 1.0
    gate = compute_fourth_down_uncertainty_gate([-0.02, -0.01, 0.0, 0.01, 0.02, 0.0, -0.01, 0.01])
    assert gate["suppress"] is True
    os.environ.pop("ENABLE_TRENCH_POCKET_PHYSICS_V2", None)
