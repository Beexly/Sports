"""Fail-closed tests for conformal_two_sided_coverage_upper. Returns None on invalid input."""
import math
from grok_eq_conformal_two_sided_coverage import conformal_two_sided_coverage_upper


def approx(a, b, rel=1e-6):
    return abs(a - b) <= rel * max(abs(a), abs(b), 1e-12)


def test_valid_returns_upper():
    res = conformal_two_sided_coverage_upper(0.1, 100)
    assert res is not None
    assert approx(res, 1.0 - 0.1 + 1.0 / 101)
    assert res > 0.9


def test_none_on_missing():
    assert conformal_two_sided_coverage_upper(None, 10) is None
    assert conformal_two_sided_coverage_upper(0.1, None) is None


def test_none_on_bad_alpha():
    assert conformal_two_sided_coverage_upper(0.0, 10) is None
    assert conformal_two_sided_coverage_upper(1.0, 10) is None
    assert conformal_two_sided_coverage_upper(-0.05, 10) is None
    assert conformal_two_sided_coverage_upper(float('nan'), 10) is None


def test_none_on_bad_n():
    assert conformal_two_sided_coverage_upper(0.1, 0) is None
    assert conformal_two_sided_coverage_upper(0.1, -5) is None
    # float n is rejected by int()


def test_finite_positive_gap():
    res = conformal_two_sided_coverage_upper(0.05, 500)
    assert res is not None
    assert math.isfinite(res)
    assert res > 1.0 - 0.05
    assert res < 1.0


if __name__ == "__main__":
    test_valid_returns_upper()
    test_none_on_missing()
    test_none_on_bad_alpha()
    test_none_on_bad_n()
    test_finite_positive_gap()
    print("ALL TESTS PASSED: 5")
