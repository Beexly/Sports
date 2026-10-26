"""Fail-closed tests for score_driven_rating_update. Returns None on invalid input."""
import math
from grok_eq_score_driven_rating_update import score_driven_rating_update


def test_basic_update():
    res = score_driven_rating_update(1500.0, 16.0, 0.25)
    assert res is not None
    assert math.isclose(res, 1504.0, abs_tol=1e-6)


def test_negative_score():
    res = score_driven_rating_update(1200.0, 32.0, -0.5)
    assert res is not None
    assert math.isclose(res, 1184.0, abs_tol=1e-6)


def test_none_on_missing():
    assert score_driven_rating_update(None, 16.0, 0.1) is None
    assert score_driven_rating_update(1500.0, None, 0.1) is None
    assert score_driven_rating_update(1500.0, 16.0, None) is None


def test_none_on_nonpositive_k():
    assert score_driven_rating_update(1500.0, 0.0, 0.1) is None
    assert score_driven_rating_update(1500.0, -1.0, 0.1) is None


def test_none_on_extreme():
    assert score_driven_rating_update(1e13, 16.0, 0.1) is None
    assert score_driven_rating_update(1500.0, 16.0, 1e13) is None
