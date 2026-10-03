import math
from sheet_identities import divos_next_goal, divos_odd_even

def test_home():
    v = divos_next_goal(1, 1, 1, 0, "home")
    assert abs(v - 0.5 * (1 - math.exp(-2))) < 1e-12

def test_bounds():
    assert divos_next_goal(1, 1, 1, 1, "home") == 0
    assert divos_next_goal(1, 1, 1, 1.1, "home") is None

def test_odd_even():
    odd, even = divos_odd_even(1, 1)
    assert abs(odd - math.exp(-2) * math.cosh(2)) < 1e-12
    assert abs(even - math.exp(-2) * math.sinh(2)) < 1e-12
    assert odd != even
