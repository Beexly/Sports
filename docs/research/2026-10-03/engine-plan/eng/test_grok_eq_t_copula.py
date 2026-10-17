"""Fail-closed tests for t_copula. Returns None on invalid or non-closed-form input."""
import pytest
from grok_eq_t_copula import t_copula


def test_independence():
    res = t_copula(0.3, 0.7, 0.0, 5.0)
    assert res is not None
    assert res == pytest.approx(0.21)


def test_frechet_upper():
    res = t_copula(0.3, 0.7, 1.0, 4.0)
    assert res is not None
    assert res == pytest.approx(0.3)


def test_frechet_lower():
    res = t_copula(0.3, 0.7, -1.0, 3.0)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_none_on_missing_or_out():
    assert t_copula(None, 0.5, 0.0, 5.0) is None
    assert t_copula(0.5, None, 0.0, 5.0) is None
    assert t_copula(0.5, 0.5, None, 5.0) is None
    assert t_copula(0.5, 0.5, 0.0, None) is None
    assert t_copula(-0.1, 0.5, 0.0, 5.0) is None
    assert t_copula(0.5, 1.1, 0.0, 5.0) is None
    assert t_copula(0.5, 0.5, 1.1, 5.0) is None
    assert t_copula(0.5, 0.5, 0.0, -1.0) is None
    assert t_copula(0.5, 0.5, 0.0, 0.0) is None


def test_general_fails_closed():
    assert t_copula(0.3, 0.7, 0.5, 5.0) is None
