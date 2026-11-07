"""Fail-closed tests for vine_sum_log_mi. Returns None on invalid input."""
import math
import pytest
from grok_eq_vine_sum_log_mi import vine_sum_log_mi


def test_independence_sum_zero():
    # independence copula density 1, log 0
    res = vine_sum_log_mi([0.0, 0.0, 0.0])
    assert res is not None
    assert res == pytest.approx(0.0)


def test_positive_dependence():
    res = vine_sum_log_mi([0.5, 0.3])
    assert res is not None
    assert res == pytest.approx(0.8)


def test_negative_log_allowed():
    res = vine_sum_log_mi([-0.1, -0.2])
    assert res is not None
    assert res == pytest.approx(-0.3)


def test_none_on_bad_input():
    assert vine_sum_log_mi(None) is None
    assert vine_sum_log_mi([]) is None
    assert vine_sum_log_mi("not_list") is None
    assert vine_sum_log_mi([0.0, float("nan")]) is None
    assert vine_sum_log_mi([0.0, float("inf")]) is None
    assert vine_sum_log_mi([0.0, "bad"]) is None


def test_single_term():
    res = vine_sum_log_mi([1.234])
    assert res is not None
    assert res == pytest.approx(1.234)
