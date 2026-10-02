"""The rating equation recovers a known system. It does not emit Table 1."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from research.iwinrnfl import StandardizationMissing, home_win_probability
from research.iwinrnfl_ratings import RatingGap, before, expected_margin, fit, paper_normal_approx


def test_known_system_is_recovered():
    # h=2, A=3, B=-1, C=-2. Sum of ratings is 0.
    games = [
        {"season": 2024, "week": 1, "home": "A", "away": "B", "margin": 6.0},
        {"season": 2024, "week": 1, "home": "A", "away": "C", "margin": 7.0},
        {"season": 2024, "week": 1, "home": "B", "away": "C", "margin": 3.0},
        {"season": 2024, "week": 2, "home": "B", "away": "A", "margin": -2.0},
        {"season": 2024, "week": 2, "home": "C", "away": "A", "margin": -3.0},
        {"season": 2024, "week": 2, "home": "C", "away": "B", "margin": 1.0},
    ]
    solved = fit(games)
    assert abs(float(solved["home_edge"]) - 2.0) < 1e-6
    ratings = solved["ratings"]
    assert abs(ratings["A"] - 3.0) < 1e-6
    assert abs(ratings["B"] - (-1.0)) < 1e-6
    assert abs(ratings["C"] - (-2.0)) < 1e-6
    margin = expected_margin(solved, "A", "C")
    assert abs(float(margin["expected_margin"]) - 7.0) < 1e-6
    assert margin["publishes_pick"] is False
    assert margin["weight"] is None


def test_week_w_cannot_see_week_w():
    games = [
        {"season": 2026, "week": 3, "home": "A", "away": "B", "margin": 10.0},
        {"season": 2026, "week": 4, "home": "A", "away": "B", "margin": -20.0},
        {"season": 2025, "week": 18, "home": "B", "away": "A", "margin": 1.0},
        {"season": 2025, "week": 17, "home": "A", "away": "B", "margin": 1.0},
    ]
    visible = before(games, 2026, 4)
    assert all(int(g["week"]) < 4 or int(g["season"]) < 2026 for g in visible)
    assert len(visible) == 3


def test_empty_window_raises():
    try:
        fit([])
    except RatingGap:
        pass
    else:
        raise AssertionError("empty window must not invent ratings")


def test_table_one_still_refuses():
    try:
        home_win_probability({"score_differential": 7})
    except StandardizationMissing:
        pass
    else:
        raise AssertionError("rating fit must not unlock Table 1")


def test_sigma_14_is_labeled_not_fitted():
    approx = paper_normal_approx(0.0)
    assert approx["probability"] == 0.5
    assert approx["sigma_points"] == 14.0
    assert "not fitted" in str(approx["sigma_source"])
    assert approx["publishes_pick"] is False
