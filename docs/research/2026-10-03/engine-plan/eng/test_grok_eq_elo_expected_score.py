from grok_eq_elo_expected_score import elo_expected_score

def test_equal():
    assert abs(elo_expected_score(1500, 1500) - 0.5) < 1e-9

def test_stronger():
    e = elo_expected_score(1900, 1500)
    assert e is not None and e > 0.9

def test_weaker():
    e = elo_expected_score(1500, 1900)
    assert e is not None and e < 0.1

def test_invalid_D():
    assert elo_expected_score(1500, 1500, -1) is None

def test_invalid_type():
    assert elo_expected_score("bad", 1500) is None

if __name__ == "__main__":
    test_equal()
    test_stronger()
    test_weaker()
    test_invalid_D()
    test_invalid_type()
    print("5 tests passed")
