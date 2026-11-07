"""Fail-closed tests for symmetrized_blest_eta. Returns None on invalid input."""
import numpy as np
import pytest
from grok_eq_symmetrized_blest_eta import symmetrized_blest_eta


def test_independence_near_zero():
    res = symmetrized_blest_eta(lambda u, v: u * v, 200)
    assert res is not None
    assert res == pytest.approx(0.0, abs=0.001)


def test_comonotonic_near_one():
    res = symmetrized_blest_eta(lambda u, v: np.minimum(u, v), 200)
    assert res is not None
    assert res == pytest.approx(1.0, abs=0.001)


def test_countermonotonic_near_minus_one():
    res = symmetrized_blest_eta(lambda u, v: np.maximum(u + v - 1.0, 0.0), 200)
    assert res is not None
    assert res == pytest.approx(-1.0, abs=0.001)


def test_none_on_bad_input():
    assert symmetrized_blest_eta(None) is None
    assert symmetrized_blest_eta(lambda u, v: u * v, 5) is None
    assert symmetrized_blest_eta("not_callable") is None
    assert symmetrized_blest_eta(lambda u, v: u * v, float("nan")) is None


def test_none_on_invalid_copula_output():
    def bad(u, v):
        return u * v + 2.0  # out of [0,1]
    assert symmetrized_blest_eta(bad) is None
