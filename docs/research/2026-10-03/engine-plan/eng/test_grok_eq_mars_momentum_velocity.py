"""Fail-closed tests for mars_momentum_velocity. Returns None on invalid input."""
import pytest
from grok_eq_mars_momentum_velocity import mars_momentum_velocity


def test_full_momentum():
    res = mars_momentum_velocity(2.0, 1.0, 5.0)
    assert res == pytest.approx(2.0)


def test_no_momentum():
    res = mars_momentum_velocity(2.0, 0.0, 5.0)
    assert res == pytest.approx(5.0)


def test_partial_momentum():
    res = mars_momentum_velocity(2.0, 0.6, 5.0)
    assert res == pytest.approx(0.6 * 2.0 + 0.4 * 5.0)


def test_none_on_invalid():
    assert mars_momentum_velocity(None, 0.5, 1.0) is None
    assert mars_momentum_velocity(1.0, None, 1.0) is None
    assert mars_momentum_velocity(1.0, 0.5, None) is None
    assert mars_momentum_velocity(1.0, -0.1, 1.0) is None
    assert mars_momentum_velocity(1.0, 1.1, 1.0) is None
    assert mars_momentum_velocity("bad", 0.5, 1.0) is None
    assert mars_momentum_velocity(1.0, "bad", 1.0) is None
    assert mars_momentum_velocity(1.0, 0.5, "bad") is None
