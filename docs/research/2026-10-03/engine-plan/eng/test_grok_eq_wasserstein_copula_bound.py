from grok_eq_wasserstein_copula_bound import wasserstein_copula_bound

def test_at_bound():
    assert wasserstein_copula_bound(0.1) is True

def test_below_bound():
    assert wasserstein_copula_bound(0.05) is True

def test_above_bound():
    assert wasserstein_copula_bound(0.11) is False

def test_negative():
    assert wasserstein_copula_bound(-0.01) is None

def test_invalid_type():
    assert wasserstein_copula_bound("bad") is None

if __name__ == "__main__":
    test_at_bound()
    test_below_bound()
    test_above_bound()
    test_negative()
    test_invalid_type()
    print("5 tests passed")
