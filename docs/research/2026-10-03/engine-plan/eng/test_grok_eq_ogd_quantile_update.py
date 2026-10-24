"""Fail-closed tests for ogd_quantile_update. Returns None on invalid input."""
import math
import pytest
from grok_eq_ogd_quantile_update import ogd_quantile_update


def test_underestimate_increases():
    res = ogd_quantile_update(1.0, 2.0, 0.1, 0.1)
    assert res is not None
    assert res == pytest.approx(1.0 + 0.1 * 0.9)


def test_overestimate_decreases_but_floors_at_zero():
    res = ogd_quantile_update(0.05, 0.0, 1.0, 0.1)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_none_on_missing():
    assert ogd_quantile_update(None, 1.0, 0.1, 0.1) is None
    assert ogd_quantile_update(1.0, None, 0.1, 0.1) is None
    assert ogd_quantile_update(1.0, 1.0, None, 0.1) is None
    assert ogd_quantile_update(1.0, 1.0, 0.1, None) is None


def test_none_on_bad_params():
    assert ogd_quantile_update(1.0, 1.0, 0.0, 0.1) is None
    assert ogd_quantile_update(1.0, 1.0, -0.1, 0.1) is None
    assert ogd_quantile_update(1.0, 1.0, 0.1, 0.0) is None
    assert ogd_quantile_update(1.0, 1.0, 0.1, 1.0) is None


def test_finite_on_valid():
    res = ogd_quantile_update(0.5, 0.7, 0.05, 0.2)
    assert res is not None
    assert math.isfinite(res)
