"""Fail-closed tests for cdpglm_exponential_tilt. Returns None on invalid input."""
import math
from grok_eq_cdpglm_exponential_tilt import cdpglm_exponential_tilt


def test_basic_tilt():
    res = cdpglm_exponential_tilt(0.5, 2.0, 1.0)
    assert res is not None
    assert abs(res - math.exp(0.5 * 2.0 - 1.0)) < 1e-9


def test_zero_theta():
    res = cdpglm_exponential_tilt(0.0, 10.0, 0.0)
    assert res is not None
    assert abs(res - 1.0) < 1e-9


def test_none_on_none():
    assert cdpglm_exponential_tilt(None, 2.0, 1.0) is None
    assert cdpglm_exponential_tilt(0.5, None, 1.0) is None
    assert cdpglm_exponential_tilt(0.5, 2.0, None) is None


def test_none_on_bad_values():
    assert cdpglm_exponential_tilt(float("nan"), 2.0, 1.0) is None
    assert cdpglm_exponential_tilt(0.5, float("inf"), 1.0) is None
    assert cdpglm_exponential_tilt(0.5, 2.0, float("-inf")) is None
    assert cdpglm_exponential_tilt("bad", 2.0, 1.0) is None
    assert cdpglm_exponential_tilt(1e7, 1.0, 0.0) is None


if __name__ == "__main__":
    test_basic_tilt()
    test_zero_theta()
    test_none_on_none()
    test_none_on_bad_values()
    print("4 tests passed")
