from grok_eq_sequential_fold_rank import sequential_fold_rank

def test_basic():
    assert sequential_fold_rank(9, 0.9) == 9

def test_ceil():
    assert sequential_fold_rank(9, 0.85) == 9

def test_full():
    assert sequential_fold_rank(5, 1.0) == 6

def test_bad_m():
    assert sequential_fold_rank(-1, 0.9) is None

def test_bad_beta():
    assert sequential_fold_rank(10, 1.1) is None

if __name__ == "__main__":
    test_basic()
    test_ceil()
    test_full()
    test_bad_m()
    test_bad_beta()
    print("5 tests passed")
