"""Fail-closed tests for conformal_cqr_score. Returns None on invalid input."""
import pytest
from grok_eq_conformal_cqr_score import conformal_cqr_score


def test_basic_inside():
    # y inside [lo, hi]: max(lo-y, y-hi) = max(negative, negative) = negative? Wait, for score usually positive outside.
    # Example: lo=0, hi=10, y=5: max(0-5, 5-10)=max(-5,-5)=-5
    assert conformal_cqr_score(0.0, 10.0, 5.0) == pytest.approx(-5.0)


def test_outside_above():
    # y=12: max(0-12, 12-10)=max(-12, 2)=2
    assert conformal_cqr_score(0.0, 10.0, 12.0) == pytest.approx(2.0)


def test_outside_below():
    # y=-2: max(0-(-2), -2-10)=max(2, -12)=2
    assert conformal_cqr_score(0.0, 10.0, -2.0) == pytest.approx(2.0)


def test_none_on_missing():
    assert conformal_cqr_score(None, 10.0, 5.0) is None
    assert conformal_cqr_score(0.0, None, 5.0) is None
    assert conformal_cqr_score(0.0, 10.0, None) is None


def test_none_on_bad_type_or_nan():
    assert conformal_cqr_score("a", 10.0, 5.0) is None
    assert conformal_cqr_score(float("nan"), 10.0, 5.0) is None
    assert conformal_cqr_score(0.0, 10.0, float("inf")) is None
