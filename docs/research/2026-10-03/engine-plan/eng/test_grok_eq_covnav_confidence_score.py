"""Fail-closed tests for covnav_confidence_score. Returns None on invalid input."""
from grok_eq_covnav_confidence_score import covnav_confidence_score


def test_typical_score():
    # equal logits, T=1 -> 0.5
    res = covnav_confidence_score(0.0, 0.0, 1.0)
    assert res is not None
    assert abs(res - 0.5) < 1e-9


def test_confident_yes():
    # high Yes logit
    res = covnav_confidence_score(2.0, 0.0, 1.0)
    assert res is not None
    assert res > 0.8


def test_none_on_missing():
    assert covnav_confidence_score(None, 0.0, 1.0) is None
    assert covnav_confidence_score(0.0, None, 1.0) is None
    assert covnav_confidence_score(0.0, 0.0, None) is None


def test_none_on_bad_values():
    assert covnav_confidence_score(0.0, 0.0, 0.0) is None
    assert covnav_confidence_score(0.0, 0.0, -1.0) is None
    assert covnav_confidence_score(float("nan"), 0.0, 1.0) is None
    assert covnav_confidence_score(0.0, float("inf"), 1.0) is None
    assert covnav_confidence_score(0.0, 0.0, float("nan")) is None
