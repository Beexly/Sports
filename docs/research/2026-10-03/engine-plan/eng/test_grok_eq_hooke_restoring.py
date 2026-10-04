"""Fail-closed checks for OpenStax College Physics 2e eq. 16.1. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_restoring import PICKS_SETTLED, hooke_restoring_force


def test_printed_equation() -> None:
    # F = -k x. k = 50.0 N/m, x = 0.150 m -> F = -7.5 N
    got = hooke_restoring_force(50.0, 0.150)
    assert got is not None
    assert abs(got - (-7.5)) < 1e-12
    assert hooke_restoring_force(2.0, -3.0) == 6.0


def test_k_not_positive_fails_closed() -> None:
    assert hooke_restoring_force(0.0, 1.0) is None
    assert hooke_restoring_force(-1.0, 1.0) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_restoring_force(math.nan, 1.0) is None
    assert hooke_restoring_force(1.0, math.inf) is None
    assert hooke_restoring_force(None, 1.0) is None
    assert hooke_restoring_force(1.0, "x") is None


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
