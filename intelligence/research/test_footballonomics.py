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
    cells = json.load(open(os.path.join(ROOT, "research", "data", "fourth_down_conversion_cells.json"), encoding="utf-8"))
    # 1 yard to go at the opponent's 40. The cell rate is not the league 0.5387.
    out = net_from_measurement(table, 40, 48, 1, cells)
    assert out["opponent_start_bin"] == "60-69"
    assert out["conversion_grain"] == "yards_to_go x field"
    assert abs(out["conversion_rate"] - 0.5386836027713626) > 0.05
    assert out["publishes_pick"] is False
    assert out["weight"] is None
    assert out["net"] is not None


def test_thin_conversion_cell_does_not_use_the_league_rate():
    import json
    table = json.load(open(os.path.join(ROOT, "research", "data", "fourth_down_delta_pi.json"), encoding="utf-8"))
    cells = json.load(open(os.path.join(ROOT, "research", "data", "fourth_down_conversion_cells.json"), encoding="utf-8"))
    try:
        # 3 yards at the 15. Cell n=31, withheld. Opponent starts in bin 80-89, which is measured, so the raise is the conversion cell.
        net_from_measurement(table, 15, 48, 3, cells)
    except FourthDownGap as exc:
        assert "league rate is not used" in str(exc)
    else:
        raise AssertionError("thin cell must not borrow the league rate")


def test_thin_kick_bin_raises():
    try:
        net_from_measurement({"downs_bins": [], "field_goal_bins": []}, 40, 70, 1, {"by_yards_and_field": []})
    except FourthDownGap:
        pass
    else:
        raise AssertionError("missing bins must raise")
