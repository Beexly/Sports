"""Fail-closed tests for quasi_copula_lipschitz_bound. Returns None on invalid input."""
import pytest
from grok_eq_quasi_copula_lipschitz import quasi_copula_lipschitz_bound


def test_bivariate_bound():
    assert quasi_copula_lipschitz_bound([0.3, 0.4], [0.5, 0.6]) == pytest.approx(0.4)


def test_zero_when_equal():
    assert quasi_copula_lipschitz_bound([0.2, 0.8], [0.2, 0.8]) == 0.0


def test_none_on_missing():
    assert quasi_copula_lipschitz_bound(None, [0.5]) is None
    assert quasi_copula_lipschitz_bound([0.5], None) is None


def test_none_on_out_of_range():
    assert quasi_copula_lipschitz_bound([1.1, 0.5], [0.3, 0.4]) is None
    assert quasi_copula_lipschitz_bound([-0.1, 0.5], [0.3, 0.4]) is None


def test_none_on_dim_mismatch():
    assert quasi_copula_lipschitz_bound([0.1, 0.2], [0.3]) is None
    assert quasi_copula_lipschitz_bound([], [0.5]) is None
