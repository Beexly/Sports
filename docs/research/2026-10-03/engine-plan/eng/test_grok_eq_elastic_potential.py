"""Fail-closed checks for OpenStax College Physics 2e eq. 16.4. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_elastic_potential import PICKS_SETTLED, elastic_potential_energy


def test_printed_equation() -> None:
    # Example 16.2: k = 50.0 N/m, x = 0.150 m -> PE_el = 0.5625 J
    got = elastic_potential_energy(50.0, 0.150)
    assert got is not None
    assert abs(got - 0.5625) < 1e-12
    assert elastic_potential_energy(2.0, -3.0) == 9.0


def test_k_not_positive_fails_closed() -> None:
    assert elastic_potential_energy(0.0, 1.0) is None
    assert elastic_potential_energy(-1.0, 1.0) is None


def test_nonfinite_fails_closed() -> None:
    assert elastic_potential_energy(math.nan, 1.0) is None
    assert elastic_potential_energy(1.0, math.inf) is None
    assert elastic_potential_energy(None, 1.0) is None
    assert elastic_potential_energy(1.0, "x") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_k_not_positive_fails_closed,
        test_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
