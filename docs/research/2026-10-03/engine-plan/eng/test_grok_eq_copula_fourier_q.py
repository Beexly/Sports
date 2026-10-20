import pytest
from grok_eq_copula_fourier_q import copula_fourier_q

def test_basic():
    assert copula_fourier_q([1.0, 0.0, 2.0]) == 5.0

def test_empty():
    assert copula_fourier_q([]) == 0.0

def test_zero():
    assert copula_fourier_q([0.0, 0.0]) == 0.0

def test_fail_type():
    assert copula_fourier_q(None) is None
    assert copula_fourier_q("abc") is None

def test_fail_inner():
    assert copula_fourier_q([1.0, "bad"]) is None
