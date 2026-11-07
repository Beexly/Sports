"""Fail-closed tests for equilibrium_valid_coverage. Returns None on invalid input."""
import pytest
from grok_eq_equilibrium_valid_coverage import equilibrium_valid_coverage


def test_holds_exactly():
    assert equilibrium_valid_coverage(0.9, 0.1) is True
    assert equilibrium_valid_coverage(0.95, 0.05) is True


def test_holds_strictly():
    assert equilibrium_valid_coverage(0.91, 0.1) is True


def test_fails_below():
    assert equilibrium_valid_coverage(0.89, 0.1) is False


def test_none_on_bad_input():
    assert equilibrium_valid_coverage(None, 0.1) is None
    assert equilibrium_valid_coverage(0.9, None) is None
    assert equilibrium_valid_coverage(1.1, 0.1) is None
    assert equilibrium_valid_coverage(0.9, 0.0) is None
    assert equilibrium_valid_coverage(0.9, 1.0) is None
    assert equilibrium_valid_coverage(float("nan"), 0.1) is None
    assert equilibrium_valid_coverage("0.9", 0.1) is None
