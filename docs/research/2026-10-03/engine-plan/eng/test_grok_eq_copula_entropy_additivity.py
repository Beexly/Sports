import pytest
from grok_eq_copula_entropy_additivity import copula_entropy_additivity

def test_basic():
    assert copula_entropy_additivity(1.5, [0.5, 0.3]) == 2.3

def test_empty_psis():
    assert copula_entropy_additivity(2.0, []) == 2.0

def test_negative():
    assert copula_entropy_additivity(-0.5, [1.0, -0.2]) == 0.3

def test_fail_none():
    assert copula_entropy_additivity(None, [1.0]) is None

def test_fail_str():
    assert copula_entropy_additivity(1.0, ["a"]) is None
