import pytest
from grok_eq_slice_normalized_evalue import slice_normalized_evalue

def test_basic_equal():
    # obs=2, refs=[2,2] -> mean=2, E=1
    assert slice_normalized_evalue(2, [2, 2]) == 1.0

def test_obs_higher():
    # obs=4, refs=[1,1] -> mean=2, E=2
    assert slice_normalized_evalue(4, [1, 1]) == 2.0

def test_obs_lower():
    # obs=1, refs=[3,3] -> mean=7/3 ≈ 2.333, E≈0.4286
    result = slice_normalized_evalue(1, [3, 3])
    assert abs(result - 1/ (7/3)) < 1e-9

def test_fail_non_positive_obs():
    assert slice_normalized_evalue(0, [1]) is None

def test_fail_empty_refs():
    assert slice_normalized_evalue(1, []) is None
