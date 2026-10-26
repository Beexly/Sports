import pytest
from grok_eq_pcc_shrunk_offset import pcc_shrunk_offset


def test_basic_scale():
    assert abs(pcc_shrunk_offset(0.5, 0.2) - 0.1) < 1e-9


def test_zero_lambda():
    assert pcc_shrunk_offset(1.5, 0.0) == 0.0


def test_one_lambda():
    assert pcc_shrunk_offset(-0.3, 1.0) == -0.3


def test_fail_closed_range():
    assert pcc_shrunk_offset(1.0, 1.5) is None
    assert pcc_shrunk_offset(1.0, -0.1) is None


def test_fail_closed_type():
    assert pcc_shrunk_offset(None, 0.5) is None
    assert pcc_shrunk_offset(1.0, "bad") is None
    assert pcc_shrunk_offset(float("inf"), 0.5) is None
