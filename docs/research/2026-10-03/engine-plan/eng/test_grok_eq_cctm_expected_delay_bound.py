"""Fail-closed tests for cctm_expected_delay_bound. Returns None on invalid input."""
import math
from grok_eq_cctm_expected_delay_bound import cctm_expected_delay_bound


def test_basic_positive():
    res = cctm_expected_delay_bound(0.05, 0.1, 100.0)
    assert res is not None
    assert math.isfinite(res)
    assert res > 0.0


def test_zero_t0():
    res = cctm_expected_delay_bound(0.1, 0.2, 0.0)
    assert res is not None
    assert math.isfinite(res)


def test_none_on_missing():
    assert cctm_expected_delay_bound(None, 0.1, 10) is None
    assert cctm_expected_delay_bound(0.05, None, 10) is None
    assert cctm_expected_delay_bound(0.05, 0.1, None) is None


def test_none_on_bad_alpha():
    assert cctm_expected_delay_bound(0.0, 0.1, 10) is None
    assert cctm_expected_delay_bound(1.0, 0.1, 10) is None
    assert cctm_expected_delay_bound(-0.1, 0.1, 10) is None
    assert cctm_expected_delay_bound(1.1, 0.1, 10) is None


def test_none_on_bad_delta_or_t0():
    assert cctm_expected_delay_bound(0.05, 0.0, 10) is None
    assert cctm_expected_delay_bound(0.05, -0.1, 10) is None
    assert cctm_expected_delay_bound(0.05, 0.1, -1.0) is None


if __name__ == "__main__":
    test_basic_positive()
    test_zero_t0()
    test_none_on_missing()
    test_none_on_bad_alpha()
    test_none_on_bad_delta_or_t0()
    print("all 5 tests passed")
