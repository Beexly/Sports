"""Fail-closed tests for cpd_weighted_quantile_objective."""
import math
from grok_eq_cpd_weighted_quantile_objective import cpd_weighted_quantile_objective


def test_basic_sum():
    res = cpd_weighted_quantile_objective(1.0, 0.5, 0.3, 2.0, 1.0)
    assert res is not None
    assert math.isclose(res, 1.0 + 2.0*0.5 + 1.0*0.3)


def test_zero_weights():
    res = cpd_weighted_quantile_objective(1.0, 0.5, 0.3, 0.0, 0.0)
    assert res is not None
    assert res == 1.0


def test_none_on_missing():
    assert cpd_weighted_quantile_objective(None, 0.1, 0.1, 1.0, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, None, 0.1, 1.0, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, 0.1, None, 1.0, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, 0.1, 0.1, None, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, 0.1, 0.1, 1.0, None) is None


def test_none_on_negative():
    assert cpd_weighted_quantile_objective(1.0, 0.1, 0.1, -1.0, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, 0.1, 0.1, 1.0, -1.0) is None
    assert cpd_weighted_quantile_objective(-1.0, 0.1, 0.1, 1.0, 1.0) is None


def test_none_on_nan():
    assert cpd_weighted_quantile_objective(float('nan'), 0.1, 0.1, 1.0, 1.0) is None
    assert cpd_weighted_quantile_objective(1.0, float('inf'), 0.1, 1.0, 1.0) is None
