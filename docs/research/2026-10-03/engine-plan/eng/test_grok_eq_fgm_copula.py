"""Fail-closed tests for fgm_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_fgm_copula import fgm_copula


def test_independence_theta_zero():
    res = fgm_copula(0.5, 0.5, 0.0)
    assert res is not None
    assert res == pytest.approx(0.25)


def test_positive_theta_above_product():
    res = fgm_copula(0.4, 0.6, 0.5)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)
    assert res > 0.24


def test_none_on_missing():
    assert fgm_copula(None, 0.5, 0.5) is None
    assert fgm_copula(0.5, None, 0.5) is None
    assert fgm_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range_u():
    assert fgm_copula(0.0, 0.5, 0.5) is None
    assert fgm_copula(1.1, 0.5, 0.5) is None
    assert fgm_copula(-0.1, 0.5, 0.5) is None


def test_none_on_theta_out_of_range():
    assert fgm_copula(0.3, 0.7, 1.1) is None
    assert fgm_copula(0.3, 0.7, -1.1) is None
