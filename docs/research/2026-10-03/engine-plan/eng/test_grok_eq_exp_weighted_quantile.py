"""Fail-closed tests for exp_weighted_quantile. Returns None on invalid input."""
import math
import pytest
from grok_eq_exp_weighted_quantile import exp_weighted_quantile


def test_uniform_weights_matches_quantile():
    res = exp_weighted_quantile([1.0, 2.0, 3.0, 4.0], [1.0, 1.0, 1.0, 1.0], 0.25)
    assert res is not None
    assert res == pytest.approx(3.0)


def test_exp_weights_prefer_recent():
    # higher weights on larger residuals -> higher quantile
    res = exp_weighted_quantile([1.0, 2.0, 10.0], [0.1, 0.2, 1.0], 0.1)
    assert res is not None
    assert res >= 10.0 or res == pytest.approx(10.0)


def test_none_on_missing_or_bad_alpha():
    assert exp_weighted_quantile(None, [1.0], 0.1) is None
    assert exp_weighted_quantile([1.0], None, 0.1) is None
    assert exp_weighted_quantile([1.0], [1.0], None) is None
    assert exp_weighted_quantile([1.0], [1.0], 0.0) is None
    assert exp_weighted_quantile([1.0], [1.0], 1.0) is None
    assert exp_weighted_quantile([], [], 0.1) is None
    assert exp_weighted_quantile([1.0], [0.0], 0.1) is None
    assert exp_weighted_quantile([1.0, None], [1.0, 1.0], 0.1) is None


def test_finite_on_valid():
    res = exp_weighted_quantile([0.5, 1.5, 2.5], [0.5, 0.3, 0.2], 0.2)
    assert res is not None
    assert math.isfinite(res)
