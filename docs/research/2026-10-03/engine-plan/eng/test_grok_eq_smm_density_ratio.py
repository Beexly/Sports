"""Fail-closed tests for smm_density_ratio. Returns None on invalid input."""
import math
from grok_eq_smm_density_ratio import smm_density_ratio


def test_exact_ratio():
    # q_c=0.4, p_c=0.2, q_yc=0.6, p_yc=0.3 -> (0.4/0.2)*(0.6/0.3) = 2 * 2 = 4
    res = smm_density_ratio(0.4, 0.2, 0.6, 0.3)
    assert res is not None
    assert math.isclose(res, 4.0, abs_tol=1e-9)


def test_unit_ratio():
    res = smm_density_ratio(0.5, 0.5, 0.1, 0.1)
    assert res is not None
    assert math.isclose(res, 1.0, abs_tol=1e-9)


def test_zero_numerator_ok():
    res = smm_density_ratio(0.0, 0.5, 0.2, 0.4)
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_none_on_missing():
    assert smm_density_ratio(None, 0.2, 0.6, 0.3) is None
    assert smm_density_ratio(0.4, None, 0.6, 0.3) is None
    assert smm_density_ratio(0.4, 0.2, None, 0.3) is None
    assert smm_density_ratio(0.4, 0.2, 0.6, None) is None


def test_none_on_invalid():
    assert smm_density_ratio(0.4, 0.0, 0.6, 0.3) is None  # p_c <= 0
    assert smm_density_ratio(0.4, 0.2, 0.6, -0.1) is None  # p_yc <= 0
    assert smm_density_ratio(-0.1, 0.2, 0.6, 0.3) is None  # q_c < 0
    assert smm_density_ratio(float("nan"), 0.2, 0.6, 0.3) is None
    assert smm_density_ratio(0.4, float("inf"), 0.6, 0.3) is None
    assert smm_density_ratio(0.4, 0.2, 0.6, "bad") is None
