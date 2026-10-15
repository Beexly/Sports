"""Fail-closed tests for score_driven_elo_update."""

import pytest
from grok_eq_score_driven_rating import score_driven_elo_update

def test_equal_ratings_win():
    # equal ratings, A wins: expected 0.5, update +8
    new_r = score_driven_elo_update(1200.0, 1200.0, 1.0)
    assert abs(new_r - 1208.0) < 1e-9

def test_equal_ratings_loss():
    new_r = score_driven_elo_update(1200.0, 1200.0, 0.0)
    assert abs(new_r - 1192.0) < 1e-9

def test_stronger_opponent_win():
    # A 1000 vs B 1400, A wins: expected small, big gain
    new_r = score_driven_elo_update(1000.0, 1400.0, 1.0)
    expected_p = 1.0 / (1.0 + 10.0 ** (-(1000-1400)/400.0))
    assert abs(new_r - (1000.0 + 16.0 * (1.0 - expected_p))) < 1e-9

def test_fail_closed_bad_y():
    with pytest.raises(ValueError):
        score_driven_elo_update(1200.0, 1200.0, 0.5)

def test_fail_closed_non_numeric():
    with pytest.raises(ValueError):
        score_driven_elo_update("1200", 1200.0, 1.0)
