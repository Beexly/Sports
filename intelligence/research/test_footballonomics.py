"""Equation (4) loads. Net benefit loads only on a measured bin."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from research.footballonomics import FourthDownGap, expected_benefit, gamma, net_benefit, net_from_measurement


def test_gamma_uses_the_paper_drive_length():
    # Own 20 means 80 yards to go. 80/29.
    assert abs(gamma(20.0) - (80.0 / 29.0)) < 1e-9


def test_benefit_at_the_goal_line_is_six_times_the_rate():
    # l=100, gamma=0, any rate ** 0 = 1, benefit = 6.
    assert expected_benefit(0.5, 100.0) == 6.0


def test_net_refuses_without_delta_pi():
    try:
        net_benefit(0.5, 50.0, 0.8, None, None)
    except FourthDownGap as exc:
        assert "delta_pi" in str(exc)
    else:
        raise AssertionError("missing delta_pi must not become a recommendation")


def test_measured_bin_is_not_a_pick():
    import json
    path = os.path.join(ROOT, "research", "data", "fourth_down_delta_pi.json")
    table = json.load(open(path, encoding="utf-8"))
    assert table["touchback"]["modal_own_yard_by_season"]["2025"] == 35
    assert table["touchback"]["touchback_own_yard"]["from_2024"] == 30
    # Offense at the opponent's 40. Opponent starts at their own 40, bin 60-69.
    out = net_from_measurement(table, 40, 48, 0.5386836027713626)
    assert out["opponent_start_bin"] == "60-69"
    assert out["publishes_pick"] is False
    assert out["weight"] is None
    assert out["net"] is not None


def test_thin_kick_bin_raises():
    try:
        net_from_measurement({"downs_bins": [], "field_goal_bins": []}, 40, 70, 0.5)
    except FourthDownGap:
        pass
    else:
        raise AssertionError("missing bins must raise")
