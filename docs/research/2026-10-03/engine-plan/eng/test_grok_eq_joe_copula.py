"""Fail-closed tests for joe_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_joe_copula import joe_copula


def test_independence_theta_one():
    assert joe_copula(0.5, 0.5, 1.0) == pytest.approx(0.25)


def test_positive_theta_finite():
    res = joe_copula(0.4, 0.6, 2.0)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert joe_copula(None, 0.5, 2.0) is None
    assert joe_copula(0.5, None, 2.0) is None
    assert joe_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert joe_copula(0.0, 0.5, 2.0) is None
    assert joe_copula(1.1, 0.5, 2.0) is None
    assert joe_copula(-0.1, 0.5, 2.0) is None


def test_none_on_theta_below_one():
    assert joe_copula(0.3, 0.7, 0.5) is None
