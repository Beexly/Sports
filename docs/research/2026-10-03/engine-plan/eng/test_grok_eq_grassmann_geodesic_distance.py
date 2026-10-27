"""Fail-closed tests for grassmann_geodesic_distance. Returns None on invalid input."""
import math
from grok_eq_grassmann_geodesic_distance import grassmann_geodesic_distance


def test_basic_identity():
    # identical subspaces: sigma = [1,1,...] -> theta=0 -> d=0
    res = grassmann_geodesic_distance([1.0, 1.0])
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-9)


def test_orthogonal():
    # sigma=0 -> theta=pi/2
    res = grassmann_geodesic_distance([0.0])
    assert res is not None
    assert math.isclose(res, math.pi / 2, abs_tol=1e-6)


def test_none_on_missing():
    assert grassmann_geodesic_distance(None) is None
    assert grassmann_geodesic_distance([]) is None


def test_none_on_out_of_range():
    assert grassmann_geodesic_distance([1.1]) is None
    assert grassmann_geodesic_distance([-0.1]) is None
    assert grassmann_geodesic_distance([float("nan")]) is None
    assert grassmann_geodesic_distance([float("inf")]) is None


def test_partial():
    res = grassmann_geodesic_distance([0.0, 1.0])
    assert res is not None
    assert math.isclose(res, math.pi / 2, abs_tol=1e-6)
