"""Equation (4) loads. Net benefit does not, until delta_pi is measured."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from research.footballonomics import FourthDownGap, expected_benefit, gamma, net_benefit


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
