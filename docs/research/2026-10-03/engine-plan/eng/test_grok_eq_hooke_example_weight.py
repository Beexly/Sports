"""Fail-closed checks for OpenStax College Physics 2e Example 16.1 weight. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_example_weight import PICKS_SETTLED, hooke_example_weight


def test_printed_equation() -> None:
    # Example 16.1: w = mg = (80.0 kg)(9.80 m/s^2) = 784 N.
    got = hooke_example_weight(80.0, 9.80)
    assert got is not None
    assert abs(got - (80.0 * 9.80)) < 1e-12
    assert abs(got - 784.0) < 1e-9


def test_nonpositive_fails_closed() -> None:
    assert hooke_example_weight(0.0, 9.80) is None
    assert hooke_example_weight(-80.0, 9.80) is None
    assert hooke_example_weight(80.0, 0.0) is None
    assert hooke_example_weight(80.0, -9.80) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_example_weight(math.nan, 9.80) is None
    assert hooke_example_weight(80.0, math.inf) is None
    assert hooke_example_weight(None, 9.80) is None
    assert hooke_example_weight(80.0, "g") is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_equation,
        test_nonpositive_fails_closed,
        test_nonfinite_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
