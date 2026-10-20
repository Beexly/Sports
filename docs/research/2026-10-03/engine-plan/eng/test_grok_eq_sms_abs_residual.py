import pytest
from grok_eq_sms_abs_residual import sms_abs_residual

def test_basic_positive():
    # 5 - 3 = 2
    assert sms_abs_residual(5, 3) == 2.0

def test_basic_negative():
    # 3 - 5 = 2
    assert sms_abs_residual(3, 5) == 2.0

def test_zero():
    # equal
    assert sms_abs_residual(4.5, 4.5) == 0.0

def test_fail_non_numeric_y():
    assert sms_abs_residual("a", 1) is None

def test_fail_non_numeric_mu():
    assert sms_abs_residual(1, None) is None
