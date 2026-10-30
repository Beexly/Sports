"""Fail-closed tests for structured_additive_predictor from arXiv:2610.36835 eq (2)."""
from grok_eq_structured_additive_predictor import structured_additive_predictor


def test_none_inputs():
    assert structured_additive_predictor(None, []) is None
    assert structured_additive_predictor(1.0, None) is None


def test_non_finite():
    assert structured_additive_predictor(float("nan"), [1.0]) is None
    assert structured_additive_predictor(1.0, [float("inf")]) is None
    assert structured_additive_predictor(1.0, [1.0, float("nan")]) is None


def test_valid_simple():
    # beta0=2.0, terms=[0.5, 1.5] -> 4.0
    result = structured_additive_predictor(2.0, [0.5, 1.5])
    assert result == 4.0


def test_valid_empty_terms():
    result = structured_additive_predictor(3.0, [])
    assert result == 3.0


def test_valid_negative():
    result = structured_additive_predictor(-1.0, [0.5, -0.5])
    assert abs(result - (-1.0)) < 1e-9
