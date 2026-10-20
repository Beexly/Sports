"""Fail-closed tests for vine_copula_stability_order. Returns None on invalid input."""
import math
from grok_eq_vine_copula_stability_order import vine_copula_stability_order


def test_basic_positive():
    res = vine_copula_stability_order(0.01, 2)
    assert res is not None
    assert math.isclose(res, 0.01 ** (1.0 / 3.0), rel_tol=1e-6)
    assert 0.0 < res < 1.0
    assert math.isfinite(res)


def test_higher_dim():
    res = vine_copula_stability_order(1e-4, 5)
    assert res is not None
    assert math.isclose(res, 1e-4 ** (1.0 / 9.0), rel_tol=1e-5)
    assert math.isfinite(res)


def test_none_on_missing():
    assert vine_copula_stability_order(None, 2) is None
    assert vine_copula_stability_order(0.1, None) is None


def test_none_on_nonpositive_epsilon():
    assert vine_copula_stability_order(0.0, 2) is None
    assert vine_copula_stability_order(-0.01, 2) is None


def test_none_on_bad_dim():
    assert vine_copula_stability_order(0.1, 0) is None
    assert vine_copula_stability_order(0.1, -1) is None


if __name__ == "__main__":
    test_basic_positive()
    test_higher_dim()
    test_none_on_missing()
    test_none_on_nonpositive_epsilon()
    test_none_on_bad_dim()
    print("all 5 tests passed")
