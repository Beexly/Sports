"""Fail-closed tests for inverse_conditional_density_score."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_inverse_conditional_density_score import inverse_conditional_density_score


def test_valid_positive():
    assert inverse_conditional_density_score(0.5) == 2.0


def test_valid_one():
    assert inverse_conditional_density_score(1.0) == 1.0


def test_small_positive():
    s = inverse_conditional_density_score(0.01)
    assert s is not None and math.isclose(s, 100.0)


def test_zero_returns_none():
    assert inverse_conditional_density_score(0.0) is None


def test_negative_returns_none():
    assert inverse_conditional_density_score(-0.1) is None


def test_non_finite_returns_none():
    assert inverse_conditional_density_score(float("inf")) is None
    assert inverse_conditional_density_score(float("nan")) is None


def test_non_numeric_returns_none():
    assert inverse_conditional_density_score("a") is None
    assert inverse_conditional_density_score(None) is None
    assert inverse_conditional_density_score([1]) is None


if __name__ == "__main__":
    test_valid_positive()
    test_valid_one()
    test_small_positive()
    test_zero_returns_none()
    test_negative_returns_none()
    test_non_finite_returns_none()
    test_non_numeric_returns_none()
    print("all 7 fail-closed tests passed")
