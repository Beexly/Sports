"""Fail-closed checks for OpenStax College Physics 2e deformation work. No network. No pick."""
from __future__ import annotations

import math

from grok_eq_hooke_deformation_work import PICKS_SETTLED, hooke_deformation_work


def test_printed_equation() -> None:
    # Method B / Figure 16.6: W = [(1/2) k x] (x) = (1/2) k x^2
    # Example 16.2 eq. 16.5 uses k = 50.0 N/m, x = 0.150 m, stored work 0.563 J.
    got = hooke_deformation_work(50.0, 0.150)
    assert got is not None
    assert abs(got - (0.5 * 50.0 * 0.150 * 0.150)) < 1e-12
    assert abs(got - 0.563) < 0.001
    # Zero displacement stores no work.
    assert hooke_deformation_work(50.0, 0.0) == 0.0


def test_nonpositive_k_fails_closed() -> None:
    assert hooke_deformation_work(0.0, 0.150) is None
    assert hooke_deformation_work(-50.0, 0.150) is None


def test_nonfinite_fails_closed() -> None:
    assert hooke_deformation_work(math.nan, 0.150) is None
    assert hooke_deformation_work(50.0, math.inf) is None
    assert hooke_deformation_work(None, 0.150) is None
    assert hooke_deformation_work(50.0, "x") is None


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
