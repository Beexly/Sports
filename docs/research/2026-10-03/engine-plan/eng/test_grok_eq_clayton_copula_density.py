"""Fail-closed tests for clayton_copula_density. Returns None on invalid input."""
import math
import pytest
from grok_eq_clayton_copula_density import clayton_copula_density


def test_independence_limit_approx():
    # As alpha -> 0+, density should approach 1, but we test a small positive alpha
    res = clayton_copula_density(0.5, 0.5, 0.01)
    assert res is not None
    assert 0.9 < res < 1.2


def test_positive_alpha_finite():
    res = clayton_copula_density(0.3, 0.7, 2.0)
    assert res is not None
    assert math.isfinite(res)
    assert res > 0.0


def test_none_on_missing():
    assert clayton_copula_density(None, 0.5, 1.0) is None
    assert clayton_copula_density(0.5, None, 1.0) is None
    assert clayton_copula_density(0.5, 0.5, None) is None


def test_none_on_invalid_domain():
    assert clayton_copula_density(0.0, 0.5, 1.0) is None
    assert clayton_copula_density(0.5, 1.1, 1.0) is None
    assert clayton_copula_density(0.5, 0.5, 0.0) is None
    assert clayton_copula_density(0.5, 0.5, -1.0) is None
    assert clayton_copula_density(0.5, 0.5, -1.5) is None


def test_none_on_math_failure():
    # Extreme values that may overflow
    res = clayton_copula_density(1e-10, 1e-10, 100.0)
    # May return None or finite; both ok as long as not crash, but we expect possible None
    assert res is None or math.isfinite(res)
