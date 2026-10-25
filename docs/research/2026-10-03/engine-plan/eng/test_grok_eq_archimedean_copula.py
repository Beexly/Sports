"""Fail-closed tests for archimedean_copula. Returns None on invalid input."""
import math
from grok_eq_archimedean_copula import archimedean_copula


def clayton_phi(t: float, theta: float = 2.0) -> float:
    return (t ** (-theta) - 1.0) / theta


def clayton_phi_inv(s: float, theta: float = 2.0) -> float:
    return (theta * s + 1.0) ** (-1.0 / theta)


def test_clayton_via_archimedean():
    # Clayton theta=2, u=v=0.5 should match known
    res = archimedean_copula(0.5, 0.5, lambda t: clayton_phi(t, 2.0), lambda s: clayton_phi_inv(s, 2.0))
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert archimedean_copula(None, 0.5, lambda t: t, lambda s: s) is None
    assert archimedean_copula(0.5, None, lambda t: t, lambda s: s) is None
    assert archimedean_copula(0.5, 0.5, None, lambda s: s) is None
    assert archimedean_copula(0.5, 0.5, lambda t: t, None) is None


def test_none_on_out_of_range():
    assert archimedean_copula(0.0, 0.5, lambda t: t, lambda s: s) is None
    assert archimedean_copula(1.1, 0.5, lambda t: t, lambda s: s) is None


def test_none_on_bad_generator():
    # generator that raises
    def bad_phi(t: float) -> float:
        raise ValueError("bad")
    assert archimedean_copula(0.5, 0.5, bad_phi, lambda s: s) is None
