"""Fail-closed checks for OpenStax College Physics 2e eq. 16.2. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_force_constant import PICKS_SETTLED, hooke_force_constant


def test_printed_equation() -> None:
    # Example 16.1: F = 784 N, x = -1.20e-2 m -> k = 6.5333...e4 N/m (eq. 16.3 prints 6.53e4)
    got = hooke_force_constant(784.0, -1.20e-2)
    assert got is not None
    assert abs(got - (784.0 / 1.20e-2)) < 1e-9
    assert abs(got - 6.533333333333333e4) < 1e-6
    # Opposite signs required by eq. 16.2. F = -7.5 N, x = 0.150 m -> k = 50
    assert hooke_force_constant(-7.5, 0.150) == 50.0


def test_same_sign_fails_closed() -> None:
    assert hooke_force_constant(784.0, 1.20e-2) is None
    assert hooke_force_constant(-1.0, -1.0) is None


def test_zero_or_nonfinite_fails_closed() -> None:
    assert hooke_force_constant(1.0, 0.0) is None
    assert hooke_force_constant(math.nan, -1.0) is None
    assert hooke_force_constant(1.0, math.inf) is None
    assert hooke_force_constant(None, -1.0) is None
    assert hooke_force_constant(1.0, "x") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_same_sign_fails_closed,
        test_zero_or_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
