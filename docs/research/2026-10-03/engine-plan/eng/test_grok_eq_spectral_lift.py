from grok_eq_spectral_lift import spectral_lift

def test_valid_case():
    res = spectral_lift([1.0, 2.0], [0.5, 0.3])
    assert res is not None
    assert res == [1.0, 2.0, 0.5, 0.3]

def test_fail_closed_empty():
    assert spectral_lift([], [1.0]) is None
    assert spectral_lift([1.0], []) is None

def test_fail_closed_non_finite():
    assert spectral_lift([float('nan')], [1.0]) is None
    assert spectral_lift([1.0], [float('inf')]) is None

def test_fail_closed_non_numeric():
    assert spectral_lift(["a"], [1.0]) is None
    assert spectral_lift([1.0], [None]) is None

def test_fail_closed_none():
    assert spectral_lift(None, [1.0]) is None

if __name__ == "__main__":
    test_valid_case()
    test_fail_closed_empty()
    test_fail_closed_non_finite()
    test_fail_closed_non_numeric()
    test_fail_closed_none()
    print("all 5 tests passed")
