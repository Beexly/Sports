"""Fail-closed tests for ogd_quantile_update."""
import math
from grok_eq_ogd_quantile_update import ogd_quantile_update


def test_increase_when_above():
    res = ogd_quantile_update(0.5, 0.6, 0.1, 0.1)
    assert res is not None
    assert res > 0.5
    assert math.isfinite(res)


def test_decrease_when_below():
    res = ogd_quantile_update(0.5, 0.4, 0.1, 0.1)
    assert res is not None
    assert res < 0.5
    assert res >= 0.0


def test_none_on_missing_or_bad():
    assert ogd_quantile_update(None, 0.1, 0.1, 0.1) is None
    assert ogd_quantile_update(0.5, None, 0.1, 0.1) is None
    assert ogd_quantile_update(0.5, 0.1, None, 0.1) is None
    assert ogd_quantile_update(0.5, 0.1, 0.1, None) is None
    assert ogd_quantile_update(0.5, 0.1, 0.0, 0.1) is None
    assert ogd_quantile_update(0.5, 0.1, 1.0, 0.1) is None
    assert ogd_quantile_update(0.5, 0.1, 0.1, -0.1) is None
    assert ogd_quantile_update(float('nan'), 0.1, 0.1, 0.1) is None


def test_floor_at_zero():
    res = ogd_quantile_update(0.01, 0.0, 0.1, 1.0)
    assert res is not None
    assert res == 0.0
