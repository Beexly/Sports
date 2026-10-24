"""Tests for walk-forward tau tuning and Stream 4 RATF-Net & 7-Model Jump Contingency."""
from intelligence.props.regime_mixture import (
    evaluate_ratf_net_two_path_intermittent,
    evaluate_seven_model_jump_contingency,
    evaluate_rb_prop_with_regime_mixture,
    apply_pocket_penalty,
)


def test_ratf_net_and_seven_model_jump_contingency():
    ratf = evaluate_ratf_net_two_path_intermittent(
        p_active_regime=0.65,
        mu_jump_path=1.8,
        mu_smooth_path=0.9,
        intermittency_ratio=0.7,
    )
    assert ratf["forecast"] > 1.2
    assert ratf["regime"] == "INTERMITTENT_JUMP"

    jump = evaluate_seven_model_jump_contingency(
        hazards=[0.08, 0.12, 0.05, 0.22, 0.09, 0.11, 0.07],
    )
    assert 0.0 < jump["composite_hazard"] < 0.3
    assert 0.7 < jump["survival_prob"] < 1.0
    assert jump["dominant_model_index"] == 3


def test_rb_regime_mixture_and_pocket_penalty():
    res = evaluate_rb_prop_with_regime_mixture(
        base_carries=16.0,
        ypc=4.8,
        p_trail=0.35,
        line=64.5,
        player_name="Bijan Robinson",
    )
    assert res["projected_yards"] < res["unimodal_yards"]
    assert res["script_risk_flag"] is True
    penalized = apply_pocket_penalty(catch_rate=0.65, pocket_depth=3.45, pressure_rank=6)
    assert penalized < 0.65
