"""Fail-closed tests for energy_score from arXiv:2610.24591."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_energy_score import energy_score

def test_zero_ensemble():
    # Identical members equal to obs: ES=0
    ens = [[1.0, 2.0]]
    obs = [1.0, 2.0]
    assert energy_score(ens, obs) == 0.0

def test_positive():
    ens = [[0.0], [1.0]]
    obs = [0.5]
    result = energy_score(ens, obs)
    assert result is not None and result > 0

def test_none_on_none():
    assert energy_score(None, [1.0]) is None
    assert energy_score([[1.0]], None) is None

def test_none_on_empty():
    assert energy_score([], [1.0]) is None
    assert energy_score([[]], [1.0]) is None

def test_none_on_mismatch_dim():
    assert energy_score([[1.0, 2.0]], [1.0]) is None

def test_none_on_nan():
    assert energy_score([[float("nan")]], [1.0]) is None
    assert energy_score([[1.0]], [float("nan")]) is None

def test_none_on_str():
    assert energy_score([["1.0"]], [1.0]) is None

if __name__ == "__main__":
    test_zero_ensemble()
    test_positive()
    test_none_on_none()
    test_none_on_empty()
    test_none_on_mismatch_dim()
    test_none_on_nan()
    test_none_on_str()
    print("7 tests passed")
