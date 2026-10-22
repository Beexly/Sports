"""Fail-closed tests for formability_diff."""
from __future__ import annotations

import sys
from pathlib import Path

# allow import from sibling
sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_formability_diff import formability_diff


def test_valid_diff():
    assert formability_diff(0.8, 0.3) == 0.5
    assert formability_diff(1.0, 0.0) == 1.0
    assert formability_diff(0.5, 0.5) == 0.0


def test_none_inputs():
    assert formability_diff(None, 0.3) is None
    assert formability_diff(0.8, None) is None


def test_out_of_bounds():
    assert formability_diff(1.1, 0.3) is None
    assert formability_diff(0.8, -0.1) is None
    assert formability_diff(0.8, 1.1) is None


def test_non_finite():
    assert formability_diff(float("nan"), 0.3) is None
    assert formability_diff(0.8, float("inf")) is None
    assert formability_diff("bad", 0.3) is None
