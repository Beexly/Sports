"""Fail-closed tests for max_threshold_set_membership."""
import math
from grok_eq_max_threshold_set_membership import max_threshold_set_membership


def test_basic_membership():
    assert max_threshold_set_membership(0.3, 0.5) is True
    assert max_threshold_set_membership(0.5, 0.5) is True
    assert max_threshold_set_membership(0.7, 0.5) is False


def test_none_on_missing():
    assert max_threshold_set_membership(None, 0.5) is None
    assert max_threshold_set_membership(0.3, None) is None


def test_none_on_nonfinite():
    assert max_threshold_set_membership(float("nan"), 0.5) is None
    assert max_threshold_set_membership(0.3, float("inf")) is None
    assert max_threshold_set_membership(float("-inf"), 0.5) is None


def test_none_on_bad_type():
    assert max_threshold_set_membership("bad", 0.5) is None
    assert max_threshold_set_membership(0.3, "bad") is None


def test_edge_equality():
    assert max_threshold_set_membership(0.0, 0.0) is True
    assert max_threshold_set_membership(-1.0, 0.0) is True
