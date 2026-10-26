"""Fail-closed tests for gumbel_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_gumbel_copula import gumbel_copula


def test_independence_theta_one():
    # theta = 1 is independence: C(u,v) = u*v
    res = gumbel_copula(0.5, 0.5, 1.0)
    assert res is not None
    assert res == pytest.approx(0.25, abs=1e-6)


def test_positive_theta_finite():
    res = gumbel_copula(0.4, 0.6, 2.0)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert gumbel_copula(None, 0.5, 2.0) is None
    assert gumbel_copula(0.5, None, 2.0) is None
    assert gumbel_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert gumbel_copula(0.0, 0.5, 2.0) is None
    assert gumbel_copula(1.1, 0.5, 2.0) is None
    assert gumbel_copula(-0.1, 0.5, 2.0) is None


def test_none_on_theta_lt_one():
    assert gumbel_copula(0.3, 0.7, 0.5) is None
    assert gumbel_copula(0.3, 0.7, 0.0) is None
