"""Fail-closed tests for ogd_quantile_tracker. Returns None on invalid input."""
import pytest
from grok_eq_ogd_quantile_tracker import ogd_quantile_tracker


def test_increase_when_residual_exceeds():
    res = ogd_quantile_tracker(1.0, 2.0, 0.1, 0.05)
    assert res == pytest.approx(1.0 + 0.05 * 0.9)


def test_decrease_when_residual_below():
    res = ogd_quantile_tracker(1.0, 0.5, 0.1, 0.05)
    assert res == pytest.approx(1.0 + 0.05 * (-0.1))


def test_floor_at_zero():
    res = ogd_quantile_tracker(0.01, 0.0, 0.1, 1.0)
    assert res == pytest.approx(0.0)


def test_none_on_invalid():
    assert ogd_quantile_tracker(None, 1.0, 0.1, 0.05) is None
    assert ogd_quantile_tracker(1.0, None, 0.1, 0.05) is None
    assert ogd_quantile_tracker(1.0, 1.0, None, 0.05) is None
    assert ogd_quantile_tracker(1.0, 1.0, 0.1, None) is None
    assert ogd_quantile_tracker(1.0, 1.0, 0.0, 0.05) is None
    assert ogd_quantile_tracker(1.0, 1.0, 1.0, 0.05) is None
    assert ogd_quantile_tracker(1.0, 1.0, 0.1, 0.0) is None
    assert ogd_quantile_tracker(-0.1, 1.0, 0.1, 0.05) is None
    assert ogd_quantile_tracker("bad", 1.0, 0.1, 0.05) is None
