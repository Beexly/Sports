"""Fail-closed tests for doa_conformal_nonconformity_score from arXiv:2610.39566."""
import math
from grok_eq_doa_conformal_nonconformity import doa_conformal_nonconformity_score


def test_unit_prob_zero():
    res = doa_conformal_nonconformity_score(1.0)
    assert res is not None
    assert math.isclose(res, 0.0)


def test_half_prob():
    res = doa_conformal_nonconformity_score(0.5)
    assert res is not None
    assert math.isclose(res, -math.log(0.5))


def test_small_prob_large_score():
    res = doa_conformal_nonconformity_score(0.01)
    assert res is not None
    assert res > 4.0


def test_none_on_bad_inputs():
    assert doa_conformal_nonconformity_score(None) is None
    assert doa_conformal_nonconformity_score(0.0) is None
    assert doa_conformal_nonconformity_score(-0.1) is None
    assert doa_conformal_nonconformity_score(1.1) is None
    assert doa_conformal_nonconformity_score(float('nan')) is None
    assert doa_conformal_nonconformity_score(float('inf')) is None


def test_boundary_near_zero():
    res = doa_conformal_nonconformity_score(1e-10)
    assert res is not None
    assert res > 20.0
