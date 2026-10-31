"""Fail-closed tests for stable_measurement_score from arXiv:2610.34204 eq (12)."""
from grok_eq_stable_measurement_score import stable_measurement_score
import math


def test_exact_zero_residual():
    assert stable_measurement_score(1.0, 1.0, 1.0) == 0.0


def test_positive_residual():
    assert stable_measurement_score(3.0, 1.0, 4.0) == 1.0


def test_negative_residual():
    assert stable_measurement_score(0.0, 2.0, 1.0) == 2.0


def test_none_on_bad_variance():
    assert stable_measurement_score(1.0, 1.0, 0.0) is None
    assert stable_measurement_score(1.0, 1.0, -1.0) is None


def test_none_on_missing():
    assert stable_measurement_score(None, 1.0, 1.0) is None
    assert stable_measurement_score(1.0, None, 1.0) is None
    assert stable_measurement_score(1.0, 1.0, None) is None


def test_none_on_non_finite():
    assert stable_measurement_score(float("inf"), 1.0, 1.0) is None
    assert stable_measurement_score(1.0, float("nan"), 1.0) is None
