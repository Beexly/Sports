"""Fail-closed tests for cqr_conformity_score. Returns None on invalid input."""
import pytest
from grok_eq_cqr_conformity_score import cqr_conformity_score


def test_inside_interval():
    res = cqr_conformity_score(1.0, 3.0, 2.0)
    assert res == pytest.approx(-1.0)


def test_below():
    res = cqr_conformity_score(1.0, 3.0, 0.5)
    assert res == pytest.approx(0.5)


def test_above():
    res = cqr_conformity_score(1.0, 3.0, 4.0)
    assert res == pytest.approx(1.0)


def test_boundary():
    res = cqr_conformity_score(0.0, 1.0, 0.0)
    assert res == pytest.approx(0.0)


def test_none_on_invalid():
    assert cqr_conformity_score(None, 1.0, 0.5) is None
    assert cqr_conformity_score(1.0, None, 0.5) is None
    assert cqr_conformity_score(1.0, 2.0, None) is None
    assert cqr_conformity_score(2.0, 1.0, 1.5) is None
    assert cqr_conformity_score("a", 1.0, 0.5) is None
