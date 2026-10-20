"""Fail-closed tests for conformal_scaled_residual. Returns None on invalid input."""
import pytest
from grok_eq_conformal_scaled_residual import conformal_scaled_residual


def test_simple():
    res = conformal_scaled_residual(5.0, 3.0, 2.0)
    assert res is not None
    assert res == pytest.approx(1.0)


def test_zero_residual():
    res = conformal_scaled_residual(4.0, 4.0, 1.5)
    assert res == pytest.approx(0.0)


def test_negative_y():
    res = conformal_scaled_residual(-1.0, 1.0, 2.0)
    assert res == pytest.approx(1.0)


def test_none_on_invalid():
    assert conformal_scaled_residual(None, 1.0, 1.0) is None
    assert conformal_scaled_residual(1.0, None, 1.0) is None
    assert conformal_scaled_residual(1.0, 1.0, None) is None
    assert conformal_scaled_residual(1.0, 1.0, 0.0) is None
    assert conformal_scaled_residual(1.0, 1.0, -1.0) is None
    assert conformal_scaled_residual("bad", 1.0, 1.0) is None
