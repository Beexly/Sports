"""Fail-closed tests for stable_measurement_density_ratio from arXiv:2610.34204 eq (3)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_stable_measurement_density_ratio import stable_measurement_density_ratio


def test_none_inputs():
    assert stable_measurement_density_ratio(None, 1.0, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, None, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, None, 1.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, 1.0, None) is None


def test_non_positive_denominators():
    assert stable_measurement_density_ratio(1.0, 0.0, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, -1.0, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, 1.0, 0.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, 1.0, -0.5) is None


def test_negative_numerators():
    assert stable_measurement_density_ratio(-1.0, 1.0, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, -0.1, 1.0) is None


def test_non_finite():
    assert stable_measurement_density_ratio(float("nan"), 1.0, 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, float("inf"), 1.0, 1.0) is None
    assert stable_measurement_density_ratio(1.0, 1.0, float("-inf"), 1.0) is None


def test_valid_ratio():
    assert stable_measurement_density_ratio(2.0, 1.0, 0.5, 0.25) == 4.0
    assert math.isclose(stable_measurement_density_ratio(1.5, 0.5, 0.8, 0.4), 6.0)


def test_zero_numerator_ok():
    assert stable_measurement_density_ratio(0.0, 1.0, 1.0, 1.0) == 0.0
    assert stable_measurement_density_ratio(1.0, 1.0, 0.0, 1.0) == 0.0


if __name__ == "__main__":
    test_none_inputs()
    test_non_positive_denominators()
    test_negative_numerators()
    test_non_finite()
    test_valid_ratio()
    test_zero_numerator_ok()
    print("6 fail-closed tests passed")
