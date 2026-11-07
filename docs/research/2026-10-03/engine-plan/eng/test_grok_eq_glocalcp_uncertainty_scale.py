"""Fail-closed tests for glocalcp_uncertainty_scale. Returns None on invalid input."""
import math
import pytest
from grok_eq_glocalcp_uncertainty_scale import glocalcp_uncertainty_scale


def test_known_high_mi():
    # MI=log(2)~0.693, log|Y|=log(2), sqrt(1)=1, max(0.1,1)=1
    res = glocalcp_uncertainty_scale(math.log(2), math.log(2), 0.1)
    assert res is not None
    assert res == pytest.approx(1.0)


def test_low_mi_floor():
    res = glocalcp_uncertainty_scale(0.01, math.log(2), 0.2)
    assert res is not None
    assert res == pytest.approx(0.2)


def test_exact_boundary():
    # sqrt(MI/log) = 0.15 exactly
    mi = 0.15**2 * math.log(2)
    res = glocalcp_uncertainty_scale(mi, math.log(2), 0.1)
    assert res is not None
    assert res == pytest.approx(0.15)


def test_none_on_bad_input():
    assert glocalcp_uncertainty_scale(None, 1.0) is None
    assert glocalcp_uncertainty_scale(0.5, 0.0) is None
    assert glocalcp_uncertainty_scale(-0.1, 1.0) is None
    assert glocalcp_uncertainty_scale(0.5, 1.0, 0.0) is None
    assert glocalcp_uncertainty_scale(float("nan"), 1.0) is None


def test_none_on_overflow():
    assert glocalcp_uncertainty_scale(1e300, 1e-300, 0.1) is None
