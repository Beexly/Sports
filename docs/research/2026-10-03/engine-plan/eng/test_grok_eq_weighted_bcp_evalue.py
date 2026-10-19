import pytest
from grok_eq_weighted_bcp_evalue import weighted_bcp_evalue

def test_basic():
    # W=3, S_test=2, sum_w_S=1, w_test=1, S_test=2 -> num=6, den=1+2=3, result=2.0
    assert weighted_bcp_evalue(3.0, 2.0, 1.0, 1.0, 2.0) == 2.0

def test_zero_num():
    assert weighted_bcp_evalue(0.0, 1.0, 1.0, 1.0, 1.0) == 0.0

def test_fail_den_zero():
    assert weighted_bcp_evalue(1.0, 1.0, 0.0, 0.0, 1.0) is None

def test_fail_none():
    assert weighted_bcp_evalue(None, 1.0, 1.0, 1.0, 1.0) is None

def test_fail_str():
    assert weighted_bcp_evalue("a", 1, 1, 1, 1) is None
