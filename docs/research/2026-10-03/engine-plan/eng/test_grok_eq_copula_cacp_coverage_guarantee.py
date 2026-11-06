"""Fail-closed tests for copula_cacp_coverage_guarantee. Returns None on invalid input."""
from grok_eq_copula_cacp_coverage_guarantee import copula_cacp_coverage_guarantee


def test_holds_when_above():
    assert copula_cacp_coverage_guarantee(0.95, 0.05) is True
    assert copula_cacp_coverage_guarantee(0.90, 0.10) is True


def test_fails_when_below():
    assert copula_cacp_coverage_guarantee(0.80, 0.05) is False


def test_none_on_missing():
    assert copula_cacp_coverage_guarantee(None, 0.05) is None
    assert copula_cacp_coverage_guarantee(0.9, None) is None


def test_none_on_bad_range():
    assert copula_cacp_coverage_guarantee(1.1, 0.05) is None
    assert copula_cacp_coverage_guarantee(0.9, 0.0) is None
    assert copula_cacp_coverage_guarantee(0.9, 1.0) is None
    assert copula_cacp_coverage_guarantee(-0.1, 0.05) is None


def test_boundary():
    assert copula_cacp_coverage_guarantee(0.95, 0.05) is True
    assert copula_cacp_coverage_guarantee(0.949, 0.05) is False
