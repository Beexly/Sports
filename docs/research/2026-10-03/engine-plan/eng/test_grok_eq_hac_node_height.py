"""Fail-closed tests for hac_node_height."""
from grok_eq_hac_node_height import hac_node_height


def test_basic():
    assert hac_node_height(5.0, 1.5) == 3.5


def test_missing_parent():
    assert hac_node_height(None, 1.0) is None


def test_missing_eta():
    assert hac_node_height(4.0, None) is None


def test_non_numeric():
    assert hac_node_height("a", 1.0) is None
    assert hac_node_height(2.0, "b") is None
