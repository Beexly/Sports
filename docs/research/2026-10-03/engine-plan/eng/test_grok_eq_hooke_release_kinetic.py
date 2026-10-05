"""Fail-closed checks for OpenStax College Physics 2e eq. 16.6. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_release_kinetic import PICKS_SETTLED, hooke_release_kinetic


def test_printed_equation() -> None:
    # Example 16.2 / eq. 16.6: (1/2) m v^2 = PE_el = 0.563 J
    # Printed release uses m = 0.002 kg and the eq. 16.7 speed 23.7 m/s.
    got = hooke_release_kinetic(0.002, 23.7)
    assert got is not None
    assert abs(got - (0.5 * 0.002 * 23.7 * 23.7)) < 1e-12
    assert abs(got - 0.563) < 0.002
    # Rest speed stores no kinetic energy.
    assert hooke_release_kinetic(0.002, 0.0) == 0.0


def test_nonpositive_mass_fails_closed() -> None:
    assert hooke_release_kinetic(0.0, 23.7) is None
    assert hooke_release_kinetic(-0.002, 23.7) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_release_kinetic(math.nan, 23.7) is None
    assert hooke_release_kinetic(0.002, math.inf) is None
    assert hooke_release_kinetic(None, 23.7) is None
    assert hooke_release_kinetic(0.002, "v") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_nonpositive_mass_fails_closed,
        test_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
