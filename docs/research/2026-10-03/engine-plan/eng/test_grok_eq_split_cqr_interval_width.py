"""Fail-closed tests for split_cqr_interval_width. Returns None on invalid input."""
import math
import pytest
from grok_eq_split_cqr_interval_width import split_cqr_interval_width


def test_basic_width():
    res = split_cqr_interval_width(1.0, 3.0, 0.5)
    assert res == pytest.approx(2.0 + 1.0)


def test_zero_correction():
    res = split_cqr_interval_width(0.0, 2.0, 0.0)
    assert res == pytest.approx(2.0)


def test_equal_bounds():
    res = split_cqr_interval_width(1.0, 1.0, 0.25)
    assert res == pytest.approx(0.5)


def test_none_on_none():
    assert split_cqr_interval_width(None, 1.0, 0.5) is None
    assert split_cqr_interval_width(1.0, None, 0.5) is None
    assert split_cqr_interval_width(1.0, 2.0, None) is None


def test_none_on_inverted():
    assert split_cqr_interval_width(2.0, 1.0, 0.5) is None


def test_none_on_negative_qhat():
    assert split_cqr_interval_width(1.0, 2.0, -0.1) is None


def test_none_on_nonfinite():
    assert split_cqr_interval_width(float("nan"), 2.0, 0.5) is None
    assert split_cqr_interval_width(1.0, float("inf"), 0.5) is None
    assert split_cqr_interval_width(1.0, 2.0, float("nan")) is None


def test_none_on_non_numeric():
    assert split_cqr_interval_width("a", 2.0, 0.5) is None
    assert split_cqr_interval_width(1.0, 2.0, "b") is None
