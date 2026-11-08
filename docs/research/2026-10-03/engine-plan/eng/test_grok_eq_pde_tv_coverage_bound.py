"""Fail-closed tests for pde_tv_coverage_lower_bound. Returns None or clamped on invalid."""
import pytest
from grok_eq_pde_tv_coverage_bound import pde_tv_coverage_lower_bound


def test_basic_bound():
    assert pde_tv_coverage_lower_bound(0.1, 0.05) == pytest.approx(0.85)


def test_zero_penalty():
    assert pde_tv_coverage_lower_bound(0.05, 0.0) == pytest.approx(0.95)


def test_none_on_missing():
    assert pde_tv_coverage_lower_bound(None, 0.1) is None
    assert pde_tv_coverage_lower_bound(0.1, None) is None


def test_none_on_bad_alpha():
    assert pde_tv_coverage_lower_bound(-0.1, 0.0) is None
    assert pde_tv_coverage_lower_bound(1.1, 0.0) is None
    assert pde_tv_coverage_lower_bound(0.5, -0.1) is None


def test_none_on_bad_type():
    assert pde_tv_coverage_lower_bound("a", 0.1) is None
    assert pde_tv_coverage_lower_bound(0.1, "b") is None


def test_clamp_negative():
    assert pde_tv_coverage_lower_bound(0.9, 0.2) == 0.0
