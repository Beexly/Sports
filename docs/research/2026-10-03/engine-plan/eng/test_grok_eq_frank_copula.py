"""Fail-closed tests for frank_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_frank_copula import frank_copula


def test_independence_alpha_zero():
    assert frank_copula(0.5, 0.5, 0.0) == pytest.approx(0.25)


def test_positive_alpha_finite():
    res = frank_copula(0.4, 0.6, 2.0)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert frank_copula(None, 0.5, 2.0) is None
    assert frank_copula(0.5, None, 2.0) is None
    assert frank_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert frank_copula(0.0, 0.5, 2.0) is None
    assert frank_copula(1.1, 0.5, 2.0) is None
    assert frank_copula(-0.1, 0.5, 2.0) is None


def test_negative_alpha_finite():
    res = frank_copula(0.3, 0.7, -1.0)
    assert res is not None
    assert 0.0 <= res <= 1.0
    assert math.isfinite(res)
