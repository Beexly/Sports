"""Fail-closed tests for conformal_score_quantile."""
import math
from grok_eq_conformal_score_quantile import conformal_score_quantile


def test_basic_quantile():
    scores = [0.1, 0.2, 0.3, 0.4, 0.5]
    res = conformal_score_quantile(scores, 0.2)
    assert res is not None
    assert math.isfinite(res)
    assert res >= 0.1


def test_none_on_missing():
    assert conformal_score_quantile(None, 0.1) is None
    assert conformal_score_quantile([0.1], None) is None


def test_none_on_bad_alpha():
    assert conformal_score_quantile([0.1, 0.2], 0.0) is None
    assert conformal_score_quantile([0.1, 0.2], 1.0) is None
    assert conformal_score_quantile([0.1, 0.2], -0.1) is None


def test_none_on_empty_or_nonfinite():
    assert conformal_score_quantile([], 0.1) is None
    assert conformal_score_quantile([0.1, float('nan')], 0.1) is None
    assert conformal_score_quantile([0.1, float('inf')], 0.1) is None
