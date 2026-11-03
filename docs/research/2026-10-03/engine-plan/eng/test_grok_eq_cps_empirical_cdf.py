"""Fail-closed tests for cps_empirical_cdf. Returns None on invalid input."""
import math
import pytest
from grok_eq_cps_empirical_cdf import cps_empirical_cdf


def test_basic_cdf():
    res = cps_empirical_cdf([1.0, 2.0, 3.0], 2.0)
    assert res == pytest.approx(2.0 / 3.0)


def test_all_below():
    res = cps_empirical_cdf([0.1, 0.2, 0.3], 1.0)
    assert res == pytest.approx(1.0)


def test_none_below():
    res = cps_empirical_cdf([1.0, 2.0, 3.0], 0.0)
    assert res == pytest.approx(0.0)


def test_single():
    res = cps_empirical_cdf([5.0], 5.0)
    assert res == pytest.approx(1.0)


def test_none_on_none():
    assert cps_empirical_cdf(None, 1.0) is None
    assert cps_empirical_cdf([1.0], None) is None


def test_none_on_empty():
    assert cps_empirical_cdf([], 1.0) is None


def test_none_on_nonfinite_y():
    assert cps_empirical_cdf([1.0, 2.0], float("nan")) is None
    assert cps_empirical_cdf([1.0, 2.0], float("inf")) is None


def test_none_on_nonfinite_a():
    assert cps_empirical_cdf([1.0, float("nan")], 2.0) is None
    assert cps_empirical_cdf([1.0, None], 2.0) is None
