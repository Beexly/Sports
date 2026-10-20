import pytest
from grok_eq_cas_kl_error import cas_kl_error

def test_basic_sum():
    assert cas_kl_error(0.1, 0.2, 0.3) == 0.6

def test_zeros():
    assert cas_kl_error(0.0, 0.0, 0.0) == 0.0

def test_fail_negative():
    assert cas_kl_error(-0.1, 0.2, 0.3) is None
    assert cas_kl_error(0.1, -0.2, 0.3) is None

def test_fail_type():
    assert cas_kl_error(None, 0.1, 0.1) is None
    assert cas_kl_error("a", 0.1, 0.1) is None

def test_large():
    assert cas_kl_error(1.0, 2.0, 3.0) == 6.0
