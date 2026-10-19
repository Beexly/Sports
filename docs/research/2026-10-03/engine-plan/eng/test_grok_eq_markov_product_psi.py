from grok_eq_markov_product_psi import markov_product_psi

def test_product():
    assert markov_product_psi(0.3, 0.4) == 0.12

def test_bounds():
    assert markov_product_psi(0.0, 1.0) == 0.0
    assert markov_product_psi(1.0, 1.0) == 1.0

def test_bad_u():
    assert markov_product_psi(-0.1, 0.5) is None

def test_bad_v():
    assert markov_product_psi(0.5, 1.1) is None

def test_non_numeric():
    assert markov_product_psi("a", 0.5) is None

if __name__ == "__main__":
    test_product()
    test_bounds()
    test_bad_u()
    test_bad_v()
    test_non_numeric()
    print("5 tests passed")
