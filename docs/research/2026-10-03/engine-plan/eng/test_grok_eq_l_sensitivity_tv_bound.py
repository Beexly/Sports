"""Fail-closed tests for l_sensitivity_tv_bound from Mahrous & Di Pietro arXiv:2611.05277 Def 2.2."""
from __future__ import annotations

import sys
from pathlib import Path

# allow import from eng/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_l_sensitivity_tv_bound import l_sensitivity_tv_bound


def test_basic_bound():
    # TV <= L * d
    assert l_sensitivity_tv_bound(0.5, 0.2) == 0.1


def test_zero_d():
    assert l_sensitivity_tv_bound(1.0, 0.0) == 0.0


def test_l_one():
    assert l_sensitivity_tv_bound(1.0, 0.3) == 0.3


def test_none_on_none():
    assert l_sensitivity_tv_bound(None, 0.1) is None
    assert l_sensitivity_tv_bound(0.5, None) is None


def test_none_on_negative():
    assert l_sensitivity_tv_bound(-0.1, 0.2) is None
    assert l_sensitivity_tv_bound(0.5, -0.1) is None


def test_none_on_non_numeric():
    assert l_sensitivity_tv_bound("a", 0.1) is None
    assert l_sensitivity_tv_bound(0.5, "b") is None


def test_float_ok():
    assert abs(l_sensitivity_tv_bound(0.75, 0.4) - 0.3) < 1e-12
