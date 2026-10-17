import pytest
from grok_eq_conformal_abs_nonconformity import conformal_abs_nonconformity

def test_basic():
    assert conformal_abs_nonconformity(5.0, 3.0) == 2.0

def test_zero():
    assert conformal_abs_nonconformity(1, 1) == 0.0

def test_negative():
    assert conformal_abs_nonconformity(-1, 1) == 2.0

def test_fail_none():
    assert conformal_abs_nonconformity(None, 1) is None

def test_fail_str():
    assert conformal_abs_nonconformity("a", 1) is None
