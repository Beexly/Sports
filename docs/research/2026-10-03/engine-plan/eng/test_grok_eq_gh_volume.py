"""Fail-closed tests for gh_volume. Returns None on invalid input."""
import math
import pytest
from grok_eq_gh_volume import gh_volume


def test_simple_product():
    # 2 * 3 * 4 = 24
    res = gh_volume([2.0, 3.0, 4.0])
    assert res is not None
    assert res == pytest.approx(24.0)


def test_single():
    res = gh_volume([5.5])
    assert res is not None
    assert res == pytest.approx(5.5)


def test_none_on_bad_input():
    assert gh_volume(None) is None
    assert gh_volume([]) is None
    assert gh_volume([0.0]) is None
    assert gh_volume([-1.0, 2.0]) is None
    assert gh_volume([float("nan"), 1.0]) is None
    assert gh_volume([float("inf")]) is None
    assert gh_volume([1.0, "a"]) is None
    assert gh_volume([1.0, None]) is None


def test_none_on_non_numeric():
    assert gh_volume(["x", "y"]) is None


def test_large_but_finite():
    res = gh_volume([1e-10, 1e10, 2.0])
    assert res is not None
    assert res == pytest.approx(2.0)
