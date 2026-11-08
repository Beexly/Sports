import math
import pytest
from grok_eq_elo_expected_score import elo_expected_score

def test_equal_ratings():
    assert math.isclose(elo_expected_score(1500, 1500), 0.5)

def test_higher_rating():
    assert elo_expected_score(1600, 1400) > 0.5

def test_lower_rating():
    assert elo_expected_score(1400, 1600) < 0.5

def test_fail_closed_negative():
    with pytest.raises(ValueError):
        elo_expected_score(-1, 1500)

def test_fail_closed_scale():
    with pytest.raises(ValueError):
        elo_expected_score(1500, 1500, scale=0)
