"""Fail-closed tests for announced_break_frequency_gap. Returns None on invalid input."""
import math
from grok_eq_announced_break_frequency_gap import announced_break_frequency_gap


def test_exact_match():
    # 2 errors in 10, alpha=0.2 -> gap=0
    res = announced_break_frequency_gap([1, 0, 1, 0, 0, 0, 0, 0, 0, 0], 0.2)
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_over_coverage():
    # 0 errors in 10, alpha=0.1 -> gap=0.1
    res = announced_break_frequency_gap([0] * 10, 0.1)
    assert res is not None
    assert math.isclose(res, 0.1, abs_tol=1e-9)


def test_under_coverage():
    # 5 errors in 10, alpha=0.1 -> gap=0.4
    res = announced_break_frequency_gap([1, 1, 1, 1, 1, 0, 0, 0, 0, 0], 0.1)
    assert res is not None
    assert math.isclose(res, 0.4, abs_tol=1e-9)


def test_none_on_missing():
    assert announced_break_frequency_gap(None, 0.1) is None
    assert announced_break_frequency_gap([], 0.1) is None
    assert announced_break_frequency_gap([0, 1], None) is None


def test_none_on_invalid():
    assert announced_break_frequency_gap([0, 2], 0.1) is None
    assert announced_break_frequency_gap([0.5], 0.1) is None
    assert announced_break_frequency_gap([0], 0.0) is None
    assert announced_break_frequency_gap([0], 1.0) is None
    assert announced_break_frequency_gap([0], float("nan")) is None
    assert announced_break_frequency_gap([float("nan")], 0.1) is None
