"""Fail-closed tests for score_driven_rating_update from arXiv:2604.09143 eq (6)."""
from grok_eq_score_driven_rating import score_driven_rating_update


def test_basic_update():
    assert score_driven_rating_update(1500.0, 0.1, 2.0) == 1500.2


def test_negative_score():
    assert score_driven_rating_update(1600.0, 0.05, -4.0) == 1599.8


def test_zero_score_no_change():
    assert score_driven_rating_update(1400.0, 1.0, 0.0) == 1400.0


def test_none_on_bad_k():
    assert score_driven_rating_update(1500.0, 0.0, 1.0) is None
    assert score_driven_rating_update(1500.0, -0.1, 1.0) is None


def test_none_on_none_or_nonfinite():
    assert score_driven_rating_update(None, 0.1, 1.0) is None
    assert score_driven_rating_update(1500.0, None, 1.0) is None
    assert score_driven_rating_update(1500.0, 0.1, None) is None
    assert score_driven_rating_update(float("inf"), 0.1, 1.0) is None
    assert score_driven_rating_update(1500.0, 0.1, float("nan")) is None
    assert score_driven_rating_update("bad", 0.1, 1.0) is None
