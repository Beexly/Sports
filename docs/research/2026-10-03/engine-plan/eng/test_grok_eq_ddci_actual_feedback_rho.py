"""Fail-closed tests for ddci_actual_feedback_rho. Returns None on invalid input."""
import math
import pytest
from grok_eq_ddci_actual_feedback_rho import ddci_actual_feedback_rho


def test_basic_cap():
    res = ddci_actual_feedback_rho(2.0, 1.0)
    assert res is not None
    assert res == pytest.approx(1.0)


def test_fraction():
    res = ddci_actual_feedback_rho(0.5, 2.0)
    assert res == pytest.approx(0.25)


def test_zero_max():
    assert ddci_actual_feedback_rho(1.0, 0.0) is None


def test_negative_max():
    assert ddci_actual_feedback_rho(1.0, -1.0) is None


def test_none_on_invalid():
    assert ddci_actual_feedback_rho(None, 1.0) is None
    assert ddci_actual_feedback_rho(1.0, None) is None
    assert ddci_actual_feedback_rho("bad", 1.0) is None
    assert ddci_actual_feedback_rho(float("nan"), 1.0) is None
    assert ddci_actual_feedback_rho(1.0, float("inf")) is None
