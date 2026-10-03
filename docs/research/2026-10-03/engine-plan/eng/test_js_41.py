import math
from sheet_identities import js_41, js_41_ln, js_equal

def test_equal_zero():
    assert js_41([0.5, 0.5], [0.5, 0.5], [0.5, 0.5]) == 0

def test_extreme_base2():
    assert abs(js_41([1, 0], [0, 1], [0.5, 0.5], base=2) - 1) < 1e-9

def test_weights_differ():
    a = js_41([0.9, 0.1], [0.1, 0.9], [0.2, 0.8])
    b = js_41([0.9, 0.1], [0.1, 0.9], [0.5, 0.5])
    assert abs(a - b) > 1e-6

def test_bad_weights():
    assert js_41([1, 0], [0, 1], [0.7, 0.5]) is None
    assert js_41([1, 0], [0, 1], [-0.1, 1.1]) is None

def test_ln_path():
    assert abs(js_41_ln([1, 0], [0, 1], [0.5, 0.5]) - math.log(2)) < 1e-9

def test_equal_calls_41():
    assert abs(js_equal([1, 0], [0, 1]) - 1) < 1e-9
