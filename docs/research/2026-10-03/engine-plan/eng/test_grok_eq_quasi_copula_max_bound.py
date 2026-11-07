"""Fail-closed tests for quasi_copula_max_bound. Returns None on invalid input."""
import math
import pytest
from grok_eq_quasi_copula_max_bound import quasi_copula_max_bound


def test_known_sum():
    # s=0, t=1, increments 0.3, 0.4 -> 0.7
    res = quasi_copula_max_bound(0.0, 1.0, [0.3, 0.4])
    assert res is not None
    assert res == pytest.approx(0.7)


def test_single_increment():
    res = quasi_copula_max_bound(0.2, 0.5, [0.1])
    assert res is not None
    assert res == pytest.approx(0.1)


def test_none_on_s_ge_t():
    assert quasi_copula_max_bound(1.0, 1.0, [0.1]) is None
    assert quasi_copula_max_bound(2.0, 1.0, [0.1]) is None


def test_none_on_missing():
    assert quasi_copula_max_bound(None, 1.0, [0.1]) is None
    assert quasi_copula_max_bound(0.0, None, [0.1]) is None
    assert quasi_copula_max_bound(0.0, 1.0, None) is None
    assert quasi_copula_max_bound(0.0, 1.0, []) is None


def test_none_on_nonfinite():
    assert quasi_copula_max_bound(float("inf"), 1.0, [0.1]) is None
    assert quasi_copula_max_bound(0.0, 1.0, [float("nan")]) is None
