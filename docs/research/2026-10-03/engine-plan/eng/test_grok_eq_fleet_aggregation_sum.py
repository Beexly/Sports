"""Fail-closed tests for fleet_aggregation_sum. Returns None on invalid input."""
import math
import pytest
from grok_eq_fleet_aggregation_sum import fleet_aggregation_sum


def test_simple_sum():
    res = fleet_aggregation_sum([1.0, 2.0, 3.0])
    assert res is not None
    assert res == pytest.approx(6.0)


def test_single():
    res = fleet_aggregation_sum([5.5])
    assert res is not None
    assert res == pytest.approx(5.5)


def test_none_on_missing():
    assert fleet_aggregation_sum(None) is None
    assert fleet_aggregation_sum([]) is None


def test_none_on_none_element():
    assert fleet_aggregation_sum([1.0, None, 3.0]) is None


def test_none_on_nan():
    assert fleet_aggregation_sum([1.0, float('nan')]) is None


def test_finite():
    res = fleet_aggregation_sum([0.1, -0.1, 10.0])
    assert res is not None
    assert math.isfinite(res)
