"""Fail-closed tests for score_driven_rating_update. Returns None on invalid input."""
import math
from grok_eq_score_driven_rating_update import score_driven_rating_update


def test_valid_positive():
    res = score_driven_rating_update(1500.0, 32.0, 0.5)
    assert res is not None
    assert abs(res - 1516.0) < 1e-9
    assert math.isfinite(res)


def test_valid_negative_score():
    res = score_driven_rating_update(1600.0, 20.0, -0.3)
    assert res is not None
    assert abs(res - 1594.0) < 1e-9


def test_none_on_nonpositive_K():
    assert score_driven_rating_update(1500.0, 0.0, 0.1) is None
    assert score_driven_rating_update(1500.0, -1.0, 0.1) is None


def test_none_on_missing():
    assert score_driven_rating_update(None, 32.0, 0.1) is None
    assert score_driven_rating_update(1500.0, None, 0.1) is None
    assert score_driven_rating_update(1500.0, 32.0, None) is None


def test_none_on_non_numeric():
    assert score_driven_rating_update("bad", 32.0, 0.1) is None
    assert score_driven_rating_update(1500.0, "bad", 0.1) is None
    assert score_driven_rating_update(1500.0, 32.0, "bad") is None


def test_none_on_inf():
    assert score_driven_rating_update(float("inf"), 32.0, 0.1) is None
    assert score_driven_rating_update(1500.0, float("nan"), 0.1) is None
