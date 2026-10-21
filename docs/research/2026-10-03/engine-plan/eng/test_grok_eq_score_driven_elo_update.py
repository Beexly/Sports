"""Fail-closed tests for score_driven_elo_update. Returns None on invalid input."""
import pytest
from grok_eq_score_driven_elo_update import score_driven_elo_update


def test_equal_ratings_win():
    # equal ratings, expected 0.5, win y=1, k=16 -> +8
    res = score_driven_elo_update(1500.0, 1500.0, 1.0, 16.0)
    assert res == pytest.approx(1508.0)


def test_equal_ratings_loss():
    res = score_driven_elo_update(1500.0, 1500.0, 0.0, 16.0)
    assert res == pytest.approx(1492.0)


def test_stronger_opponent_win():
    # higher expected for underdog
    res = score_driven_elo_update(1400.0, 1600.0, 1.0, 16.0)
    assert res > 1400.0
    assert res < 1416.0  # less than full k


def test_none_on_invalid():
    assert score_driven_elo_update(None, 1500.0, 1.0) is None
    assert score_driven_elo_update(1500.0, None, 1.0) is None
    assert score_driven_elo_update(1500.0, 1500.0, None) is None
    assert score_driven_elo_update(1500.0, 1500.0, 2.0) is None  # y not in [0,1]
    assert score_driven_elo_update("bad", 1500.0, 1.0) is None
