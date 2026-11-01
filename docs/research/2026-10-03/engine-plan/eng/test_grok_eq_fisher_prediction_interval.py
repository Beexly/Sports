"""Fail-closed tests for fisher_prediction_halfwidth from Shafer-Vovk eq (1)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grok_eq_fisher_prediction_interval import fisher_prediction_halfwidth


def test_basic_halfwidth():
    # past = [1, 2, 3], mean=2, s=1, n=3, factor=sqrt(3/2)
    # t=2.0, half = 2 * 1 * sqrt(1.5)
    hw = fisher_prediction_halfwidth([1.0, 2.0, 3.0], 2.0)
    assert hw is not None
    assert math.isclose(hw, 2.0 * math.sqrt(1.5), rel_tol=1e-6)


def test_insufficient_length_fails_closed():
    assert fisher_prediction_halfwidth([1.0], 2.0) is None


def test_zero_variance_fails_closed():
    assert fisher_prediction_halfwidth([5.0, 5.0, 5.0], 2.0) is None


def test_non_finite_fails_closed():
    assert fisher_prediction_halfwidth([1.0, float("nan")], 2.0) is None


def test_bad_t_fails_closed():
    assert fisher_prediction_halfwidth([1.0, 2.0], -1.0) is None


def test_none_input_fails_closed():
    assert fisher_prediction_halfwidth(None, 2.0) is None
