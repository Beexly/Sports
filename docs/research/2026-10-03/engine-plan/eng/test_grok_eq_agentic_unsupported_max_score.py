"""Fail-closed tests for agentic_unsupported_max_score from arXiv:2610.34872 eq (10)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_agentic_unsupported_max_score import agentic_unsupported_max_score


def test_empty_unsupported_returns_neg_inf():
    assert agentic_unsupported_max_score([0.5, 0.8], [1, 1]) == float("-inf")


def test_max_of_unsupported():
    assert agentic_unsupported_max_score([0.3, 0.9, 0.4], [0, 1, 0]) == 0.4


def test_single_unsupported():
    assert agentic_unsupported_max_score([0.7], [0]) == 0.7


def test_non_finite_fails_closed():
    assert agentic_unsupported_max_score([float("nan"), 0.1], [0, 1]) is None


def test_length_mismatch_fails_closed():
    assert agentic_unsupported_max_score([0.1], [0, 1]) is None


def test_none_input_fails_closed():
    assert agentic_unsupported_max_score(None, [0]) is None
