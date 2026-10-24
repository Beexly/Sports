"""Fail-closed tests for inference_config_score. Returns None on invalid input."""
import pytest
from grok_eq_inference_config_score import inference_config_score


def _simple_A(pi, y):
    return float(pi) - float(y)


def test_valid_returns_float():
    res = inference_config_score(0.8, 1, _simple_A)
    assert res is not None
    assert res == pytest.approx(-0.2)


def test_none_on_missing_pi():
    assert inference_config_score(None, 1, _simple_A) is None


def test_none_on_missing_y():
    assert inference_config_score(0.5, None, _simple_A) is None


def test_none_on_missing_A():
    assert inference_config_score(0.5, 1, None) is None


def test_none_on_non_callable():
    assert inference_config_score(0.5, 1, 42) is None


def test_none_on_exception():
    def bad(pi, y):
        raise ValueError("boom")
    assert inference_config_score(0.5, 1, bad) is None
