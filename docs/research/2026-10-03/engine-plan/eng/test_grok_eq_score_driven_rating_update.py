"""Fail-closed tests for score_driven_rating_update from arXiv:2604.09143 eq (6)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_score_driven_rating_update import score_driven_rating_update


def test_basic_update():
    result = score_driven_rating_update([1500.0, 1400.0], [0.5, -0.5], 16.0)
    assert result == [1508.0, 1392.0]


def test_zero_score_no_change():
    result = score_driven_rating_update([1200.0], [0.0], 32.0)
    assert result == [1200.0]


def test_k_positive_required():
    assert score_driven_rating_update([1000.0], [1.0], 0.0) is None
    assert score_driven_rating_update([1000.0], [1.0], -1.0) is None


def test_length_mismatch_fails_closed():
    assert score_driven_rating_update([1000.0, 1100.0], [0.1], 16.0) is None


def test_non_finite_fails_closed():
    assert score_driven_rating_update([float("nan")], [0.1], 16.0) is None
    assert score_driven_rating_update([1000.0], [float("inf")], 16.0) is None


def test_none_input_fails_closed():
    assert score_driven_rating_update(None, [0.1], 16.0) is None
