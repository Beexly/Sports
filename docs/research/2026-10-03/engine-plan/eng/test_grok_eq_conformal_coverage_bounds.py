"""Fail-closed tests for conformal_coverage_bounds. Returns None on invalid input."""
import math
import pytest
from grok_eq_conformal_coverage_bounds import conformal_coverage_bounds


def test_basic_bounds():
    res = conformal_coverage_bounds(0.1, 100)
    assert res is not None
    lower, upper = res
    assert lower == pytest.approx(0.9)
    assert upper == pytest.approx(0.9 + 1/101)
    assert lower <= upper


def test_alpha_half():
    res = conformal_coverage_bounds(0.5, 9)
    assert res is not None
    lower, upper = res
    assert lower == pytest.approx(0.5)
    assert upper == pytest.approx(0.5 + 0.1)


def test_none_on_missing():
    assert conformal_coverage_bounds(None, 10) is None
    assert conformal_coverage_bounds(0.1, None) is None


def test_none_on_bad_alpha():
    assert conformal_coverage_bounds(0.0, 10) is None
    assert conformal_coverage_bounds(1.0, 10) is None
    assert conformal_coverage_bounds(-0.1, 10) is None
    assert conformal_coverage_bounds(1.1, 10) is None


def test_none_on_bad_n():
    assert conformal_coverage_bounds(0.1, 0) is None
    assert conformal_coverage_bounds(0.1, -5) is None
