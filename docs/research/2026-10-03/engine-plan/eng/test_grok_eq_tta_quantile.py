"""Fail-closed tests for tta_conditional_lower_quantile from arXiv:2610.36183."""
from grok_eq_tta_quantile import tta_conditional_lower_quantile


def test_default_is_001():
    assert tta_conditional_lower_quantile() == 0.01


def test_accepts_valid_tau():
    assert tta_conditional_lower_quantile(0.05) == 0.05
    assert tta_conditional_lower_quantile(0.01) == 0.01


def test_rejects_out_of_range():
    assert tta_conditional_lower_quantile(0.0) is None
    assert tta_conditional_lower_quantile(1.0) is None
    assert tta_conditional_lower_quantile(-0.1) is None
    assert tta_conditional_lower_quantile(1.5) is None


def test_rejects_none_and_bad_types():
    assert tta_conditional_lower_quantile(None) is None
    assert tta_conditional_lower_quantile("0.01") is None
    assert tta_conditional_lower_quantile([]) is None
    assert tta_conditional_lower_quantile({}) is None
