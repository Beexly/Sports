"""Fail-closed tests for performative_excess_miscoverage from arXiv:2611.05277 Definition 2.4."""
from grok_eq_performative_excess_miscoverage import performative_excess_miscoverage


def test_exact_zero_when_covered():
    assert performative_excess_miscoverage(0.05, 0.1) == 0.0


def test_exact_positive():
    assert performative_excess_miscoverage(0.2, 0.1) == 0.1


def test_boundary_equal():
    assert performative_excess_miscoverage(0.1, 0.1) == 0.0


def test_invalid_none():
    assert performative_excess_miscoverage(None, 0.1) is None
    assert performative_excess_miscoverage(0.1, None) is None
    assert performative_excess_miscoverage(-0.1, 0.1) is None
    assert performative_excess_miscoverage(1.1, 0.1) is None
    assert performative_excess_miscoverage(0.1, 0.0) is None
    assert performative_excess_miscoverage(0.1, 1.0) is None
    assert performative_excess_miscoverage(float("nan"), 0.1) is None


def test_upper():
    assert performative_excess_miscoverage(0.9, 0.05) == 0.85
