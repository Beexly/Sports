"""Fail-closed tests for functional_rating_difference."""

import pytest
from grok_eq_functional_rating import functional_rating_difference

def test_positive_diff():
    assert functional_rating_difference(5.0, 2.0) == 3.0

def test_negative_diff():
    assert functional_rating_difference(1.5, 4.0) == -2.5

def test_equal():
    assert functional_rating_difference(10.0, 10.0) == 0.0

def test_fail_closed_non_numeric():
    with pytest.raises(ValueError):
        functional_rating_difference("5", 2.0)

def test_fail_closed_none():
    with pytest.raises(ValueError):
        functional_rating_difference(5.0, None)
