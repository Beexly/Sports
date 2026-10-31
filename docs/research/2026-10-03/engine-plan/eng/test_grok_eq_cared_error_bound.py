"""Fail-closed tests for cared_error_bound_indicator from arXiv:2610.40252."""
from grok_eq_cared_error_bound import cared_error_bound_indicator


def test_holds_when_error_and_notin():
    assert cared_error_bound_indicator(True, True, True) is True


def test_holds_when_no_error():
    assert cared_error_bound_indicator(False, False, True) is True
    assert cared_error_bound_indicator(False, True, True) is True


def test_fails_when_error_but_in_set():
    assert cared_error_bound_indicator(True, False, True) is False


def test_none_when_not_automated():
    assert cared_error_bound_indicator(True, True, False) is None
    assert cared_error_bound_indicator(False, False, False) is None


def test_none_on_bad_inputs():
    assert cared_error_bound_indicator(None, True, True) is None
    assert cared_error_bound_indicator(True, None, True) is None
    assert cared_error_bound_indicator(True, True, None) is None
    assert cared_error_bound_indicator("yes", True, True) is None
    assert cared_error_bound_indicator(1, 0, 1) is None
