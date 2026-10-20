import pytest
from grok_eq_moment_calibrated_ecdf import moment_calibrated_ecdf

def test_basic():
    assert moment_calibrated_ecdf([0.5, 0.5], [1.0, 3.0], 2.0) == 0.5

def test_all():
    assert moment_calibrated_ecdf([0.3, 0.7], [1.0, 2.0], 3.0) == 1.0

def test_none_below():
    assert moment_calibrated_ecdf([0.5, 0.5], [4.0, 5.0], 3.0) == 0.0

def test_fail_len():
    assert moment_calibrated_ecdf([0.5], [1.0, 2.0], 1.0) is None

def test_fail_type():
    assert moment_calibrated_ecdf(None, [1.0], 1.0) is None
    assert moment_calibrated_ecdf([0.5], "bad", 1.0) is None
