"""Fail-closed tests for convergence_time_min. Returns None on invalid input."""
import math
from grok_eq_convergence_time_min import convergence_time_min


def test_returns_min_k():
    # d = [10, 8, 5, 3, 1], eps=0.4, thresh=4; first k with d_k<=4 is k=3 (d=3)
    res = convergence_time_min([10.0, 8.0, 5.0, 3.0, 1.0], 0.4)
    assert res == 3


def test_returns_zero_if_already_below():
    res = convergence_time_min([1.0, 2.0], 1.5)
    assert res == 0


def test_none_if_never():
    res = convergence_time_min([10.0, 9.0, 8.0], 0.1)
    assert res is None


def test_none_on_missing():
    assert convergence_time_min(None, 0.5) is None
    assert convergence_time_min([1.0], None) is None


def test_none_on_invalid():
    assert convergence_time_min([], 0.5) is None
    assert convergence_time_min([10.0], 0.0) is None
    assert convergence_time_min([10.0], -0.1) is None
    assert convergence_time_min([float("nan")], 0.5) is None
    assert convergence_time_min([0.0, 1.0], 0.5) is None  # d0 <= 0
    assert convergence_time_min(["bad"], 0.5) is None
