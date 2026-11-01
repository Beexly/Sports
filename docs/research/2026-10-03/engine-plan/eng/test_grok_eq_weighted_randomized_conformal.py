"""Fail-closed tests for weighted_randomized_conformal_membership.
"""

import pytest
from grok_eq_weighted_randomized_conformal import weighted_randomized_conformal_membership

def test_basic_inclusion():
    # Simple case: all scores higher, should include with high probability
    scores = [1.0, 2.0]
    weights = [1.0, 1.0]
    assert weighted_randomized_conformal_membership(scores, weights, 0.5, 1.0, 0.1, 0.5) is True

def test_exclusion():
    scores = [0.1, 0.2]
    weights = [1.0, 1.0]
    # candidate score high, A=0, may exclude depending on u
    result = weighted_randomized_conformal_membership(scores, weights, 1.0, 1.0, 0.5, 0.0)
    assert isinstance(result, bool)

def test_fail_closed_alpha():
    with pytest.raises(ValueError):
        weighted_randomized_conformal_membership([1.0], [1.0], 1.0, 1.0, 1.5, 0.5)

def test_fail_closed_u():
    with pytest.raises(ValueError):
        weighted_randomized_conformal_membership([1.0], [1.0], 1.0, 1.0, 0.1, 1.5)

def test_fail_closed_weight():
    with pytest.raises(ValueError):
        weighted_randomized_conformal_membership([1.0], [1.0], 1.0, 0.0, 0.1, 0.5)

def test_fail_closed_mismatch():
    with pytest.raises(ValueError):
        weighted_randomized_conformal_membership([1.0], [1.0, 2.0], 1.0, 1.0, 0.1, 0.5)
