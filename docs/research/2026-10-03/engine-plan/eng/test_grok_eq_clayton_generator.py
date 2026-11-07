"""Fail-closed tests for clayton_generator. Returns None on invalid input."""
import pytest
from grok_eq_clayton_generator import clayton_generator


def test_basic_generator():
    # t=0.5, theta=1: (0.5^{-1} - 1)/1 = (2 - 1)/1 = 1.0
    assert clayton_generator(0.5, 1.0) == pytest.approx(1.0)


def test_unit_t():
    # t=1, any theta: (1^{-theta} - 1)/theta = 0
    assert clayton_generator(1.0, 2.0) == pytest.approx(0.0)


def test_none_on_missing():
    assert clayton_generator(None, 1.0) is None
    assert clayton_generator(0.5, None) is None


def test_none_on_bad_domain():
    assert clayton_generator(0.0, 1.0) is None
    assert clayton_generator(-0.1, 1.0) is None
    assert clayton_generator(1.1, 1.0) is None
    assert clayton_generator(0.5, 0.0) is None
    assert clayton_generator(0.5, -1.0) is None


def test_none_on_bad_type():
    assert clayton_generator("a", 1.0) is None
    assert clayton_generator(0.5, "b") is None
