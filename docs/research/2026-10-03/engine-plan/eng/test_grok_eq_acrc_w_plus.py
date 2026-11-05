"""Fail-closed tests for acrc_w_plus from Qiao et al arXiv:2611.01053 eq (6)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_acrc_w_plus import acrc_w_plus


def test_printed_example():
    # n=2, alpha=0.4, l=(0.5,0.5) -> 0.7
    assert abs(acrc_w_plus([0.5, 0.5], 0.4) - 0.7) < 1e-3


def test_binary_sum_one():
    # (1,0) both give 0.6
    assert abs(acrc_w_plus([1.0, 0.0], 0.4) - 0.6) < 1e-3


def test_clip_at_one():
    # small losses, large a should clip
    assert acrc_w_plus([0.0, 0.0], 0.5) == 1.0


def test_none_on_none():
    assert acrc_w_plus(None, 0.1) is None
    assert acrc_w_plus([0.5], None) is None


def test_none_on_bad_alpha():
    assert acrc_w_plus([0.5], 0.0) is None
    assert acrc_w_plus([0.5], 1.0) is None
    assert acrc_w_plus([0.5], -0.1) is None


def test_none_on_bad_loss():
    assert acrc_w_plus([1.1], 0.4) is None
    assert acrc_w_plus([-0.1], 0.4) is None
    assert acrc_w_plus([], 0.4) is None


def test_none_on_non_numeric():
    assert acrc_w_plus(["a"], 0.4) is None
    assert acrc_w_plus([0.5], "b") is None
