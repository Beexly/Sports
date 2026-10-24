"""Fail-closed tests for fisher_z_tau. Returns None on invalid input."""
import math
import pytest
from grok_eq_fisher_z_tau import fisher_z_tau


def test_zero_eta_gives_zero_tau():
    res = fisher_z_tau(0.0)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_positive_eta_positive_tau():
    res = fisher_z_tau(2.0)
    assert res is not None
    assert res == pytest.approx(math.tanh(1.0))


def test_negative_eta_negative_tau():
    res = fisher_z_tau(-2.0)
    assert res is not None
    assert res == pytest.approx(math.tanh(-1.0))


def test_none_on_missing():
    assert fisher_z_tau(None) is None


def test_none_on_nonfinite():
    assert fisher_z_tau(float("inf")) is None
    assert fisher_z_tau(float("nan")) is None


def test_finite_on_valid():
    res = fisher_z_tau(1.0)
    assert res is not None
    assert math.isfinite(res)
    assert -1.0 < res < 1.0
