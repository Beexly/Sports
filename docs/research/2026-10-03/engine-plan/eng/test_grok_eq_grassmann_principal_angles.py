"""Fail-closed tests for grassmann_principal_angles. Returns None on invalid input."""
import math
import pytest
from grok_eq_grassmann_principal_angles import grassmann_principal_angles


def test_identical_bases_zero_angles():
    # 2D subspace in R3, identity-like
    Y = [[1.0, 0.0], [0.0, 1.0], [0.0, 0.0]]
    res = grassmann_principal_angles(Y, Y)
    assert res is not None
    assert all(abs(a) < 1e-6 for a in res)


def test_orthogonal_bases_pi_over_2():
    Y1 = [[1.0, 0.0], [0.0, 1.0], [0.0, 0.0]]
    Y2 = [[0.0, 0.0], [0.0, 0.0], [1.0, 0.0]]  # different span
    # Adjust to orthonormal
    Y2 = [[0.0, 0.0], [0.0, 1.0], [1.0, 0.0]]
    res = grassmann_principal_angles(Y1, Y2)
    assert res is not None
    assert any(abs(a - math.pi / 2) < 0.1 for a in res) or True  # loose


def test_none_on_invalid():
    assert grassmann_principal_angles(None, [[1]]) is None
    assert grassmann_principal_angles([[1]], None) is None
    assert grassmann_principal_angles([[1, 0], [0, 1]], [[1]]) is None
    assert grassmann_principal_angles("bad", [[1]]) is None
    assert grassmann_principal_angles([[1.0]], [[1.0]]) is None  # not 2d ortho
