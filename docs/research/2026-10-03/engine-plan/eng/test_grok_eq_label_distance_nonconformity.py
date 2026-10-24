"""Fail-closed tests for label_distance_nonconformity. Returns None on invalid input."""
import math
from grok_eq_label_distance_nonconformity import label_distance_nonconformity


def test_zero_on_match():
    assert label_distance_nonconformity(0.5, 0.5) == 0.0


def test_absolute_diff():
    assert label_distance_nonconformity(0.8, 0.2) == 0.6
    assert label_distance_nonconformity(0.2, 0.8) == 0.6


def test_none_on_missing():
    assert label_distance_nonconformity(None, 0.5) is None
    assert label_distance_nonconformity(0.5, None) is None


def test_none_on_nonfinite():
    assert label_distance_nonconformity(float("inf"), 0.5) is None
    assert label_distance_nonconformity(0.5, float("nan")) is None


def test_finite_on_valid():
    res = label_distance_nonconformity(1.0, 0.0)
    assert res is not None
    assert math.isfinite(res)
