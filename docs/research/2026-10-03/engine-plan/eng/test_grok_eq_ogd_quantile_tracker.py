"""Fail-closed tests for ogd_quantile_tracker. Returns None on invalid input."""
import math
from grok_eq_ogd_quantile_tracker import ogd_quantile_tracker


def test_increase_when_above():
    # theta=1.0, eta=0.1, alpha=0.1, residual=2.0 > theta -> delta=0.9, next=1.0 + 0.09 = 1.09
    res = ogd_quantile_tracker(1.0, 0.1, 0.1, 2.0)
    assert res is not None
    assert math.isclose(res, 1.09, abs_tol=1e-9)


def test_decrease_when_below():
    # residual=0.5 <= 1.0 -> delta=-0.1, next=1.0 - 0.01 = 0.99
    res = ogd_quantile_tracker(1.0, 0.1, 0.1, 0.5)
    assert res is not None
    assert math.isclose(res, 0.99, abs_tol=1e-9)


def test_floor_at_zero():
    # large negative step floors at 0
    res = ogd_quantile_tracker(0.01, 1.0, 0.5, 0.0)
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_none_on_missing():
    assert ogd_quantile_tracker(None, 0.1, 0.1, 1.0) is None
    assert ogd_quantile_tracker(1.0, None, 0.1, 1.0) is None
    assert ogd_quantile_tracker(1.0, 0.1, None, 1.0) is None
    assert ogd_quantile_tracker(1.0, 0.1, 0.1, None) is None


def test_none_on_invalid():
    assert ogd_quantile_tracker(1.0, 0.0, 0.1, 1.0) is None  # eta <= 0
    assert ogd_quantile_tracker(1.0, -0.1, 0.1, 1.0) is None
    assert ogd_quantile_tracker(1.0, 0.1, 0.0, 1.0) is None  # alpha not in (0,1)
    assert ogd_quantile_tracker(1.0, 0.1, 1.0, 1.0) is None
    assert ogd_quantile_tracker(1.0, 0.1, 0.1, -1.0) is None  # residual < 0
    assert ogd_quantile_tracker(-0.1, 0.1, 0.1, 1.0) is None  # theta < 0
    assert ogd_quantile_tracker(float("nan"), 0.1, 0.1, 1.0) is None
    assert ogd_quantile_tracker(1.0, float("inf"), 0.1, 1.0) is None
    assert ogd_quantile_tracker(1.0, 0.1, 0.1, "bad") is None
