"""Fail-closed tests for lac_score (Bi et al. arXiv:2611.05812 printed LAC score 1-p_k)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_lac_score import lac_score


def test_lac_score_basic() -> None:
    assert lac_score(0.4) == 0.6
    assert lac_score(0.0) == 1.0
    assert lac_score(1.0) == 0.0


def test_lac_score_none() -> None:
    assert lac_score(None) is None


def test_lac_score_out_of_range() -> None:
    assert lac_score(-0.1) is None
    assert lac_score(1.1) is None


def test_lac_score_bad_type() -> None:
    assert lac_score("bad") is None  # type: ignore[arg-type]
    assert lac_score([0.5]) is None  # type: ignore[arg-type]


def test_lac_score_float_ok() -> None:
    assert abs(lac_score(0.333) - 0.667) < 1e-9
