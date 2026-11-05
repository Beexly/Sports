"""Fail-closed tests for glocalcp_set_membership from arXiv:2611.04066 eq (10)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_glocalcp_set_membership import glocalcp_set_membership


def test_inside():
    assert glocalcp_set_membership(0.4, 1.0, 0.5, 0.0) == 1


def test_on_boundary():
    assert glocalcp_set_membership(0.5, 1.0, 0.5, 0.0) == 1


def test_outside():
    assert glocalcp_set_membership(0.6, 1.0, 0.5, 0.0) == 0


def test_scaled():
    # 0.4 / 0.5 = 0.8 > 0.5+0.1=0.6 so outside
    assert glocalcp_set_membership(0.4, 0.5, 0.5, 0.1) == 0
    # 0.2 / 0.5 = 0.4 <= 0.6 so inside
    assert glocalcp_set_membership(0.2, 0.5, 0.5, 0.1) == 1


def test_none_on_none():
    assert glocalcp_set_membership(None, 1.0, 0.5, 0.0) is None
    assert glocalcp_set_membership(0.4, None, 0.5, 0.0) is None


def test_none_on_nan():
    assert glocalcp_set_membership(float("nan"), 1.0, 0.5, 0.0) is None


def test_none_on_str():
    assert glocalcp_set_membership("0.4", 1.0, 0.5, 0.0) is None


def test_none_on_nonpositive_r():
    assert glocalcp_set_membership(0.4, 0.0, 0.5, 0.0) is None
    assert glocalcp_set_membership(0.4, -1.0, 0.5, 0.0) is None


if __name__ == "__main__":
    test_inside()
    test_on_boundary()
    test_outside()
    test_scaled()
    test_none_on_none()
    test_none_on_nan()
    test_none_on_str()
    test_none_on_nonpositive_r()
    print("8 tests passed")
