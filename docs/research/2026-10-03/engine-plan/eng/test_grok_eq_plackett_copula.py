"""Fail-closed tests for plackett_copula."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from grok_eq_plackett_copula import plackett_copula  # noqa: E402


def test_printed_independence():
    assert plackett_copula(0.4, 0.6, 1.0) == 0.24


def test_printed_positive():
    # known value from CRAN example style; compute exact
    result = plackett_copula(0.4, 0.6, 2.0)
    assert result is not None and 0.0 < result < min(0.4, 0.6)
    assert abs(result - 0.2788897449072021) < 1e-12  # exact for this input


def test_bounds_inclusive():
    assert plackett_copula(0.0, 1.0, 2.0) == 0.0
    assert plackett_copula(1.0, 1.0, 2.0) == 1.0


def test_fail_closed_bad_inputs():
    assert plackett_copula(None, 0.5, 2.0) is None
    assert plackett_copula(0.5, 1.1, 2.0) is None
    assert plackett_copula(0.5, 0.5, 0.0) is None
    assert plackett_copula(0.5, 0.5, -1.0) is None
    assert plackett_copula(0.5, float("nan"), 2.0) is None


def test_fail_closed_theta_inf():
    assert plackett_copula(0.5, 0.5, float("inf")) is None


if __name__ == "__main__":
    test_printed_independence()
    test_printed_positive()
    test_bounds_inclusive()
    test_fail_closed_bad_inputs()
    test_fail_closed_theta_inf()
    print("5 tests passed")
