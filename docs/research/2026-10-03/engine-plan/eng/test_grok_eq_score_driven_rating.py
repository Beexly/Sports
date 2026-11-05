"""Fail-closed tests for score_driven_rating_update from Holý & Černý arXiv:2604.09143 eq (6)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_score_driven_rating import score_driven_rating_update


def test_basic_update():
    # r=[100, 200], g=[1, -1], K=16 -> [116, 184]
    out = score_driven_rating_update([100.0, 200.0], [1.0, -1.0], 16.0)
    assert out == [116.0, 184.0]


def test_zero_gradient():
    out = score_driven_rating_update([100.0], [0.0], 10.0)
    assert out == [100.0]


def test_none_on_none():
    assert score_driven_rating_update(None, [1.0], 1.0) is None
    assert score_driven_rating_update([1.0], None, 1.0) is None
    assert score_driven_rating_update([1.0], [1.0], None) is None


def test_none_on_length_mismatch():
    assert score_driven_rating_update([1.0, 2.0], [1.0], 1.0) is None
    assert score_driven_rating_update([], [1.0], 1.0) is None


def test_none_on_bad_k():
    assert score_driven_rating_update([1.0], [1.0], 0.0) is None
    assert score_driven_rating_update([1.0], [1.0], -1.0) is None


def test_none_on_non_numeric():
    assert score_driven_rating_update(["a"], [1.0], 1.0) is None
    assert score_driven_rating_update([1.0], ["b"], 1.0) is None
    assert score_driven_rating_update([1.0], [1.0], "c") is None


def test_single_player():
    out = score_driven_rating_update([1500.0], [0.5], 32.0)
    assert out == [1516.0]
