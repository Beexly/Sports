from grok_eq_conformal_unified_set import conformal_unified_set_membership

def test_in_set():
    scores = [1.0, 2.0, 3.0, 4.0]
    assert conformal_unified_set_membership(2.0, scores, 0.25) is True

def test_out_set():
    scores = [1.0, 2.0, 3.0, 4.0]
    assert conformal_unified_set_membership(5.0, scores, 0.25) is False

def test_bad_alpha():
    assert conformal_unified_set_membership(1.0, [1.0, 2.0], 0.0) is None

def test_empty_scores():
    assert conformal_unified_set_membership(1.0, [], 0.1) is None

if __name__ == "__main__":
    test_in_set()
    test_out_set()
    test_bad_alpha()
    test_empty_scores()
    print("4 tests passed")
