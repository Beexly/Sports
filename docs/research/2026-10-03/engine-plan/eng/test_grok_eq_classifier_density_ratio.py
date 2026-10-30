"""Fail-closed tests for classifier_density_ratio. Returns None on invalid input."""
import math
from grok_eq_classifier_density_ratio import classifier_density_ratio


def test_valid_midpoint():
    res = classifier_density_ratio(0.5)
    assert res is not None
    assert abs(res - 1.0) < 1e-9


def test_valid_high_prob():
    res = classifier_density_ratio(0.8)
    assert res is not None
    assert abs(res - 4.0) < 1e-9
    assert math.isfinite(res)


def test_none_on_missing():
    assert classifier_density_ratio(None) is None


def test_none_on_boundary():
    assert classifier_density_ratio(0.0) is None
    assert classifier_density_ratio(1.0) is None


def test_none_on_out_of_range():
    assert classifier_density_ratio(-0.1) is None
    assert classifier_density_ratio(1.1) is None


def test_none_on_non_numeric():
    assert classifier_density_ratio("bad") is None
