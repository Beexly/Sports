"""Fail-closed tests for clayton_theta_from_tau. Returns None on invalid input."""
import math
import pytest
from grok_eq_clayton_theta_from_tau import clayton_theta_from_tau


def test_known_value():
    # tau=0.5 -> theta=2*0.5/0.5=2.0
    res = clayton_theta_from_tau(0.5)
    assert res is not None
    assert res == pytest.approx(2.0)


def test_small_tau():
    res = clayton_theta_from_tau(0.1)
    assert res is not None
    assert res == pytest.approx(2.0 * 0.1 / 0.9, abs=1e-6)


def test_large_tau_approaches_inf():
    res = clayton_theta_from_tau(0.99)
    assert res is not None
    assert res > 100.0


def test_none_on_missing():
    assert clayton_theta_from_tau(None) is None


def test_none_on_out_of_range():
    assert clayton_theta_from_tau(0.0) is None
    assert clayton_theta_from_tau(1.0) is None
    assert clayton_theta_from_tau(-0.1) is None
    assert clayton_theta_from_tau(1.1) is None


def test_none_on_nonfinite():
    assert clayton_theta_from_tau(float("inf")) is None
    assert clayton_theta_from_tau(float("nan")) is None
