"""Tests for Stream 4 Situational WP Gaps and Stream 11 Reconstructed NFL Equations."""
from intelligence.coaching.situational_wp import (
    evaluate_timeout_preserve_vs_ice_value,
    evaluate_coach_challenge_ev,
    evaluate_prevent_defense_regime,
    evaluate_end_of_half_clock_boundary,
)
from intelligence.nfl_re import equations as eq


def test_situational_wp_stream4_gaps():
    t_res = evaluate_timeout_preserve_vs_ice_value(53.0, 50.0, -3.0, 2)
    assert t_res["recommendation"] == "PRESERVE_TIMEOUT"
    assert t_res["net_preserve_advantage_wp"] > 0

    c_res = evaluate_coach_challenge_ev("BOUNDARY_CATCH", 0.14, 3, 180.0, -4.0)
    assert c_res["should_challenge"] is True
    assert c_res["expected_net_wp"] > 0.01

    p_res = evaluate_prevent_defense_regime(17.0, 300.0)
    assert p_res["prevent_active"] is True
    assert p_res["underneath_completion_lift"] > 0

    h_res = evaluate_end_of_half_clock_boundary(1, 45.0, 1, 25.0, True)
    assert h_res["double_dip_middle_eight_bonus_wp"] == 0.038
    assert h_res["clock_runoff_urgency_multiplier"] > 1.4


def test_stream11_reconstructed_nfl_equations():
    assert abs(eq.yacoe(7.2, 4.0) - 3.2) < 1e-6
    assert abs(eq.ryoe(6.5, 3.5) - 3.0) < 1e-6
    assert abs(eq.cpoe(22.0, 30.0, 19.5) - 8.3333333) < 1e-4
    p_comp = eq.completion_probability(
        air_yards=12.0,
        yards_to_go=7.0,
        down=2,
        absolute_yardline=65.0,
        separation=3.5,
        cushion=5.2,
        closing_speed=2.4,
    )
    assert 0.35 < p_comp < 0.90
    p_man = eq.hmm_coverage_decode(dx=1.2, dy=0.5, follow=1, dt=0.5)
    assert 0.5 < p_man < 0.99
