"""Fail-closed tests for product_copula."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from grok_eq_product_copula import product_copula  # noqa: E402


def test_printed_product_two():
    assert product_copula([0.5, 0.5]) == 0.25


def test_printed_product_three():
    assert product_copula([0.2, 0.3, 0.4]) == math.prod([0.2, 0.3, 0.4])


def test_bounds_inclusive():
    assert product_copula([0.0, 1.0]) == 0.0
    assert product_copula([1.0, 1.0]) == 1.0


def test_fail_closed_empty():
    assert product_copula([]) is None
    assert product_copula(None) is None


def test_fail_closed_out_of_range():
    assert product_copula([0.5, 1.1]) is None
    assert product_copula([-0.1, 0.5]) is None
    assert product_copula([0.5, float("nan")]) is None
    assert product_copula([0.5, float("inf")]) is None


if __name__ == "__main__":
    test_printed_product_two()
    test_printed_product_three()
    test_bounds_inclusive()
    test_fail_closed_empty()
    test_fail_closed_out_of_range()
    print("5 tests passed")
