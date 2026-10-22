"""Fail-closed tests for khoudraji_bivariate. Returns None on invalid input."""
import math
from grok_eq_khoudraji_bivariate import khoudraji_bivariate


def test_independence_corner():
    # alpha=beta=0, base=1 (independence) -> product
    res = khoudraji_bivariate(0.4, 0.6, 0.0, 0.0, 1.0)
    assert res is not None
    assert abs(res - 0.4 * 0.6) < 1e-9


def test_exchangeable_corner():
    # alpha=beta=1, mult=1, returns base
    res = khoudraji_bivariate(0.5, 0.7, 1.0, 1.0, 0.35)
    assert res is not None
    assert abs(res - 0.35) < 1e-9


def test_none_on_missing():
    assert khoudraji_bivariate(None, 0.5, 0.5, 0.5, 0.5) is None
    assert khoudraji_bivariate(0.5, 0.5, 0.5, 0.5, None) is None


def test_none_on_bad_values():
    assert khoudraji_bivariate(0.0, 0.5, 0.5, 0.5, 0.5) is None
    assert khoudraji_bivariate(1.1, 0.5, 0.5, 0.5, 0.5) is None
    assert khoudraji_bivariate(0.5, 0.5, -0.1, 0.5, 0.5) is None
    assert khoudraji_bivariate(0.5, 0.5, 1.1, 0.5, 0.5) is None
    assert khoudraji_bivariate(0.5, 0.5, 0.5, 0.5, 1.1) is None
    assert khoudraji_bivariate(0.5, 0.5, 0.5, 0.5, -0.1) is None
    assert khoudraji_bivariate(float("nan"), 0.5, 0.5, 0.5, 0.5) is None
