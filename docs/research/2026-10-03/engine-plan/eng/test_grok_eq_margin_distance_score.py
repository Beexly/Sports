"""Fail-closed tests for margin_distance_score from arXiv:2605.24983 eq (14)."""
from grok_eq_margin_distance_score import margin_distance_score

def test_zero_margin():
    assert margin_distance_score(0.5, 0.5) == 0.0

def test_positive_margin():
    assert margin_distance_score(0.3, 0.7) == 0.4

def test_negative_margin():
    assert margin_distance_score(0.8, 0.2) == -0.6

def test_none_on_bad_prob():
    assert margin_distance_score(-0.1, 0.5) is None
    assert margin_distance_score(0.5, 1.1) is None

def test_none_on_missing():
    assert margin_distance_score(None, 0.5) is None
    assert margin_distance_score(0.5, None) is None

def test_none_on_non_finite():
    assert margin_distance_score(float("inf"), 0.5) is None
    assert margin_distance_score(0.5, float("nan")) is None
