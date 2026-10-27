"""Fail-closed tests for online_ogd_quantile_update. Returns None on invalid input."""
import pytest
from grok_eq_online_ogd_quantile_update import online_ogd_quantile_update


def test_increase():
    res = online_ogd_quantile_update(0.5, 0.1, 0.1, 1.0)
    assert res == pytest.approx(0.5 + 0.1 * 0.9)


def test_decrease():
    res = online_ogd_quantile_update(0.5, 0.1, 0.1, 0.2)
    assert res == pytest.approx(0.5 + 0.1 * (-0.1))


def test_floor_at_zero():
    res = online_ogd_quantile_update(0.01, 1.0, 0.1, 0.0)
    assert res == pytest.approx(0.0)


def test_equal_residual():
    res = online_ogd_quantile_update(0.5, 0.1, 0.2, 0.5)
    assert res == pytest.approx(0.5 + 0.1 * (-0.2))


def test_none_on_invalid():
    assert online_ogd_quantile_update(None, 0.1, 0.1, 1.0) is None
    assert online_ogd_quantile_update(0.5, None, 0.1, 1.0) is None
    assert online_ogd_quantile_update(0.5, 0.1, None, 1.0) is None
    assert online_ogd_quantile_update(0.5, 0.1, 0.1, None) is None
    assert online_ogd_quantile_update(0.5, 0.0, 0.1, 1.0) is None
    assert online_ogd_quantile_update(0.5, 0.1, 0.0, 1.0) is None
    assert online_ogd_quantile_update(0.5, 0.1, 1.0, 1.0) is None
    assert online_ogd_quantile_update(-0.1, 0.1, 0.1, 1.0) is None
    assert online_ogd_quantile_update(0.5, 0.1, 0.1, -1.0) is None
    assert online_ogd_quantile_update("a", 0.1, 0.1, 1.0) is None
