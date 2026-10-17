"""Fail-closed tests for galambos_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_galambos_copula import galambos_copula


def test_valid_mid():
    # theta large should be close to min(u,v) but still > uv
    res = galambos_copula(0.5, 0.5, 2.0)
    assert res is not None
    assert 0.25 < res <= 0.5
    assert math.isfinite(res)


def test_independence_limit_small_theta():
    # small theta approximates product
    res = galambos_copula(0.4, 0.6, 0.01)
    assert res is not None
    assert res == pytest.approx(0.4 * 0.6, rel=0.05)


def test_none_on_missing():
    assert galambos_copula(None, 0.5, 1.0) is None
    assert galambos_copula(0.5, None, 1.0) is None
    assert galambos_copula(0.5, 0.5, None) is None


def test_none_on_out_of_range():
    assert galambos_copula(0.0, 0.5, 1.0) is None
    assert galambos_copula(1.1, 0.5, 1.0) is None
    assert galambos_copula(0.5, -0.1, 1.0) is None
    assert galambos_copula(0.5, 0.5, 0.0) is None
    assert galambos_copula(0.5, 0.5, -1.0) is None


def test_boundary_edges():
    # u=v=1
    res = galambos_copula(1.0, 1.0, 2.0)
    assert res is not None
    assert res == pytest.approx(1.0)
    # near 0
    res2 = galambos_copula(1e-6, 1e-6, 1.0)
    assert res2 is not None
    assert 0.0 <= res2 <= 1e-6
