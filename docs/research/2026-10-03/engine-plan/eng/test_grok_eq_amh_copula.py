"""Fail-closed tests for amh_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_amh_copula import amh_copula


def test_independence_alpha_zero():
    res = amh_copula(0.5, 0.5, 0.0)
    assert res is not None
    assert res == pytest.approx(0.25)


def test_positive_alpha_finite():
    res = amh_copula(0.4, 0.6, 0.5)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)
    # > product when alpha > 0
    assert res > 0.24


def test_none_on_missing():
    assert amh_copula(None, 0.5, 0.5) is None
    assert amh_copula(0.5, None, 0.5) is None
    assert amh_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range_u():
    assert amh_copula(0.0, 0.5, 0.5) is None
    assert amh_copula(1.1, 0.5, 0.5) is None
    assert amh_copula(-0.1, 0.5, 0.5) is None


def test_none_on_alpha_out_of_range():
    assert amh_copula(0.3, 0.7, 1.0) is None
    assert amh_copula(0.3, 0.7, -1.1) is None
