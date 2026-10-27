"""Fail-closed tests for crps_sample. Returns None on invalid input."""
import math
from grok_eq_crps_sample import crps_sample


def test_perfect_forecast():
    # all members equal to observation: CRPS = 0
    res = crps_sample([5.0, 5.0, 5.0], 5.0)
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_constant_bias():
    # all members = 6, obs=5: |diff|=1, pairs all 0 -> CRPS=1
    res = crps_sample([6.0, 6.0], 5.0)
    assert res is not None
    assert math.isclose(res, 1.0, abs_tol=1e-9)


def test_none_on_missing():
    assert crps_sample(None, 1.0) is None
    assert crps_sample([], 1.0) is None
    assert crps_sample([1.0], None) is None


def test_none_on_nonfinite():
    assert crps_sample([float("nan")], 1.0) is None
    assert crps_sample([1.0], float("inf")) is None
    assert crps_sample([float("-inf")], 0.0) is None


def test_two_members():
    # ensemble [1,3], obs=2
    # sum |fk-y| = |1-2| + |3-2| = 1+1=2, /2 =1
    # pairs: |1-1|=0, |1-3|=2, |3-1|=2, |3-3|=0; sum=4
    # 4 / (2*4) = 4/8=0.5
    # CRPS = 1 - 0.5 = 0.5
    res = crps_sample([1.0, 3.0], 2.0)
    assert res is not None
    assert math.isclose(res, 0.5, abs_tol=1e-9)
