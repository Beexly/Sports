"""Fail-closed tests for conformal_tournament_prob_step. Returns None on invalid input."""
import math
from grok_eq_conformal_tournament_prob import conformal_tournament_prob_step


def test_simple_step():
    # q_prev_u=0.8, two opponents with p=0.6,q=0.5 and p=0.4,q=0.3 -> sum=0.6*0.5 + 0.4*0.3 = 0.3+0.12=0.42; result=0.8*0.42=0.336
    res = conformal_tournament_prob_step(0.8, [0.6, 0.4], [0.5, 0.3])
    assert res == 0.336


def test_none_on_missing():
    assert conformal_tournament_prob_step(None, [0.5], [0.5]) is None
    assert conformal_tournament_prob_step(0.5, None, [0.5]) is None
    assert conformal_tournament_prob_step(0.5, [0.5], None) is None


def test_none_on_empty_or_mismatch():
    assert conformal_tournament_prob_step(0.5, [], []) is None
    assert conformal_tournament_prob_step(0.5, [0.5], [0.5, 0.4]) is None


def test_none_on_out_of_range():
    assert conformal_tournament_prob_step(1.1, [0.5], [0.5]) is None
    assert conformal_tournament_prob_step(0.5, [1.1], [0.5]) is None
    assert conformal_tournament_prob_step(0.5, [0.5], [-0.1]) is None


def test_none_on_none_in_lists():
    assert conformal_tournament_prob_step(0.5, [None], [0.5]) is None
    assert conformal_tournament_prob_step(0.5, [0.5], [None]) is None
