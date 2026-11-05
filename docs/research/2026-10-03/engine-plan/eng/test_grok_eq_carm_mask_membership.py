"""Fail-closed tests for carm_mask_membership from arXiv:2611.06151 eq (1)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_carm_mask_membership import carm_mask_membership


def test_inside_mask():
    assert carm_mask_membership(0.3, 0.5) == 1


def test_on_boundary():
    assert carm_mask_membership(0.5, 0.5) == 1


def test_outside_mask():
    assert carm_mask_membership(0.7, 0.5) == 0


def test_none_on_none():
    assert carm_mask_membership(None, 0.5) is None
    assert carm_mask_membership(0.3, None) is None


def test_none_on_nan():
    assert carm_mask_membership(float("nan"), 0.5) is None
    assert carm_mask_membership(0.3, float("nan")) is None


def test_none_on_str():
    assert carm_mask_membership("0.3", 0.5) is None
    assert carm_mask_membership(0.3, "0.5") is None


def test_negative_ok():
    assert carm_mask_membership(-0.1, 0.0) == 1
    assert carm_mask_membership(0.1, -0.1) == 0


if __name__ == "__main__":
    test_inside_mask()
    test_on_boundary()
    test_outside_mask()
    test_none_on_none()
    test_none_on_nan()
    test_none_on_str()
    test_negative_ok()
    print("7 tests passed")
