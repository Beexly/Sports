"""Fail-closed tests for couplings_prescribed_maxima_slack. Returns None on invalid input."""
import math
import pytest
from grok_eq_couplings_prescribed_maxima import couplings_prescribed_maxima_slack


def test_feasible_positive_slack():
    res = couplings_prescribed_maxima_slack(0.3, [0.2, 0.2])
    assert res is not None
    assert res == pytest.approx(0.1)
    assert math.isfinite(res)


def test_boundary_zero_slack():
    res = couplings_prescribed_maxima_slack(0.5, [0.3, 0.2])
    assert res is not None
    assert res == pytest.approx(0.0)


def test_infeasible_negative_slack():
    res = couplings_prescribed_maxima_slack(0.6, [0.2, 0.2])
    assert res is not None
    assert res == pytest.approx(-0.2)


def test_none_on_missing():
    assert couplings_prescribed_maxima_slack(None, [0.1]) is None
    assert couplings_prescribed_maxima_slack(0.1, None) is None
    assert couplings_prescribed_maxima_slack(0.1, [None]) is None


def test_none_on_negative_delta():
    assert couplings_prescribed_maxima_slack(-0.1, [0.2]) is None
    assert couplings_prescribed_maxima_slack(0.1, [-0.05]) is None


def test_none_on_empty_or_nonfinite():
    assert couplings_prescribed_maxima_slack(0.1, []) is None
    assert couplings_prescribed_maxima_slack(float("inf"), [0.1]) is None
    assert couplings_prescribed_maxima_slack(0.1, [float("nan")]) is None
