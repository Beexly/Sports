import pytest
from grok_eq_conformal_set_loss_lambda import conformal_set_loss_lambda

def test_basic_covered():
    # y in gamma, size 2, lam 0.5 -> 2 + 0 = 2
    assert conformal_set_loss_lambda(1, [1, 2], 0.5) == 2.0

def test_basic_missed():
    # y not in, size 1, lam 0.5 -> 1 + 2 = 3
    assert conformal_set_loss_lambda(3, [1, 2], 0.5) == 4.0

def test_empty_set():
    # empty, missed, lam 1 -> 0 + 1 = 1
    assert conformal_set_loss_lambda(1, [], 1.0) == 1.0

def test_fail_bad_lam():
    assert conformal_set_loss_lambda(1, [1], 0) is None
    assert conformal_set_loss_lambda(1, [1], 1.1) is None

def test_fail_bad_gamma():
    assert conformal_set_loss_lambda(1, "not a set", 0.5) is None
    assert conformal_set_loss_lambda(1, None, 0.5) is None
