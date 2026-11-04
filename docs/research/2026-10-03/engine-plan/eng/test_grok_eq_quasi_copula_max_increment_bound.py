"""Fail-closed tests for quasi_copula_max_increment_bound from Ansari arXiv:2610.30642 eq (2)."""
from __future__ import annotations

import sys
from pathlib import Path

# allow import from eng/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_quasi_copula_max_increment_bound import quasi_copula_max_increment_bound


def test_basic_increment():
    # G(t)-G(s) <= sum (F_i(t)-F_i(s))
    # RHS = (0.3-0.1) + (0.4-0.2) = 0.2 + 0.2 = 0.4
    assert quasi_copula_max_increment_bound([0.1, 0.2], [0.3, 0.4]) == 0.4


def test_single_component():
    assert quasi_copula_max_increment_bound([0.0], [1.0]) == 1.0


def test_zero_increment():
    assert quasi_copula_max_increment_bound([0.5, 0.5], [0.5, 0.5]) == 0.0


def test_negative_allowed():
    # can be negative if F decrease, though not typical
    assert quasi_copula_max_increment_bound([0.8], [0.3]) == -0.5


def test_none_on_none_input():
    assert quasi_copula_max_increment_bound(None, [0.1]) is None
    assert quasi_copula_max_increment_bound([0.1], None) is None


def test_none_on_empty():
    assert quasi_copula_max_increment_bound([], []) is None


def test_none_on_length_mismatch():
    assert quasi_copula_max_increment_bound([0.1], [0.1, 0.2]) is None


def test_none_on_non_numeric():
    assert quasi_copula_max_increment_bound([0.1, "a"], [0.2, 0.3]) is None
