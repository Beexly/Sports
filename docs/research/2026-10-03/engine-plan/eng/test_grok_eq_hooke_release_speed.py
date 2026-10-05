"""Fail-closed checks for OpenStax College Physics 2e eq. 16.7. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_release_speed import PICKS_SETTLED, hooke_release_speed


def test_printed_equation() -> None:
    # Example 16.2 / eq. 16.7: PE_el = 0.563 J, m = 0.002 kg -> 23.7 m/s
    got = hooke_release_speed(0.563, 0.002)
    assert got is not None
    assert abs(got - math.sqrt(2.0 * 0.563 / 0.002)) < 1e-12
    assert abs(got - 23.7) < 0.05
    # Zero stored energy is a defined rest release.
    assert hooke_release_speed(0.0, 1.0) == 0.0


def test_nonpositive_mass_fails_closed() -> None:
    assert hooke_release_speed(0.563, 0.0) is None
    assert hooke_release_speed(0.563, -0.002) is None


def test_negative_or_nonfinite_fails_closed() -> None:
    assert hooke_release_speed(-0.563, 0.002) is None
    assert hooke_release_speed(math.nan, 0.002) is None
    assert hooke_release_speed(0.563, math.inf) is None
    assert hooke_release_speed(None, 0.002) is None
    assert hooke_release_speed(0.563, "m") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_nonpositive_mass_fails_closed,
        test_negative_or_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
