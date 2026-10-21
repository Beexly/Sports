"""Fail-closed tests for mv_otcp_mahalanobis_cost. Returns None on invalid input."""
import pytest
from grok_eq_mv_otcp_mahalanobis_cost import mv_otcp_mahalanobis_cost


def test_identity():
    res = mv_otcp_mahalanobis_cost([1.0, 2.0], [0.0, 0.0], [[1.0, 0.0], [0.0, 1.0]])
    assert res is not None
    assert res == pytest.approx(5.0)


def test_scaled():
    res = mv_otcp_mahalanobis_cost([1.0], [0.0], [[4.0]])
    assert res == pytest.approx(4.0)


def test_none_on_invalid():
    assert mv_otcp_mahalanobis_cost(None, [1.0], [[1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], None, [[1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], [1.0], None) is None
    assert mv_otcp_mahalanobis_cost([1.0], [1.0, 2.0], [[1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], [1.0], [[1.0, 0.5], [0.0, 1.0]]) is None  # not symmetric
    assert mv_otcp_mahalanobis_cost("bad", [1.0], [[1.0]]) is None
