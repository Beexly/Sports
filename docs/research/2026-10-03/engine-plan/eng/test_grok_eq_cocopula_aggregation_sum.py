"""Fail-closed tests for cocopula_aggregation_sum. Returns None on invalid input."""
import pytest
from grok_eq_cocopula_aggregation_sum import cocopula_aggregation_sum


def test_simple_sum():
    res = cocopula_aggregation_sum([1.0, 2.5, 3.0])
    assert res is not None
    assert res == pytest.approx(6.5)


def test_single():
    res = cocopula_aggregation_sum([10.0])
    assert res == pytest.approx(10.0)


def test_zeros():
    res = cocopula_aggregation_sum([0.0, 0.0, 0.0])
    assert res == pytest.approx(0.0)


def test_negative_allowed():
    res = cocopula_aggregation_sum([-1.0, 2.0])
    assert res == pytest.approx(1.0)


def test_none_on_invalid():
    assert cocopula_aggregation_sum(None) is None
    assert cocopula_aggregation_sum([]) is None
    assert cocopula_aggregation_sum([1.0, None]) is None
    assert cocopula_aggregation_sum([1.0, "bad"]) is None
    assert cocopula_aggregation_sum("not a list") is None
