"""Fail-closed tests for joint_score_cdf_indicator. Returns None on invalid input."""
import math
from grok_eq_joint_score_cdf import joint_score_cdf_indicator


def test_all_below():
    res = joint_score_cdf_indicator([1.0, 2.0], [1.5, 2.5])
    assert res is not None
    assert math.isclose(res, 1.0, abs_tol=1e-9)


def test_one_above():
    res = joint_score_cdf_indicator([1.0, 3.0], [1.5, 2.5])
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_equal_ok():
    res = joint_score_cdf_indicator([1.0, 2.0], [1.0, 2.0])
    assert res is not None
    assert math.isclose(res, 1.0, abs_tol=1e-9)


def test_none_on_missing():
    assert joint_score_cdf_indicator(None, [1.0]) is None
    assert joint_score_cdf_indicator([1.0], None) is None
    assert joint_score_cdf_indicator([None], [1.0]) is None
    assert joint_score_cdf_indicator([1.0], [None]) is None


def test_none_on_mismatch_or_empty():
    assert joint_score_cdf_indicator([1.0], [1.0, 2.0]) is None
    assert joint_score_cdf_indicator([], []) is None
