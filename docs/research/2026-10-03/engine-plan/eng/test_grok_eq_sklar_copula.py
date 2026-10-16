"""Fail-closed tests for sklar_copula. Returns None on invalid input."""
import pytest
from grok_eq_sklar_copula import sklar_copula


def test_valid_return_c():
    res = sklar_copula(0.3, 0.7, 0.21)
    assert res is not None
    assert res == pytest.approx(0.21)


def test_boundary():
    res = sklar_copula(0.0, 1.0, 0.0)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_none_on_missing():
    assert sklar_copula(None, 0.5, 0.5) is None
    assert sklar_copula(0.5, None, 0.5) is None
    assert sklar_copula(0.5, 0.5, None) is None


def test_none_on_margin_out():
    assert sklar_copula(-0.1, 0.5, 0.5) is None
    assert sklar_copula(1.1, 0.5, 0.5) is None


def test_none_on_c_out():
    assert sklar_copula(0.5, 0.5, -0.1) is None
    assert sklar_copula(0.5, 0.5, 1.1) is None
