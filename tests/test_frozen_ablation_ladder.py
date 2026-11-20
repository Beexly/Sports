"""Tests for frozen walk-forward calibration evaluator & JSON ablation config ladder."""
from __future__ import annotations

import math

import pytest

from evaluation.frozen.score_walkforward_calibration_v1 import (
    adaptive_conformal_online_calibration,
    apply_calibration_transform,
    brier_score,
    expected_calibration_error,
    paired_brier_empirical_bernstein_lcb,
    score_predictions,
    venn_abers_interval_width,
)
from scripts.calibration.run_frozen_ablation_ladder import (
    load_ablation_configs,
    run_all_ablations,
)


def test_identity_fixed_point_and_perfect_oracle_separation() -> None:
    y_small = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1] * 4
    champ_small = [0.45, 0.55] * 20
    # Identity fixed point: champion == challenger -> mean_improvement == 0 and lcb == 0
    same = paired_brier_empirical_bernstein_lcb(y_small, champ_small, champ_small)
    assert same["mean_improvement"] == 0.0
    assert same["lcb"] == 0.0

    # Small sample (n=40): Maurer-Pontil range=2 finite-sample penalty stays conservative
    oracle_small = [0.98 if yi == 1 else 0.02 for yi in y_small]
    vs_small = paired_brier_empirical_bernstein_lcb(y_small, champ_small, oracle_small)
    assert vs_small["mean_improvement"] > 0.15
    assert vs_small["lcb"] < 0.0

    # Sufficient sample (n=250): near-oracle strictly clears noisy champion with positive EB-LCB
    y = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1] * 25
    champ = [0.45, 0.55] * 125
    oracle = [0.98 if yi == 1 else 0.02 for yi in y]
    vs_oracle = paired_brier_empirical_bernstein_lcb(y, champ, oracle)
    assert vs_oracle["mean_improvement"] > 0.15
    assert vs_oracle["lcb"] > 0.05


def test_ece_includes_zero_and_one_boundaries_and_venn_abers_is_bounded() -> None:
    ece = expected_calibration_error([0, 1], [0.0, 1.0], n_bins=10)
    assert ece == pytest.approx(0.0, abs=1e-6)
    tr_p = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 0.2, 0.8]
    tr_y = [0, 0, 0, 0, 1, 1, 1, 1, 0, 1]
    mids, width = venn_abers_interval_width(tr_p, tr_y, [0.15, 0.5, 0.85])
    assert all(0.0 < m < 1.0 for m in mids)
    assert 0.0 <= width <= 1.0
    transformed, _ = apply_calibration_transform([0.2, 0.8], temp_scale=0.88, conformal_shrinkage=0.04)
    assert all(0.0 < p < 1.0 for p in transformed)
    assert transformed[0] > 0.2 and transformed[1] < 0.8


def test_frozen_ablation_configs_and_walkforward_runner_execute_cleanly() -> None:
    cfgs = load_ablation_configs()
    names = {c["name"] for c in cfgs}
    assert {"ladder_0_raw", "ladder_1_temp_scale", "ladder_2_conformal_shrink", "ladder_3_venn_abers_shrink"}.issubset(names)
    report = run_all_ablations(write_receipt=False)
    assert len(report["slices"]) == 5
    for sl in report["slices"]:
        assert sl["test_n"] >= 20
        for cname, cmetrics in sl["configs"].items():
            assert math.isfinite(float(cmetrics["brier"]))
            assert math.isfinite(float(cmetrics["ece"]))
            assert 0.0 <= float(cmetrics["mean_venn_abers_width"]) <= 1.0
    # Smoke score_predictions directly
    s = score_predictions([0, 1, 1, 0], [0.1, 0.9, 0.8, 0.2], [0.01, 0.02, 0.01, -0.01])
    assert s["brier"] < 0.05 and s["clv_mean"] > 0.0
    assert brier_score([0, 1], [0.1, 0.9]) == pytest.approx(0.01, abs=1e-6)


def test_adaptive_conformal_online_calibration_strictly_sequential() -> None:
    p_stream = [0.75, 0.75, 0.75, 0.75, 0.75, 0.75]
    y_a = [0, 0, 0, 0, 0, 0]
    y_b = [0, 0, 0, 1, 1, 1]
    cal_a, alpha_a = adaptive_conformal_online_calibration(p_stream, y_a, gamma=0.08)
    cal_b, alpha_b = adaptive_conformal_online_calibration(p_stream, y_b, gamma=0.08)
    # Strict causal prefix equality: steps 0..3 only depend on y[0..2], identical between y_a and y_b
    assert cal_a[:4] == cal_b[:4]
    assert alpha_a[:4] == alpha_b[:4]
    # Later steps diverge and cal_a adapts downward toward realized 0 base rate
    assert cal_a[5] < cal_a[0]
    assert all(0.0 < v < 1.0 for v in cal_a)
    assert all(0.01 <= a <= 0.45 for a in alpha_a)
