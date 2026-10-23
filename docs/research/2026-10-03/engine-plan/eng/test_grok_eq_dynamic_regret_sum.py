"""Fail-closed tests for dynamic_regret_sum. Returns None on invalid input."""
import pytest
from grok_eq_dynamic_regret_sum import dynamic_regret_sum


def test_valid_sum():
    assert dynamic_regret_sum([1.0, 0.8, 0.9], [0.7, 0.8, 0.6]) == pytest.approx(0.6)


def test_zero_regret():
    assert dynamic_regret_sum([0.5, 0.5], [0.5, 0.5]) == 0.0


def test_none_on_none():
    assert dynamic_regret_sum(None, [0.5]) is None
    assert dynamic_regret_sum([0.5], None) is None


def test_none_on_mismatch_or_bad():
    assert dynamic_regret_sum([1.0, 0.5], [0.4]) is None
    assert dynamic_regret_sum([1.0], [1.1]) is None
    assert dynamic_regret_sum([float("nan")], [0.5]) is None
    assert dynamic_regret_sum([1.0], ["bad"]) is None
    assert dynamic_regret_sum([], []) is None
