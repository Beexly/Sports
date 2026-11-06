"""Fail-closed tests for d2d_coeff_set_membership.
"""
from __future__ import annotations

import math
from grok_eq_d2d_coeff_set_membership import d2d_coeff_set_membership


def test_valid_inside():
    assert d2d_coeff_set_membership(0.5, 1.0) == 1


def test_valid_outside():
    assert d2d_coeff_set_membership(1.5, 1.0) == 0


def test_equal_boundary():
    assert d2d_coeff_set_membership(1.0, 1.0) == 1


def test_none_input():
    assert d2d_coeff_set_membership(None, 1.0) is None
    assert d2d_coeff_set_membership(1.0, None) is None


def test_nan_input():
    assert d2d_coeff_set_membership(float("nan"), 1.0) is None
    assert d2d_coeff_set_membership(1.0, float("nan")) is None


def test_inf_input():
    assert d2d_coeff_set_membership(float("inf"), 1.0) is None
    assert d2d_coeff_set_membership(1.0, float("-inf")) is None


def test_non_numeric():
    assert d2d_coeff_set_membership("bad", 1.0) is None
    assert d2d_coeff_set_membership(1.0, "bad") is None


def test_negative_ok():
    assert d2d_coeff_set_membership(-0.5, 0.0) == 1
