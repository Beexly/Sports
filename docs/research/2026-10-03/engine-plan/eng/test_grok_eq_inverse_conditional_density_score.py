"""Fail-closed tests for inverse_conditional_density_score. Returns None on invalid input."""
import math
from grok_eq_inverse_conditional_density_score import inverse_conditional_density_score


def test_valid_unit_density():
    res = inverse_conditional_density_score(1.0)
    assert res is not None
    assert abs(res - 1.0) < 1e-9
    assert math.isfinite(res)


def test_valid_half_density():
    res = inverse_conditional_density_score(0.5)
    assert res is not None
    assert abs(res - 2.0) < 1e-9


def test_none_on_missing():
    assert inverse_conditional_density_score(None) is None


def test_none_on_zero():
    assert inverse_conditional_density_score(0.0) is None


def test_none_on_negative():
    assert inverse_conditional_density_score(-0.1) is None


def test_none_on_non_numeric():
    assert inverse_conditional_density_score("bad") is None
