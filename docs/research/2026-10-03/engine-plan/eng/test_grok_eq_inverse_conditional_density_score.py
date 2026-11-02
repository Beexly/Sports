"""Fail-closed tests for inverse_conditional_density_score from arXiv:2610.37866."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_inverse_conditional_density_score import inverse_conditional_density_score


def test_positive_density():
    assert inverse_conditional_density_score(0.5) == 2.0


def test_unit_density():
    assert inverse_conditional_density_score(1.0) == 1.0


def test_small_density():
    assert abs(inverse_conditional_density_score(0.01) - 100.0) < 1e-9


def test_zero_density_fails_closed():
    assert inverse_conditional_density_score(0.0) is None


def test_negative_density_fails_closed():
    assert inverse_conditional_density_score(-0.1) is None


def test_non_finite_fails_closed():
    assert inverse_conditional_density_score(float("nan")) is None
    assert inverse_conditional_density_score(float("inf")) is None


def test_none_fails_closed():
    assert inverse_conditional_density_score(None) is None
