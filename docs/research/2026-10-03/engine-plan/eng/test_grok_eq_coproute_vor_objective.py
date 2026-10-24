"""Fail-closed tests for coproute_vor_objective. Returns None on invalid or constraint violation."""
import math
import pytest
from grok_eq_coproute_vor_objective import coproute_vor_objective


def test_returns_mean_when_constraint_met():
    # 2/5 = 0.4 misses, alpha 0.5 ok, mean calls 1.6
    calls = [1.0, 2.0, 1.0, 2.0, 2.0]
    misses = [False, True, False, True, False]
    res = coproute_vor_objective(calls, misses, 0.5)
    assert res is not None
    assert res == pytest.approx(1.6)


def test_none_when_constraint_violated():
    calls = [1.0, 1.0]
    misses = [True, True]  # 1.0 > 0.1
    assert coproute_vor_objective(calls, misses, 0.1) is None


def test_none_on_missing_or_bad():
    assert coproute_vor_objective(None, [False], 0.1) is None
    assert coproute_vor_objective([1.0], None, 0.1) is None
    assert coproute_vor_objective([1.0], [False], None) is None
    assert coproute_vor_objective([1.0], [False], 0.0) is None
    assert coproute_vor_objective([1.0], [False], 1.0) is None
    assert coproute_vor_objective([], [], 0.1) is None
    assert coproute_vor_objective([1.0], [False, False], 0.1) is None
    assert coproute_vor_objective([-1.0], [False], 0.1) is None
    assert coproute_vor_objective([1.0], [None], 0.1) is None


def test_finite_on_valid():
    res = coproute_vor_objective([1.0, 2.0, 3.0], [False, False, False], 0.05)
    assert res is not None
    assert math.isfinite(res)
    assert res == pytest.approx(2.0)
