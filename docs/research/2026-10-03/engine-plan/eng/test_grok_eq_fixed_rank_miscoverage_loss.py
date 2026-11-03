"""Fail-closed tests for fixed_rank_miscoverage_loss from arXiv:2610.31163 eq (3)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_fixed_rank_miscoverage_loss import fixed_rank_miscoverage_loss


def test_all_inside():
    assert fixed_rank_miscoverage_loss([1.0, 2.0, 3.0], [0.0, 1.0, 2.0], [2.0, 3.0, 4.0]) == 0.0


def test_all_outside():
    assert fixed_rank_miscoverage_loss([10.0, 20.0], [0.0, 0.0], [1.0, 1.0]) == 1.0


def test_half_outside():
    assert fixed_rank_miscoverage_loss([0.5, 5.0], [0.0, 0.0], [1.0, 1.0]) == 0.5


def test_empty_fails_closed():
    assert fixed_rank_miscoverage_loss([], [], []) is None


def test_length_mismatch_fails_closed():
    assert fixed_rank_miscoverage_loss([1.0], [0.0, 0.0], [1.0]) is None


def test_none_fails_closed():
    assert fixed_rank_miscoverage_loss(None, [0.0], [1.0]) is None
    assert fixed_rank_miscoverage_loss([1.0], None, [1.0]) is None


def test_non_finite_fails_closed():
    assert fixed_rank_miscoverage_loss([float("nan")], [0.0], [1.0]) is None
    assert fixed_rank_miscoverage_loss([1.0], [float("inf")], [2.0]) is None


def test_inverted_interval_fails_closed():
    assert fixed_rank_miscoverage_loss([1.0], [2.0], [0.0]) is None
