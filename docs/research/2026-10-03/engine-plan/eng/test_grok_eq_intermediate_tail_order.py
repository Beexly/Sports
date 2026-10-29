"""Fail-closed tests for intermediate_tail_order_rhs. Returns None on invalid input."""
import math
from grok_eq_intermediate_tail_order import intermediate_tail_order_rhs


def test_exact_simple():
    # u=0.1, kappa=1.5, ell=2.0, b=1.0 -> 0.1**1.5 * 2 * 1 ≈ 0.031622776 * 2 = 0.063245553
    res = intermediate_tail_order_rhs(0.1, 1.5, 2.0, 1.0)
    assert res is not None
    assert math.isclose(res, (0.1 ** 1.5) * 2.0 * 1.0, abs_tol=1e-9)


def test_kappa_one():
    res = intermediate_tail_order_rhs(0.05, 1.0, 1.0, 0.8)
    assert res is not None
    assert math.isclose(res, 0.05 * 1.0 * 0.8, abs_tol=1e-9)


def test_none_on_missing():
    assert intermediate_tail_order_rhs(None, 1.5, 1.0, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, None, 1.0, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, 1.5, None, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, 1.5, 1.0, None) is None


def test_none_on_invalid_domain():
    assert intermediate_tail_order_rhs(0.0, 1.5, 1.0, 1.0) is None  # u <= 0
    assert intermediate_tail_order_rhs(-0.1, 1.5, 1.0, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, 0.5, 1.0, 1.0) is None  # kappa < 1
    assert intermediate_tail_order_rhs(0.1, 1.5, -1.0, 1.0) is None  # ell < 0
    assert intermediate_tail_order_rhs(0.1, 1.5, 1.0, -0.1) is None  # b < 0


def test_none_on_nonfinite():
    assert intermediate_tail_order_rhs(float("nan"), 1.5, 1.0, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, float("inf"), 1.0, 1.0) is None
    assert intermediate_tail_order_rhs(0.1, 1.5, float("nan"), 1.0) is None
    assert intermediate_tail_order_rhs(0.1, 1.5, 1.0, float("inf")) is None
