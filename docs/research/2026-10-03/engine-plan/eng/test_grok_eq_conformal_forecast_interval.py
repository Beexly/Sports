"""Fail-closed tests for conformal_forecast_interval. Returns None on invalid input."""
import pytest
from grok_eq_conformal_forecast_interval import conformal_forecast_interval


def test_valid_interval():
    assert conformal_forecast_interval(10.0, 1.5, 2.0) == (8.5, 12.0)


def test_zero_width():
    assert conformal_forecast_interval(5.0, 0.0, 0.0) == (5.0, 5.0)


def test_none_on_none():
    assert conformal_forecast_interval(None, 1.0, 1.0) is None
    assert conformal_forecast_interval(5.0, None, 1.0) is None
    assert conformal_forecast_interval(5.0, 1.0, None) is None


def test_none_on_bad():
    assert conformal_forecast_interval(5.0, -1.0, 1.0) is None
    assert conformal_forecast_interval(5.0, 1.0, float("nan")) is None
    assert conformal_forecast_interval("bad", 1.0, 1.0) is None
