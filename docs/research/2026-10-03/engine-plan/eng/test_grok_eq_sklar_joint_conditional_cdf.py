"""Fail-closed tests for sklar_joint_conditional_cdf."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_sklar_joint_conditional_cdf import sklar_joint_conditional_cdf


def independence_copula(u: float, v: float) -> float:
    return u * v


def test_valid_independence():
    j = sklar_joint_conditional_cdf(0.5, 0.4, independence_copula)
    assert j is not None and math.isclose(j, 0.2)


def test_valid_bounds():
    assert sklar_joint_conditional_cdf(0.0, 0.0, independence_copula) == 0.0
    assert sklar_joint_conditional_cdf(1.0, 1.0, independence_copula) == 1.0


def test_out_of_range_returns_none():
    assert sklar_joint_conditional_cdf(-0.1, 0.5, independence_copula) is None
    assert sklar_joint_conditional_cdf(0.5, 1.1, independence_copula) is None


def test_non_finite_returns_none():
    assert sklar_joint_conditional_cdf(float("nan"), 0.5, independence_copula) is None
    assert sklar_joint_conditional_cdf(0.5, float("inf"), independence_copula) is None


def test_non_callable_copula_returns_none():
    assert sklar_joint_conditional_cdf(0.5, 0.5, 0.25) is None
    assert sklar_joint_conditional_cdf(0.5, 0.5, None) is None


def test_copula_returns_invalid_returns_none():
    def bad_copula(u, v):
        return 1.5
    assert sklar_joint_conditional_cdf(0.5, 0.5, bad_copula) is None


def test_non_numeric_returns_none():
    assert sklar_joint_conditional_cdf("a", 0.5, independence_copula) is None
    assert sklar_joint_conditional_cdf(0.5, None, independence_copula) is None


if __name__ == "__main__":
    test_valid_independence()
    test_valid_bounds()
    test_out_of_range_returns_none()
    test_non_finite_returns_none()
    test_non_callable_copula_returns_none()
    test_copula_returns_invalid_returns_none()
    test_non_numeric_returns_none()
    print("all 7 fail-closed tests passed")
