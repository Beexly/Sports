"""Fail-closed tests for vine_copula_density. Returns None on invalid input."""
from grok_eq_vine_copula_density import vine_copula_density


def test_valid_product():
    assert vine_copula_density([0.5, 2.0, 1.0]) == 1.0


def test_none_on_none():
    assert vine_copula_density(None) is None


def test_none_on_empty():
    assert vine_copula_density([]) is None


def test_none_on_nonpositive():
    assert vine_copula_density([0.5, 0.0]) is None
    assert vine_copula_density([0.5, -1.0]) is None
    assert vine_copula_density([float("nan")]) is None
