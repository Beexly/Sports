from sheet_identities import js_41, js_51

def test_n2_matches():
    a = js_51([[1, 0], [0, 1]], [0.5, 0.5])
    b = js_41([1, 0], [0, 1], [0.5, 0.5])
    assert abs(a - b) < 1e-9

def test_three_equal():
    assert js_51([[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]], [1/3, 1/3, 1/3]) == 0

def test_bad_pi():
    assert js_51([[0.5, 0.5], [0.5, 0.5]], [0.6, 0.5]) is None
