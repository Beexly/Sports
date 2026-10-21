"""Fail-closed tests for cryptic_iprojection_density. Returns None on invalid input."""
import pytest
from grok_eq_cryptic_iprojection_density import cryptic_iprojection_density


def test_basic():
    res = cryptic_iprojection_density(1.0, 0.5, 0.25)
    assert res is not None
    assert res == pytest.approx(2.0)


def test_unity_ratio():
    res = cryptic_iprojection_density(0.8, 0.4, 0.4)
    assert res == pytest.approx(0.8)


def test_zero_denom():
    assert cryptic_iprojection_density(1.0, 0.5, 0.0) is None


def test_negative():
    assert cryptic_iprojection_density(1.0, -0.1, 0.5) is None
    assert cryptic_iprojection_density(-1.0, 0.5, 0.5) is None


def test_none_on_invalid():
    assert cryptic_iprojection_density(None, 0.5, 0.5) is None
    assert cryptic_iprojection_density(1.0, None, 0.5) is None
    assert cryptic_iprojection_density(1.0, 0.5, None) is None
    assert cryptic_iprojection_density("bad", 0.5, 0.5) is None
