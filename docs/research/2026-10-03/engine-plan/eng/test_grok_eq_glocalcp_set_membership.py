"""Fail-closed tests for glocalcp_set_membership from Xu et al arXiv:2611.04066 eq (10)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_glocalcp_set_membership import glocalcp_set_membership


def test_covered_basic():
    # s=0.5, r=1, q=0.4, g=0.2 -> 0.5 <= 0.6 -> True
    assert glocalcp_set_membership(0.5, 1.0, 0.4, 0.2) is True


def test_not_covered():
    # 0.8 / 1 > 0.4 + 0.2
    assert glocalcp_set_membership(0.8, 1.0, 0.4, 0.2) is False


def test_scale_helps():
    # high r makes it covered
    assert glocalcp_set_membership(0.8, 2.0, 0.4, 0.0) is True


def test_none_on_none():
    assert glocalcp_set_membership(None, 1.0, 0.4, 0.1) is None
    assert glocalcp_set_membership(0.5, None, 0.4, 0.1) is None
    assert glocalcp_set_membership(0.5, 1.0, None, 0.1) is None
    assert glocalcp_set_membership(0.5, 1.0, 0.4, None) is None


def test_none_on_bad_r():
    assert glocalcp_set_membership(0.5, 0.0, 0.4, 0.1) is None
    assert glocalcp_set_membership(0.5, -1.0, 0.4, 0.1) is None


def test_none_on_non_numeric():
    assert glocalcp_set_membership("a", 1.0, 0.4, 0.1) is None
    assert glocalcp_set_membership(0.5, "b", 0.4, 0.1) is None


def test_none_on_inf():
    assert glocalcp_set_membership(float("inf"), 1.0, 0.4, 0.1) is None
    assert glocalcp_set_membership(0.5, 1.0, float("nan"), 0.1) is None
