"""Fail-closed checks for OpenStax College Physics 2e average applied force. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_average_force import PICKS_SETTLED, hooke_average_applied_force


def test_printed_equation() -> None:
    # F_avg = (1/2) k x. Example 16.2: k = 50.0 N/m, x = 0.150 m -> 3.75 N
    got = hooke_average_applied_force(50.0, 0.150)
    assert got is not None
    assert abs(got - 3.75) < 1e-12
    assert hooke_average_applied_force(2.0, -4.0) == -4.0


def test_k_not_positive_fails_closed() -> None:
    assert hooke_average_applied_force(0.0, 1.0) is None
    assert hooke_average_applied_force(-1.0, 1.0) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_average_applied_force(math.nan, 1.0) is None
    assert hooke_average_applied_force(1.0, math.inf) is None
    assert hooke_average_applied_force(None, 1.0) is None
    assert hooke_average_applied_force(1.0, "x") is None


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
