"""Fail-closed tests for input_transform_ease from arXiv:2511.11472.
"""

import pytest
from grok_eq_input_transform_ease import input_transform_ease

def test_ease_zero_difficulty():
    assert input_transform_ease(0.0) == 1.0

def test_ease_unit_difficulty():
    assert input_transform_ease(1.0) == 0.0

def test_ease_mid():
    assert input_transform_ease(0.3) == pytest.approx(0.7)

def test_fail_closed_negative():
    with pytest.raises(ValueError):
        input_transform_ease(-0.1)

def test_fail_closed_over():
    with pytest.raises(ValueError):
        input_transform_ease(1.1)

def test_fail_closed_nan():
    with pytest.raises(ValueError):
        input_transform_ease(float("nan"))
