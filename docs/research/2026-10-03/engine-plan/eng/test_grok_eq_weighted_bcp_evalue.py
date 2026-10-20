import pytest
from grok_eq_weighted_bcp_evalue import weighted_bcp_evalue

def test_basic():
    # n=1, s_cal=[1], w_cal=[1], s_test=2, w_test=1 -> W=2, denom=1*1 +1*2=3, e=2*2/3=4/3
    assert weighted_bcp_evalue(2, [1], [1], 1) == pytest.approx(4/3)

def test_uniform_weights():
    # equal scores, weights 1: e=1
    assert weighted_bcp_evalue(1, [1, 1], [1, 1], 1) == pytest.approx(1.0)

def test_zero_denom_fail():
    assert weighted_bcp_evalue(0, [0], [1], 1) is None

def test_fail_non_numeric():
    assert weighted_bcp_evalue("a", [1], [1], 1) is None

def test_fail_length_mismatch():
    assert weighted_bcp_evalue(1, [1, 2], [1], 1) is None
