"""
Tests for GSI ADR-0003 Bilateral Step-and-Turn Kinematics Mirror.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from evaluation.gsi.biomechanical_step_turn_kinematics import (
    evaluate_bilateral_cut_kinematics,
    run_benchmark,
)


def test_gsi_adr0003_rule_in_never_clears_even_when_symmetric() -> None:
    sym = evaluate_bilateral_cut_kinematics(
        left_kappa=8.0,
        right_kappa=7.9,
        left_stride_m=1.18,
        right_stride_m=1.19,
    )
    assert sym["rule_in_only_doctrine"] is True
    assert sym["return_to_play_clearance_permitted"] is False
    assert sym["alert_triggered"] is False

    asym = evaluate_bilateral_cut_kinematics(
        left_kappa=10.5,
        right_kappa=6.2,
        left_stride_m=1.22,
        right_stride_m=1.01,
    )
    assert asym["rule_in_only_doctrine"] is True
    assert asym["return_to_play_clearance_permitted"] is False
    assert asym["alert_triggered"] is True


def test_gsi_validation_and_strict_repo_isolation() -> None:
    with pytest.raises(ValueError):
        evaluate_bilateral_cut_kinematics(0.0, 5.0, 1.1, 1.1)
    with pytest.raises(ValueError):
        evaluate_bilateral_cut_kinematics(5.0, float("nan"), 1.1, 1.1)

    bench = run_benchmark()
    assert bench["rule_in_doctrine_preserved"] is True

    mod_path = Path(__file__).resolve().parents[1] / "evaluation" / "gsi" / "biomechanical_step_turn_kinematics.py"
    tree = ast.parse(mod_path.read_text(encoding="utf-8"))
    imported = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.extend(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.append(node.module)
    assert not any(m.startswith(("intelligence", "scripts", "apps")) for m in imported)
