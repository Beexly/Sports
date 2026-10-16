"""Fail-closed tests for gaussian_copula. Returns None on invalid or non-closed-form input."""
import math
import pytest
from grok_eq_gaussian_copula import gaussian_copula


def test_independence():
    res = gaussian_copula(0.3, 0.7, 0.0)
    assert res is not None
    assert res == pytest.approx(0.21)


def test_frechet_upper():
    res = gaussian_copula(0.3, 0.7, 1.0)
    assert res is not None
    assert res == pytest.approx(0.3)


def test_frechet_lower():
    res = gaussian_copula(0.3, 0.7, -1.0)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_midpoint_formula():
    res = gaussian_copula(0.5, 0.5, 0.5)
    assert res is not None
    expected = 0.25 + (1.0 / (2.0 * math.pi)) * math.asin(0.5)
    assert res == pytest.approx(expected)


def test_none_on_missing_or_out():
    assert gaussian_copula(None, 0.5, 0.0) is None
    assert gaussian_copula(0.5, None, 0.0) is None
    assert gaussian_copula(0.5, 0.5, None) is None
    assert gaussian_copula(-0.1, 0.5, 0.0) is None
    assert gaussian_copula(0.5, 1.1, 0.0) is None
    assert gaussian_copula(0.5, 0.5, 1.1) is None
    assert gaussian_copula(0.3, 0.7, 0.5) is None  # general case fails closed
