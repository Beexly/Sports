import pytest
from grok_eq_survival_copula import survival_copula

def test_basic_independence():
    # For independence C(u,v)=u*v, survival is same
    assert survival_copula(0.5, 0.5, 0.25) == 0.25

def test_bounds():
    assert survival_copula(0.0, 0.0, 1.0) == 0.0
    assert survival_copula(1.0, 1.0, 0.0) == 1.0

def test_fail_range():
    assert survival_copula(1.5, 0.5, 0.1) is None
    assert survival_copula(0.5, 0.5, 1.5) is None

def test_fail_type():
    assert survival_copula(None, 0.5, 0.1) is None
    assert survival_copula("a", 0.5, 0.1) is None

def test_result_out_of_bounds():
    # Would give 0.6 + 0.6 -1 + 0.9 = 1.1 >1
    assert survival_copula(0.6, 0.6, 0.9) is None
