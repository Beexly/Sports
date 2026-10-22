"""Fail-closed tests for conformal_split_quantile_index. Returns None on invalid input."""
from grok_eq_conformal_split_quantile_index import conformal_split_quantile_index


def test_typical_quantile():
    # n=99, alpha=0.1 -> k = ceil(100 * 0.9) = 90
    res = conformal_split_quantile_index(99, 0.1)
    assert res is not None
    assert res == 90


def test_boundary_valid():
    # n=9, alpha=0.1 -> k = ceil(10 * 0.9) = 9
    res = conformal_split_quantile_index(9, 0.1)
    assert res is not None
    assert res == 9


def test_none_on_missing():
    assert conformal_split_quantile_index(None, 0.1) is None
    assert conformal_split_quantile_index(10, None) is None


def test_none_on_bad_values():
    assert conformal_split_quantile_index(0, 0.1) is None
    assert conformal_split_quantile_index(-5, 0.1) is None
    assert conformal_split_quantile_index(10, 0.0) is None
    assert conformal_split_quantile_index(10, 1.0) is None
    assert conformal_split_quantile_index(10, -0.1) is None
    assert conformal_split_quantile_index(10, 1.1) is None
    assert conformal_split_quantile_index(10, float("nan")) is None
    # edge where k would exceed n
    assert conformal_split_quantile_index(1, 0.05) is None
