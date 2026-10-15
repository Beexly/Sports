"""Fail-closed tests for clayton_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_clayton_copula import clayton_copula


def test_independence_limit_small_theta():
    # as theta -> 0+, Clayton -> product
    res = clayton_copula(0.5, 0.5, 0.001)
    assert res is not None
    assert res == pytest.approx(0.25, abs=1e-3)


def test_positive_theta_finite():
    res = clayton_copula(0.4, 0.6, 2.0)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert clayton_copula(None, 0.5, 2.0) is None
    assert clayton_copula(0.5, None, 2.0) is None
    assert clayton_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert clayton_copula(0.0, 0.5, 2.0) is None
    assert clayton_copula(1.1, 0.5, 2.0) is None
    assert clayton_copula(-0.1, 0.5, 2.0) is None


def test_none_on_theta_nonpositive():
    assert clayton_copula(0.3, 0.7, 0.0) is None
    assert clayton_copula(0.3, 0.7, -1.0) is None
