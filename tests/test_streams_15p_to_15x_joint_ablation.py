"""
Tests for Joint Multi-Stream Meta-Stacking, 13x13 Collinearity Audit, and Frozen
Calibration Ablation across Streams 15P..16B (`2026` Weeks 4..10).
"""

from __future__ import annotations

import math

from scripts.calibration.evaluate_streams_15p_to_15x_joint_ablation import (
    STREAM_NAMES,
    extract_causal_game_feature_matrix,
    run_joint_ablation_and_collinearity_audit,
)


def test_joint_ablation_collinearity_and_walkforward_oos_receipt() -> None:
    df = extract_causal_game_feature_matrix(min_week=4, max_week=10)
    assert len(df) >= 100
    for name in STREAM_NAMES:
        assert name in df.columns

    res = run_joint_ablation_and_collinearity_audit()
    assert res["n_oos_eval_w5_w10"] >= 80
    # Must surface true high-collinearity pair 15V vs 15X cleanly (|r| >= 0.70)
    top_pairs = {(d["a"], d["b"]): abs(float(d["pearson_r"])) for d in res["top_collinear_pairs"]}
    assert any(r >= 0.70 for r in top_pairs.values())

    bench = res["oos_benchmarks"]
    ridge = bench["ridge_orthogonal_stack"]
    eq = bench["equal_weight_z_stack"]
    coin = bench["coin_flip_050"]

    assert ridge["brier"] < coin["brier"]
    assert ridge["log_loss"] < coin["log_loss"]
    assert ridge["ece"] < eq["ece"]
    assert ridge["composite_objective"] < eq["composite_objective"]
    assert math.isfinite(float(res["baker_mchale_kelly_vs_close"]["net_pnl"]))
