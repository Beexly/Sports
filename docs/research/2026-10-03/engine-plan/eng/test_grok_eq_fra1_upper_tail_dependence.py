"""Fail-closed tests for fra1_upper_tail_dependence. Returns None on invalid input."""
import math
from grok_eq_fra1_upper_tail_dependence import fra1_upper_tail_dependence


def approx(a, b, rel=1e-6):
    return abs(a - b) <= rel * max(abs(a), abs(b), 1e-12)


def test_valid_independence():
    res = fra1_upper_tail_dependence(-1.0)
    assert res is not None
    assert approx(res, 0.0)


def test_valid_positive():
    res = fra1_upper_tail_dependence(0.0)
    assert res is not None
    assert approx(res, max(2.0 - 2.0 ** 1.0, 0.0))
    assert res == 0.0


def test_valid_high():
    res = fra1_upper_tail_dependence(0.5)
    assert res is not None
    assert res > 0.0
    assert math.isfinite(res)


def test_none_on_missing():
    assert fra1_upper_tail_dependence(None) is None


def test_none_on_bad_range():
    assert fra1_upper_tail_dependence(-1.1) is None
    assert fra1_upper_tail_dependence(1.0) is None
    assert fra1_upper_tail_dependence(float('nan')) is None
    assert fra1_upper_tail_dependence(float('inf')) is None


def test_finite():
    res = fra1_upper_tail_dependence(0.9)
    assert res is not None
    assert math.isfinite(res)
    assert 0.0 <= res <= 1.0


if __name__ == "__main__":
    test_valid_independence()
    test_valid_positive()
    test_valid_high()
    test_none_on_missing()
    test_none_on_bad_range()
    test_finite()
    print("ALL TESTS PASSED: 6")
