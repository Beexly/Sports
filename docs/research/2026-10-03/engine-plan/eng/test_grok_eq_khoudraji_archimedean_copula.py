"""Fail-closed tests for khoudraji_archimedean_copula. Returns None on invalid input."""
import math
from grok_eq_khoudraji_archimedean_copula import khoudraji_archimedean_copula


def clayton_phi(t: float, theta: float = 2.0) -> float:
    if t <= 0.0:
        return float("inf")
    return (t ** (-theta) - 1.0) / theta


def clayton_phi_inv(s: float, theta: float = 2.0) -> float:
    return (theta * s + 1.0) ** (-1.0 / theta)


def test_exchangeable_corner_matches_archimedean():
    # alpha=1,1 recovers pure Archimedean
    phi = lambda t: clayton_phi(t, 2.0)
    inv = lambda s: clayton_phi_inv(s, 2.0)
    res = khoudraji_archimedean_copula(0.5, 0.5, 1.0, 1.0, phi, inv)
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_independence_corner():
    # alpha=0,0 recovers independence: product
    phi = lambda t: clayton_phi(t, 2.0)
    inv = lambda s: clayton_phi_inv(s, 2.0)
    res = khoudraji_archimedean_copula(0.4, 0.6, 0.0, 0.0, phi, inv)
    assert res is not None
    assert abs(res - 0.4 * 0.6) < 1e-9


def test_none_on_missing():
    phi = lambda t: t
    inv = lambda s: s
    assert khoudraji_archimedean_copula(None, 0.5, 0.5, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(0.5, None, 0.5, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(0.5, 0.5, None, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(0.5, 0.5, 0.5, 0.5, None, inv) is None


def test_none_on_out_of_range():
    phi = lambda t: t
    inv = lambda s: s
    assert khoudraji_archimedean_copula(0.0, 0.5, 0.5, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(1.1, 0.5, 0.5, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(0.5, 0.5, 1.1, 0.5, phi, inv) is None
    assert khoudraji_archimedean_copula(0.5, 0.5, -0.1, 0.5, phi, inv) is None
