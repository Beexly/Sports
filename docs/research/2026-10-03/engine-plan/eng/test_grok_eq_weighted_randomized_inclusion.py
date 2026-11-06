"""Fail-closed tests for weighted_randomized_inclusion from arXiv:2610.37866 eq (6)."""
import math
from grok_eq_weighted_randomized_inclusion import weighted_randomized_inclusion


def test_exact_clip_lower():
    # raw negative -> 0
    assert weighted_randomized_inclusion(0.9, 10.0, 12.0, 1.0, 0.0) == 0.0


def test_exact_clip_upper():
    # raw >1 -> 1
    assert weighted_randomized_inclusion(0.9, 10.0, 0.0, 1.0, 0.0) == 1.0


def test_interior():
    assert weighted_randomized_inclusion(0.5, 4.0, 1.0, 2.0, 0.0) == 0.5  # (2-1)/2 = 0.5


def test_invalid_none():
    assert weighted_randomized_inclusion(None, 1.0, 0.0, 1.0, 0.0) is None
    assert weighted_randomized_inclusion(0.9, -1.0, 0.0, 1.0, 0.0) is None
    assert weighted_randomized_inclusion(0.9, 1.0, 0.0, 0.0, 0.0) is None
    assert weighted_randomized_inclusion(1.1, 1.0, 0.0, 1.0, 0.0) is None
    assert weighted_randomized_inclusion(float("nan"), 1.0, 0.0, 1.0, 0.0) is None


def test_boundary_zero_weight_eq():
    assert weighted_randomized_inclusion(0.95, 2.0, 0.0, 1.0, 1.0) == 0.95  # (1.9 - 0)/2 = 0.95
