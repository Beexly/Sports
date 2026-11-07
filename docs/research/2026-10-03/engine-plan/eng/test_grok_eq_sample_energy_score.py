"""Fail-closed tests for sample_energy_score. Returns None on invalid input."""
import math
from grok_eq_sample_energy_score import sample_energy_score


def test_basic_valid():
    ens = [[0.0, 0.0], [1.0, 1.0]]
    y = [0.5, 0.5]
    res = sample_energy_score(ens, y)
    assert res is not None
    assert math.isfinite(res)
    assert res >= 0.0


def test_none_on_missing():
    assert sample_energy_score(None, [0.0]) is None
    assert sample_energy_score([[0.0]], None) is None


def test_none_on_empty_or_mismatch():
    assert sample_energy_score([], [0.0]) is None
    assert sample_energy_score([[0.0]], []) is None
    assert sample_energy_score([[0.0, 1.0]], [0.0]) is None


def test_none_on_nonfinite():
    assert sample_energy_score([[float("nan")]], [0.0]) is None
    assert sample_energy_score([[0.0]], [float("inf")]) is None


def test_independence_like_zero_spread():
    ens = [[1.0], [1.0]]
    y = [1.0]
    res = sample_energy_score(ens, y)
    assert res is not None
    assert abs(res) < 1e-9
