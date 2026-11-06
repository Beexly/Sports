"""Fail-closed tests for q_clayton_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_q_clayton_copula import q_clayton_copula


def test_bivariate_matches_known():
    res = q_clayton_copula([0.5, 0.5], 2.0)
    assert res is not None
    assert res == pytest.approx((0.5**(-2) + 0.5**(-2) - 2 + 1)**(-0.5), abs=1e-6)


def test_independence_limit():
    res = q_clayton_copula([0.4, 0.6, 0.3], 0.001)
    assert res is not None
    assert res == pytest.approx(0.4 * 0.6 * 0.3, abs=1e-2)


def test_none_on_missing():
    assert q_clayton_copula(None, 2.0) is None
    assert q_clayton_copula([0.5, 0.5], None) is None
    assert q_clayton_copula([None, 0.5], 2.0) is None


def test_none_on_out_of_range():
    assert q_clayton_copula([0.0, 0.5], 2.0) is None
    assert q_clayton_copula([1.1, 0.5], 2.0) is None
    assert q_clayton_copula([-0.1, 0.5], 2.0) is None


def test_none_on_theta_nonpositive():
    assert q_clayton_copula([0.3, 0.7], 0.0) is None
    assert q_clayton_copula([0.3, 0.7], -1.0) is None


def test_none_on_empty():
    assert q_clayton_copula([], 2.0) is None
