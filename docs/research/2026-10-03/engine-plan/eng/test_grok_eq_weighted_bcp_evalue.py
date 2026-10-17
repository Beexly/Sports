"""Fail-closed tests for weighted_bcp_evalue. Returns None on invalid input."""
import math
import pytest
from grok_eq_weighted_bcp_evalue import weighted_bcp_evalue


def test_valid_simple():
    # W=2, S=1, sum_cal=1, w_test=1 -> denom=1+1*1=2, E=2*1/2=1
    res = weighted_bcp_evalue(2.0, 1.0, 1.0, 1.0)
    assert res is not None
    assert res == pytest.approx(1.0)
    assert math.isfinite(res)


def test_valid_fraction():
    # W=3, S=2, sum_cal=4, w_test=1 -> denom=4+2=6, E=6/6=1
    res = weighted_bcp_evalue(3.0, 2.0, 4.0, 1.0)
    assert res is not None
    assert res == pytest.approx(1.0)


def test_none_on_missing():
    assert weighted_bcp_evalue(None, 1.0, 1.0, 1.0) is None
    assert weighted_bcp_evalue(1.0, None, 1.0, 1.0) is None
    assert weighted_bcp_evalue(1.0, 1.0, None, 1.0) is None
    assert weighted_bcp_evalue(1.0, 1.0, 1.0, None) is None


def test_none_on_negative_or_zero_denom():
    assert weighted_bcp_evalue(-1.0, 1.0, 1.0, 1.0) is None
    assert weighted_bcp_evalue(1.0, -1.0, 1.0, 1.0) is None
    assert weighted_bcp_evalue(1.0, 1.0, 0.0, 0.0) is None
    assert weighted_bcp_evalue(1.0, 0.0, 0.0, 1.0) is None


def test_none_on_nonfinite():
    assert weighted_bcp_evalue(float("inf"), 1.0, 1.0, 1.0) is None
    assert weighted_bcp_evalue(1.0, float("nan"), 1.0, 1.0) is None
