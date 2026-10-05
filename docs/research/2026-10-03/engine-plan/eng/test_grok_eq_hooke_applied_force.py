"""Fail-closed checks for OpenStax College Physics 2e F_app = kx. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_applied_force import PICKS_SETTLED, hooke_applied_force


def test_printed_equation() -> None:
    # Example 16.2 spring: k = 50.0 N/m, x = 0.150 m -> F_app = 7.5 N
    assert hooke_applied_force(50.0, 0.150) == 7.5
    # Sign follows displacement. Compression x = -0.150 m -> F_app = -7.5 N
    assert hooke_applied_force(50.0, -0.150) == -7.5
    # Equilibrium displacement stores no applied force.
    assert hooke_applied_force(50.0, 0.0) == 0.0


def test_nonpositive_k_fails_closed() -> None:
    assert hooke_applied_force(0.0, 0.150) is None
    assert hooke_applied_force(-50.0, 0.150) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_applied_force(math.nan, 0.150) is None
    assert hooke_applied_force(50.0, math.inf) is None
    assert hooke_applied_force(None, 0.150) is None
    assert hooke_applied_force(50.0, "x") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_nonpositive_k_fails_closed,
        test_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
