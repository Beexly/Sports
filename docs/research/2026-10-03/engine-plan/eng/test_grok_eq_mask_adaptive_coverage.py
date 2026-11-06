"""Fail-closed tests for mask_adaptive_coverage."""
from grok_eq_mask_adaptive_coverage import mask_adaptive_coverage


def test_valid():
    assert mask_adaptive_coverage(0.90, 0.05, 0.05) is True
    assert mask_adaptive_coverage(0.89, 0.05, 0.05) is False


def test_none_missing():
    assert mask_adaptive_coverage(None, 0.05, 0.01) is None
    assert mask_adaptive_coverage(0.9, None, 0.01) is None
    assert mask_adaptive_coverage(0.9, 0.05, None) is None


def test_none_range():
    assert mask_adaptive_coverage(1.1, 0.05, 0.01) is None
    assert mask_adaptive_coverage(0.9, 0.0, 0.01) is None
    assert mask_adaptive_coverage(0.9, 0.05, -0.01) is None


def test_none_nonfinite():
    assert mask_adaptive_coverage(float('nan'), 0.05, 0.01) is None
