"""Fail-closed tests for conformal_split_k_alpha. Returns None on invalid input."""
import math
from grok_eq_conformal_split_k_alpha import conformal_split_k_alpha


def test_valid_returns_k():
    # alpha=0.1, m=100 -> ceil(101*0.9)=ceil(90.9)=91
    res = conformal_split_k_alpha(0.1, 100)
    assert res is not None
    assert res == 91
    assert 1 <= res <= 101


def test_none_on_missing():
    assert conformal_split_k_alpha(None, 10) is None
    assert conformal_split_k_alpha(0.1, None) is None


def test_none_on_bad_alpha():
    assert conformal_split_k_alpha(0.0, 10) is None
    assert conformal_split_k_alpha(1.0, 10) is None
    assert conformal_split_k_alpha(-0.05, 10) is None
    assert conformal_split_k_alpha(float('nan'), 10) is None


def test_none_on_bad_m():
    assert conformal_split_k_alpha(0.1, 0) is None
    assert conformal_split_k_alpha(0.1, -5) is None


def test_edge_alpha():
    res = conformal_split_k_alpha(0.05, 19)
    assert res is not None
    # ceil(20 * 0.95) = ceil(19) = 19
    assert res == 19


if __name__ == "__main__":
    test_valid_returns_k()
    test_none_on_missing()
    test_none_on_bad_alpha()
    test_none_on_bad_m()
    test_edge_alpha()
    print("ALL TESTS PASSED: 5")
