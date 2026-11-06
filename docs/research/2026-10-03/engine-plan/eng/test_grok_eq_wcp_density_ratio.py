"""Fail-closed tests for wcp_density_ratio. Returns None on invalid input."""
import pytest
from grok_eq_wcp_density_ratio import wcp_density_ratio


def test_basic_ratio():
    assert wcp_density_ratio(0.4, 0.2) == pytest.approx(2.0)


def test_unit_ratio():
    assert wcp_density_ratio(0.5, 0.5) == pytest.approx(1.0)


def test_none_on_missing():
    assert wcp_density_ratio(None, 0.5) is None
    assert wcp_density_ratio(0.5, None) is None


def test_none_on_nonpositive():
    assert wcp_density_ratio(0.0, 0.5) is None
    assert wcp_density_ratio(-0.1, 0.5) is None
    assert wcp_density_ratio(0.5, 0.0) is None
    assert wcp_density_ratio(0.5, -1.0) is None


def test_none_on_bad_type():
    assert wcp_density_ratio("a", 0.5) is None
    assert wcp_density_ratio(0.5, "b") is None
