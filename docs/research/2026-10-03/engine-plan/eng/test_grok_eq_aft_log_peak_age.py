"""Fail-closed tests for aft_log_peak_age. Returns None on invalid input."""
import math
from grok_eq_aft_log_peak_age import aft_log_peak_age


def test_exact_intercept_only():
    res = aft_log_peak_age(3.0, [], [])
    assert res is not None
    assert math.isclose(res, 3.0, abs_tol=1e-9)


def test_with_covariates():
    # beta0=2.5, beta=[0.1, -0.2], x=[1.0, 2.0] -> 2.5 + 0.1*1 + (-0.2)*2 = 2.2
    res = aft_log_peak_age(2.5, [0.1, -0.2], [1.0, 2.0])
    assert res is not None
    assert math.isclose(res, 2.2, abs_tol=1e-9)


def test_zero_beta():
    res = aft_log_peak_age(1.0, [0.0, 0.0], [5.0, 10.0])
    assert res is not None
    assert math.isclose(res, 1.0, abs_tol=1e-9)


def test_none_on_missing():
    assert aft_log_peak_age(None, [0.1], [1.0]) is None
    assert aft_log_peak_age(1.0, None, [1.0]) is None
    assert aft_log_peak_age(1.0, [0.1], None) is None


def test_none_on_invalid():
    assert aft_log_peak_age(1.0, [0.1], [1.0, 2.0]) is None  # length mismatch
    assert aft_log_peak_age(float("nan"), [], []) is None
    assert aft_log_peak_age(1.0, [float("nan")], [1.0]) is None
    assert aft_log_peak_age(1.0, [0.1], [float("inf")]) is None
    assert aft_log_peak_age(1.0, "not_list", [1.0]) is None
