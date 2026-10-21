"""Fail-closed tests for mv_otcp_mahalanobis_cost. Returns None on invalid input."""
import math
from grok_eq_mv_otcp_mahalanobis_cost import mv_otcp_mahalanobis_cost


def test_basic_identity():
    s = [1.0, 2.0]
    u = [0.0, 0.0]
    M = [[1.0, 0.0], [0.0, 1.0]]
    res = mv_otcp_mahalanobis_cost(s, u, M)
    assert res is not None
    assert math.isclose(res, 5.0)


def test_none_on_missing():
    assert mv_otcp_mahalanobis_cost(None, [1.0], [[1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], None, [[1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], [1.0], None) is None


def test_none_on_dim_mismatch():
    assert mv_otcp_mahalanobis_cost([1.0, 2.0], [1.0], [[1.0, 0.0], [0.0, 1.0]]) is None
    assert mv_otcp_mahalanobis_cost([1.0], [1.0], [[1.0, 0.0]]) is None


def test_none_on_not_symmetric_or_pd():
    assert mv_otcp_mahalanobis_cost([1.0, 1.0], [0.0, 0.0], [[1.0, 1.0], [0.0, 1.0]]) is None  # not sym
    assert mv_otcp_mahalanobis_cost([1.0], [0.0], [[-1.0]]) is None  # not PD
    assert mv_otcp_mahalanobis_cost([1.0], [0.0], [[0.0]]) is None


def test_scaled():
    s = [1.0, 0.0]
    u = [0.0, 0.0]
    M = [[4.0, 0.0], [0.0, 1.0]]
    res = mv_otcp_mahalanobis_cost(s, u, M)
    assert res is not None
    assert math.isclose(res, 4.0)


if __name__ == "__main__":
    test_basic_identity()
    test_none_on_missing()
    test_none_on_dim_mismatch()
    test_none_on_not_symmetric_or_pd()
    test_scaled()
    print("all 5 tests passed")
