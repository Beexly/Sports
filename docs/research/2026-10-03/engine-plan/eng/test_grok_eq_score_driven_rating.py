"""Fail-closed tests for score_driven_rating_update. Returns None on invalid input."""
import pytest
from grok_eq_score_driven_rating import score_driven_rating_update


def test_valid_update():
    res = score_driven_rating_update(1500.0, 20.0, 0.3)
    assert res is not None
    assert res == pytest.approx(1506.0)


def test_negative_score():
    res = score_driven_rating_update(1500.0, 16.0, -0.5)
    assert res is not None
    assert res == pytest.approx(1492.0)


def test_none_on_missing():
    assert score_driven_rating_update(None, 20.0, 0.1) is None
    assert score_driven_rating_update(1500.0, None, 0.1) is None
    assert score_driven_rating_update(1500.0, 20.0, None) is None


def test_none_on_k_nonpositive():
    assert score_driven_rating_update(1500.0, 0.0, 0.1) is None
    assert score_driven_rating_update(1500.0, -5.0, 0.1) is None


def test_none_on_nonnumeric():
    assert score_driven_rating_update("bad", 20.0, 0.1) is None
    assert score_driven_rating_update(1500.0, "bad", 0.1) is None
