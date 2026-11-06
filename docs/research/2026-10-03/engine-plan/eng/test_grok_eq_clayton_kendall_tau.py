"""Fail-closed tests for clayton_kendall_tau. Returns None on invalid input."""
import math
import pytest
from grok_eq_clayton_kendall_tau import clayton_kendall_tau


def test_known_value():
    # theta=2 -> tau=2/4=0.5
    res = clayton_kendall_tau(2.0)
    assert res is not None
    assert res == pytest.approx(0.5)


def test_small_theta():
    res = clayton_kendall_tau(0.001)
    assert res is not None
    assert res == pytest.approx(0.001 / 2.001, abs=1e-6)


def test_large_theta_approaches_one():
    res = clayton_kendall_tau(1000.0)
    assert res is not None
    assert 0.99 < res < 1.0


def test_none_on_missing():
    assert clayton_kendall_tau(None) is None


def test_none_on_nonpositive():
    assert clayton_kendall_tau(0.0) is None
    assert clayton_kendall_tau(-1.0) is None


def test_none_on_nonfinite():
    assert clayton_kendall_tau(float("inf")) is None
    assert clayton_kendall_tau(float("nan")) is None
