"""Fail-closed tests for marshall_olkin_copula."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from grok_eq_marshall_olkin_copula import marshall_olkin_copula  # noqa: E402


def test_printed_independence_alpha0_beta0():
    # α=0, β=0 -> min(u v, u v) = u*v
    assert marshall_olkin_copula(0.4, 0.6, 0.0, 0.0) == 0.24


def test_printed_comonotonic_alpha1_beta1():
    # α=1, β=1 -> min(v, u) = min(u,v)
    assert marshall_olkin_copula(0.4, 0.6, 1.0, 1.0) == 0.4


def test_printed_mixed():
    result = marshall_olkin_copula(0.5, 0.5, 0.5, 0.0)
    assert result is not None and abs(result - 0.25) < 1e-12  # term1≈0.3536, term2=0.25


def test_fail_closed_bad_inputs():
    assert marshall_olkin_copula(None, 0.5, 0.5, 0.5) is None
    assert marshall_olkin_copula(0.5, 0.0, 0.5, 0.5) is None
    assert marshall_olkin_copula(0.5, 1.1, 0.5, 0.5) is None
    assert marshall_olkin_copula(0.5, 0.5, -0.1, 0.5) is None
    assert marshall_olkin_copula(0.5, 0.5, 0.5, 1.1) is None
    assert marshall_olkin_copula(0.5, float("nan"), 0.5, 0.5) is None


def test_fail_closed_inf():
    assert marshall_olkin_copula(0.5, 0.5, float("inf"), 0.5) is None


if __name__ == "__main__":
    test_printed_independence_alpha0_beta0()
    test_printed_comonotonic_alpha1_beta1()
    test_printed_mixed()
    test_fail_closed_bad_inputs()
    test_fail_closed_inf()
    print("5 tests passed")
