"""Fail-closed tests for cspo_sequence_score. Returns None on invalid input."""
import math
import pytest
from grok_eq_cspo_sequence_score import cspo_sequence_score


def test_geometric_mean_of_ratios():
    res = cspo_sequence_score([1.0, 4.0])
    assert res == pytest.approx(2.0)


def test_all_one():
    res = cspo_sequence_score([1.0, 1.0, 1.0])
    assert res == pytest.approx(1.0)


def test_none_on_empty():
    assert cspo_sequence_score([]) is None


def test_none_on_none():
    assert cspo_sequence_score(None) is None


def test_none_on_non_positive():
    assert cspo_sequence_score([1.0, 0.0]) is None
    assert cspo_sequence_score([1.0, -1.0]) is None


def test_none_on_non_list():
    assert cspo_sequence_score("bad") is None
