import pytest
from grok_eq_split_conformal_abs_residual import split_conformal_abs_residual

def test_basic():
    assert split_conformal_abs_residual(5.0, 3.0) == 2.0

def test_zero():
    assert split_conformal_abs_residual(1, 1) == 0.0

def test_negative():
    assert split_conformal_abs_residual(-1, 1) == 2.0

def test_fail_none():
    assert split_conformal_abs_residual(None, 1) is None

def test_fail_str():
    assert split_conformal_abs_residual("a", 1) is None
