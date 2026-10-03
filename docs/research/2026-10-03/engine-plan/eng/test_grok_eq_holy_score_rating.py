"""Fail-closed checks for Holy and Cerny eq. (6). No network. No pick."""
from __future__ import annotations

import math

from grok_eq_holy_score_rating import PICKS_SETTLED, score_driven_rating_step


def test_printed_step() -> None:
    # r' = r + K * nabla, eq. (6)
    got = score_driven_rating_step([1200.0, 1180.0, 1200.0], [0.25, -0.25, 0.0], 16.0)
    assert got == [1204.0, 1176.0, 1200.0]


def test_k_not_positive_fails_closed() -> None:
    assert score_driven_rating_step([1.0], [1.0], 0.0) is None
    assert score_driven_rating_step([1.0], [1.0], -1.0) is None


def test_nonfinite_or_mismatch_fails_closed() -> None:
    assert score_driven_rating_step([1.0], [math.nan], 1.0) is None
    assert score_driven_rating_step([1.0, 2.0], [0.1], 1.0) is None
    assert score_driven_rating_step([], [], 1.0) is None
    assert score_driven_rating_step(["x"], [0.1], 1.0) is None


def test_picks_settled_stay_zero() -> None:
    assert PICKS_SETTLED == 0


def run() -> int:
    tests = (
        test_printed_step,
        test_k_not_positive_fails_closed,
        test_nonfinite_or_mismatch_fails_closed,
        test_picks_settled_stay_zero,
    )
    for fn in tests:
        fn()
    return len(tests)


if __name__ == "__main__":
    print(run())
