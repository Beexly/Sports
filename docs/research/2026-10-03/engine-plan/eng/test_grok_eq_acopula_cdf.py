"""Fail-closed tests for acopula_cdf. Returns None on invalid input."""
import math
from grok_eq_acopula_cdf import acopula_cdf


def clayton_psi(s: float, theta: float = 2.0) -> float:
    return (theta * s + 1.0) ** (-1.0 / theta)


def clayton_psi_inv(u: float, theta: float = 2.0) -> float:
    return (u ** (-theta) - 1.0) / theta


def test_clayton_via_acopula():
    res = acopula_cdf(0.5, 0.5, lambda s: clayton_psi(s, 2.0), lambda u: clayton_psi_inv(u, 2.0))
    assert res is not None
    assert 0.0 < res <= 1.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert acopula_cdf(None, 0.5, lambda s: s, lambda u: u) is None
    assert acopula_cdf(0.5, None, lambda s: s, lambda u: u) is None
    assert acopula_cdf(0.5, 0.5, None, lambda u: u) is None
    assert acopula_cdf(0.5, 0.5, lambda s: s, None) is None


def test_none_on_out_of_range():
    assert acopula_cdf(0.0, 0.5, lambda s: s, lambda u: u) is None
    assert acopula_cdf(1.1, 0.5, lambda s: s, lambda u: u) is None


def test_none_on_bad_generator():
    def bad_psi(s: float) -> float:
        raise ValueError("bad")
    assert acopula_cdf(0.5, 0.5, bad_psi, lambda u: u) is None


def test_independence():
    # psi(s) = exp(-s), psi_inv(u) = -log(u) for independence
    res = acopula_cdf(0.4, 0.6, lambda s: math.exp(-s), lambda u: -math.log(u))
    assert res is not None
    assert abs(res - 0.4 * 0.6) < 1e-6
