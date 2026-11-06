"""Fail-closed tests for socc_energy_score. Returns None on invalid input."""
import math
import pytest
from grok_eq_socc_energy_score import socc_energy_score


def test_identical_members_zero_or_positive():
    # all members equal to observation -> ES = 0
    ens = [[1.0, 2.0], [1.0, 2.0]]
    res = socc_energy_score(ens, [1.0, 2.0])
    assert res is not None
    assert res == pytest.approx(0.0)


def test_simple_1d():
    # ensemble [0], [2], obs 1 -> distances 1,1; pairwise 0,2,2,0 -> ES = (1+1)/2 - (0+2+2+0)/(2*4) = 1 - 4/8 = 0.5
    ens = [[0.0], [2.0]]
    res = socc_energy_score(ens, [1.0])
    assert res is not None
    assert res == pytest.approx(0.5)


def test_none_on_bad_input():
    assert socc_energy_score(None, [1.0]) is None
    assert socc_energy_score([[1.0]], None) is None
    assert socc_energy_score([], [1.0]) is None
    assert socc_energy_score([[1.0]], []) is None
    assert socc_energy_score([[float("nan")]], [0.0]) is None
    assert socc_energy_score([[1.0, 2.0]], [1.0]) is None  # dim mismatch
    assert socc_energy_score([[1.0]], [1.0, 2.0]) is None


def test_none_on_non_numeric():
    assert socc_energy_score([["a"]], [1.0]) is None
    assert socc_energy_score([[1.0]], ["b"]) is None


def test_positive_on_spread():
    ens = [[0.0, 0.0], [1.0, 1.0]]
    res = socc_energy_score(ens, [0.5, 0.5])
    assert res is not None
    assert res > 0.0
