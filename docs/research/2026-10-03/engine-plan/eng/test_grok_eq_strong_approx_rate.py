"""Fail-closed tests for strong_approx_error_exponent from arXiv:2610.38202."""
from grok_eq_strong_approx_rate import strong_approx_error_exponent


def test_d2_p4():
    # max(2/4, (2-1)/2) = max(0.5, 0.5) = 0.5
    assert strong_approx_error_exponent(2, 4) == 0.5


def test_d2_p3():
    # max(2/3, 0.5) = max(0.666..., 0.5) = 2/3
    assert abs(strong_approx_error_exponent(2, 3) - 2/3) < 1e-9


def test_d3_p4():
    # max(3/4, (3-1)/2) = max(0.75, 1.0) = 1.0
    assert strong_approx_error_exponent(3, 4) == 1.0


def test_none_on_bad_d():
    assert strong_approx_error_exponent(0, 4) is None
    assert strong_approx_error_exponent(None, 4) is None
    assert strong_approx_error_exponent(1.5, 4) is None


def test_none_on_bad_p():
    assert strong_approx_error_exponent(2, 2) is None
    assert strong_approx_error_exponent(2, 1) is None
    assert strong_approx_error_exponent(2, None) is None
    assert strong_approx_error_exponent(2, "high") is None
