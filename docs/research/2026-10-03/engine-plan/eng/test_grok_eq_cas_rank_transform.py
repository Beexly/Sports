"""Fail-closed tests for cas_rank_transform. Returns None on invalid input."""
import math
import pytest
from grok_eq_cas_rank_transform import cas_rank_transform


def test_median_maps_to_zero():
    res = cas_rank_transform(0.0, 0.5)
    assert res is not None
    assert res == pytest.approx(0.0)


def test_high_prob_positive():
    res = cas_rank_transform(1.0, 0.975)
    assert res is not None
    assert res > 1.5


def test_none_on_missing():
    assert cas_rank_transform(None, 0.5) is None
    assert cas_rank_transform(1.0, None) is None


def test_none_on_boundary_or_out():
    assert cas_rank_transform(0.0, 0.0) is None
    assert cas_rank_transform(0.0, 1.0) is None
    assert cas_rank_transform(0.0, 1.5) is None
    assert cas_rank_transform(0.0, -0.1) is None


def test_finite_on_valid():
    res = cas_rank_transform(3.14, 0.3)
    assert res is not None
    assert math.isfinite(res)
