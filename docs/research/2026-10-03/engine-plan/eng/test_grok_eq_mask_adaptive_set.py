"""Fail-closed tests for mask_adaptive_set from arXiv:2611.01724."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_mask_adaptive_set import mask_adaptive_set


def test_inside():
    assert mask_adaptive_set(0.3, 0.5) == 1


def test_on_boundary():
    assert mask_adaptive_set(0.5, 0.5) == 1


def test_outside():
    assert mask_adaptive_set(0.7, 0.5) == 0


def test_none_on_none():
    assert mask_adaptive_set(None, 0.5) is None
    assert mask_adaptive_set(0.3, None) is None


def test_none_on_nan():
    assert mask_adaptive_set(float("nan"), 0.5) is None
    assert mask_adaptive_set(0.3, float("nan")) is None


def test_none_on_str():
    assert mask_adaptive_set("0.3", 0.5) is None
    assert mask_adaptive_set(0.3, "0.5") is None


def test_negative_ok():
    assert mask_adaptive_set(-0.1, 0.0) == 1
    assert mask_adaptive_set(0.1, -0.1) == 0


if __name__ == "__main__":
    test_inside()
    test_on_boundary()
    test_outside()
    test_none_on_none()
    test_none_on_nan()
    test_none_on_str()
    test_negative_ok()
    print("7 tests passed")
