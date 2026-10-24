"""Fail-closed tests for normal_copula_logdensity. Returns None on invalid input."""
import math
import pytest
from grok_eq_normal_copula_logdensity import normal_copula_logdensity


def test_independence_theta_zero():
    res = normal_copula_logdensity(0.5, 0.5, 0.0)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_positive_theta_finite():
    res = normal_copula_logdensity(0.7, 0.8, 0.5)
    assert res is not None
    assert math.isfinite(res)


def test_none_on_missing():
    assert normal_copula_logdensity(None, 0.5, 0.5) is None
    assert normal_copula_logdensity(0.5, None, 0.5) is None
    assert normal_copula_logdensity(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert normal_copula_logdensity(0.0, 0.5, 0.5) is None
    assert normal_copula_logdensity(1.0, 0.5, 0.5) is None
    assert normal_copula_logdensity(0.5, 0.5, 1.0) is None
    assert normal_copula_logdensity(0.5, 0.5, -1.0) is None
