"""Fail-closed tests for frechet_upper_copula. Returns None on invalid input."""
import math
import pytest
from grok_eq_frechet_upper_copula import frechet_upper_copula


def test_valid_min():
    res = frechet_upper_copula(0.3, 0.7)
    assert res is not None
    assert res == pytest.approx(0.3)


def test_valid_equal():
    res = frechet_upper_copula(0.5, 0.5)
    assert res is not None
    assert res == pytest.approx(0.5)
    assert math.isfinite(res)


def test_none_on_missing():
    assert frechet_upper_copula(None, 0.5) is None
    assert frechet_upper_copula(0.5, None) is None


def test_none_on_out_of_range():
    assert frechet_upper_copula(-0.1, 0.5) is None
    assert frechet_upper_copula(1.1, 0.5) is None
    assert frechet_upper_copula(0.5, -0.1) is None
    assert frechet_upper_copula(0.5, 1.1) is None


def test_boundary_edges():
    assert frechet_upper_copula(0.0, 0.0) == 0.0
    assert frechet_upper_copula(1.0, 1.0) == 1.0
    assert frechet_upper_copula(0.0, 1.0) == 0.0
    assert frechet_upper_copula(1.0, 0.0) == 0.0
    assert frechet_upper_copula(0.0, 0.3) == 0.0
    assert frechet_upper_copula(0.8, 1.0) == 0.8
