"""Fail-closed tests for copula_nonexchangeability. Returns None on invalid input."""
import pytest
from grok_eq_copula_nonexchangeability import copula_nonexchangeability


def test_exchangeable_zero():
    assert copula_nonexchangeability(0.3, 0.3) == 0.0


def test_asymmetric_diff():
    assert copula_nonexchangeability(0.4, 0.1) == 0.3


def test_none_on_none():
    assert copula_nonexchangeability(None, 0.2) is None
    assert copula_nonexchangeability(0.2, None) is None


def test_none_on_out_of_range_and_bad():
    assert copula_nonexchangeability(-0.1, 0.2) is None
    assert copula_nonexchangeability(0.2, 1.1) is None
    assert copula_nonexchangeability(float("nan"), 0.2) is None
    assert copula_nonexchangeability("bad", 0.2) is None
