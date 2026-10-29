"""Fail-closed tests for couplings_prescribed_maxima_excess. Returns None on invalid input."""
import math
from grok_eq_couplings_prescribed_maxima import couplings_prescribed_maxima_excess


def test_holds_when_excess_negative():
    # G(t)=0.6, G(s)=0.2, diffs=[0.3, 0.2] sum=0.5; excess=0.4 - 0.5 = -0.1
    res = couplings_prescribed_maxima_excess(0.6, 0.2, [0.3, 0.2], 0.0, 1.0)
    assert res is not None
    assert math.isclose(res, -0.1, abs_tol=1e-9)


def test_holds_when_equal():
    res = couplings_prescribed_maxima_excess(0.5, 0.1, [0.2, 0.2], 0.0, 1.0)
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_violates_when_positive():
    # excess positive means inequality fails
    res = couplings_prescribed_maxima_excess(0.8, 0.1, [0.2, 0.2], 0.0, 1.0)
    assert res is not None
    assert res > 0.0


def test_none_on_missing():
    assert couplings_prescribed_maxima_excess(None, 0.1, [0.1], 0.0, 1.0) is None
    assert couplings_prescribed_maxima_excess(0.5, None, [0.1], 0.0, 1.0) is None
    assert couplings_prescribed_maxima_excess(0.5, 0.1, None, 0.0, 1.0) is None


def test_none_on_invalid():
    assert couplings_prescribed_maxima_excess(0.5, 0.1, [], 0.0, 1.0) is None  # empty diffs
    assert couplings_prescribed_maxima_excess(0.5, 0.1, [-0.1], 0.0, 1.0) is None  # negative diff
    assert couplings_prescribed_maxima_excess(0.5, 0.1, [0.1], 1.0, 0.0) is None  # s >= t
    assert couplings_prescribed_maxima_excess(float("nan"), 0.1, [0.1], 0.0, 1.0) is None
    assert couplings_prescribed_maxima_excess(0.5, 0.1, [float("inf")], 0.0, 1.0) is None
    assert couplings_prescribed_maxima_excess(0.5, 0.1, ["bad"], 0.0, 1.0) is None
