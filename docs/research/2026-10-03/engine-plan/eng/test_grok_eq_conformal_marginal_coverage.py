"""Fail-closed tests for conformal_marginal_coverage_bound. Returns None on invalid input."""
import math
import pytest
from grok_eq_conformal_marginal_coverage import conformal_marginal_coverage_bound


def test_valid_alpha_returns_bound():
    assert conformal_marginal_coverage_bound(0.1) == pytest.approx(0.9)
    assert conformal_marginal_coverage_bound(0.05) == pytest.approx(0.95)


def test_none_on_missing():
    assert conformal_marginal_coverage_bound(None) is None


def test_none_on_out_of_range():
    assert conformal_marginal_coverage_bound(0.0) is None
    assert conformal_marginal_coverage_bound(1.0) is None
    assert conformal_marginal_coverage_bound(-0.1) is None
    assert conformal_marginal_coverage_bound(1.1) is None


def test_none_on_non_finite():
    assert conformal_marginal_coverage_bound(float('nan')) is None
    assert conformal_marginal_coverage_bound(float('inf')) is None


def test_finite_result():
    res = conformal_marginal_coverage_bound(0.2)
    assert res is not None
    assert math.isfinite(res)
    assert 0.0 < res < 1.0
