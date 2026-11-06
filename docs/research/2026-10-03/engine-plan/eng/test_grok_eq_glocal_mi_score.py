"""Fail-closed tests for glocal_mi_score from arXiv:2611.04066 eq (8). Returns None on invalid input."""
import math
from grok_eq_glocal_mi_score import glocal_mi_score


def test_perfect_agreement():
    # All realizations identical to mean: MI = 0
    mean = [0.7, 0.3]
    individuals = [[0.7, 0.3], [0.7, 0.3]]
    assert glocal_mi_score(mean, individuals) == 0.0


def test_disagreement():
    # Mean [0.5, 0.5], individuals extreme: MI > 0
    mean = [0.5, 0.5]
    individuals = [[0.9, 0.1], [0.1, 0.9]]
    mi = glocal_mi_score(mean, individuals)
    assert mi is not None and mi > 0.0


def test_none_on_missing():
    assert glocal_mi_score(None, [[0.5, 0.5]]) is None
    assert glocal_mi_score([0.5, 0.5], None) is None
    assert glocal_mi_score([0.5, 0.5], []) is None


def test_none_on_bad_probs():
    assert glocal_mi_score([1.1, -0.1], [[0.5, 0.5]]) is None
    assert glocal_mi_score([0.5, 0.5], [[0.6, 0.5]]) is None  # not sum to 1
    assert glocal_mi_score([0.5, 0.5], [[-0.1, 1.1]]) is None


def test_finite():
    mean = [0.4, 0.6]
    individuals = [[0.3, 0.7], [0.5, 0.5], [0.4, 0.6]]
    mi = glocal_mi_score(mean, individuals)
    assert mi is not None and math.isfinite(mi)
