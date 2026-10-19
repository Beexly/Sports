import pytest
from grok_eq_smscp_nonconformity import smscp_nonconformity

def test_basic():
    assert smscp_nonconformity(5.0, 3.0) == 2.0

def test_zero():
    assert smscp_nonconformity(1, 1) == 0.0

def test_negative():
    assert smscp_nonconformity(-1, 1) == 2.0

def test_fail_none():
    assert smscp_nonconformity(None, 1) is None

def test_fail_str():
    assert smscp_nonconformity("a", 1) is None
