"""Fail-closed tests for reciprocal_aggregate. Returns None on invalid input."""
import math
import pytest
from grok_eq_reciprocal_aggregate import reciprocal_aggregate


def test_basic_sum():
    res = reciprocal_aggregate([0.5, 0.5], [0.5, 0.25])
    assert res == pytest.approx(0.5/0.5 + 0.5/0.25)


def test_unit_weight():
    res = reciprocal_aggregate([1.0], [0.1])
    assert res == pytest.approx(10.0)


def test_none_on_none():
    assert reciprocal_aggregate(None, [0.5]) is None
    assert reciprocal_aggregate([1.0], None) is None


def test_none_on_length_mismatch():
    assert reciprocal_aggregate([0.5, 0.5], [0.5]) is None


def test_none_on_negative_weight():
    assert reciprocal_aggregate([-0.1, 1.1], [0.5, 0.5]) is None


def test_none_on_bad_p():
    assert reciprocal_aggregate([1.0], [0.0]) is None
    assert reciprocal_aggregate([1.0], [1.1]) is None
    assert reciprocal_aggregate([1.0], [-0.1]) is None


def test_none_on_weight_sum():
    assert reciprocal_aggregate([0.4, 0.4], [0.5, 0.5]) is None


def test_none_on_nonfinite():
    assert reciprocal_aggregate([float("nan"), 0.0], [0.5, 0.5]) is None
    assert reciprocal_aggregate([1.0], [float("inf")]) is None
