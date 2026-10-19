import pytest
from grok_eq_score_driven_rating_update import score_driven_rating_update

def test_basic():
    assert score_driven_rating_update(1500.0, 0.5, 16.0) == 1508.0

def test_zero_score():
    assert score_driven_rating_update(1200, 0, 32) == 1200.0

def test_negative_score():
    assert score_driven_rating_update(1000, -1.0, 10) == 990.0

def test_fail_none():
    assert score_driven_rating_update(None, 0.5, 16) is None

def test_fail_str():
    assert score_driven_rating_update("a", 0.5, 16) is None
