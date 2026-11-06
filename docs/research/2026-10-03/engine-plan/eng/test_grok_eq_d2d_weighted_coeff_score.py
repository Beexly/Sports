"""Fail-closed tests for d2d_weighted_coeff_score. Returns None on invalid input."""
import math
import pytest
from grok_eq_d2d_weighted_coeff_score import d2d_weighted_coeff_score


def test_known_equal_zero():
    res = d2d_weighted_coeff_score([1.0, 2.0], [1.0, 2.0])
    assert res is not None
    assert res == pytest.approx(0.0)


def test_unit_diff_unweighted():
    res = d2d_weighted_coeff_score([1.0, 0.0], [0.0, 0.0])
    assert res is not None
    assert res == pytest.approx(1.0)


def test_weighted():
    # weights [4, 1], diff [1, 0] -> sqrt(4*1)=2
    res = d2d_weighted_coeff_score([1.0, 0.0], [0.0, 0.0], [4.0, 1.0])
    assert res is not None
    assert res == pytest.approx(2.0)


def test_none_on_mismatch_len():
    assert d2d_weighted_coeff_score([1.0], [1.0, 2.0]) is None
    assert d2d_weighted_coeff_score([1.0, 2.0], [1.0], [1.0, 1.0]) is None


def test_none_on_bad_input():
    assert d2d_weighted_coeff_score(None, [1.0]) is None
    assert d2d_weighted_coeff_score([1.0], None) is None
    assert d2d_weighted_coeff_score([], []) is None
    assert d2d_weighted_coeff_score([float("nan")], [0.0]) is None
    assert d2d_weighted_coeff_score([1.0], [0.0], [-1.0]) is None
