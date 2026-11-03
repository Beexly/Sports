"""Executes the trench pocket physics functions. No Gaussian shortcut."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from intelligence.coaching.trench_pocket_physics import (
    analyze_qb_escape_vectors,
    compute_cox_weibull_pocket_survival,
    compute_fourth_down_uncertainty_gate,
    compute_weak_link_ol_efficiency,
    cox_weibull_block_survival,
    weak_link_am_gm_clean_pocket_prob,
)


def test_pass_set_attainment_uses_observed_depths_only():
    from intelligence.coaching.trench_pocket_physics import pass_set_depth_attainment
    report = pass_set_depth_attainment([1.4, 0.6, 1.2, 0.9], expected_depth=1.10)
    assert report["attainment"] == 0.5
    assert report["expected_depth_yds"] == 1.10
    try:
        pass_set_depth_attainment([])
    except ValueError as exc:
        assert "invent" in str(exc)
    else:
        raise AssertionError("empty depths must refuse")
    import os
    os.environ["ENABLE_TRENCH_POCKET_PHYSICS_V2"] = "1"
    from intelligence.coaching.ol_provider import ol_pass_set_report
    wired = ol_pass_set_report([1.4, 0.6, 1.2, 0.9])
    assert wired["enabled"] is True
    assert wired["attainment"] == 0.5
    grades = [0.92, 0.90, 0.88, 0.86, 0.52]
    report = compute_weak_link_ol_efficiency(grades)
    base = weak_link_am_gm_clean_pocket_prob(grades)
    assert report["efficiency"] == base["true_weak_link_product_prob"]
    assert report["efficiency"] < report["arithmetic_mean"]


def test_cox_survival_falls_as_route_time_grows():
    early = compute_cox_weibull_pocket_survival(1.5)
    late = cox_weibull_block_survival(t_pass=3.2, rusher_threat_z=1.1, stunt_active=True)
    assert early["survival_at_throw"] > late["survival_at_throw"]


def test_escape_vector_classifies_step_into_pressure():
    qb = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]
    breach = [(2.0, 0.0), (2.5, 0.0), (3.0, 0.0)]
    report = analyze_qb_escape_vectors(qb, breach)
    assert report["classification"] == "QB_STEPS_INTO_PRESSURE"


def test_fourth_down_gate_suppresses_interval_that_straddles_zero():
    report = compute_fourth_down_uncertainty_gate([-0.03, -0.01, 0.0, 0.02, 0.01, -0.02, 0.0, 0.01, 0.0])
    assert report["suppress"] is True


def test_bayesian_shrink_p2s_and_apply_trench_pocket_shock():
    from scripts.ops.trench_pocket_physics import apply_trench_pocket_shock, bayesian_shrink_p2s
    shrunk = bayesian_shrink_p2s(observed_p2s=0.310, pressures=15, prior_p2s=0.185, k_pressures=30.0)
    assert 0.185 < shrunk < 0.310
    shock = apply_trench_pocket_shock(
        base_sack_prob=0.068,
        ol_grades=[0.90, 0.88, 0.86, 0.84, 0.62],
        dl_pass_rush_threat=0.55,
        chip_help=0.15,
        qb_p2s=0.214,
    )
    assert shock["weak_link_efficiency"] < shock["arithmetic_mean"]
    assert shock["am_gm_gap"] > 0.0
    assert 0.025 <= shock["adjusted_sack_prob"] <= 0.180


