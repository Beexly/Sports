from grok_eq_score_driven_rating_update import score_driven_rating_update

def test_positive_score():
    assert abs(score_driven_rating_update(1500, 0.5, 16) - 1508) < 1e-9

def test_negative_score():
    assert abs(score_driven_rating_update(1500, -0.25, 32) - 1492) < 1e-9

def test_zero_score():
    assert abs(score_driven_rating_update(1200, 0.0) - 1200) < 1e-9

def test_invalid_K():
    assert score_driven_rating_update(1500, 0.1, -1) is None

def test_invalid_type():
    assert score_driven_rating_update("bad", 0.1) is None

if __name__ == "__main__":
    test_positive_score()
    test_negative_score()
    test_zero_score()
    test_invalid_K()
    test_invalid_type()
    print("5 tests passed")
