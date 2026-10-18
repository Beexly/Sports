from grok_eq_conformal_softmax_nonconformity import conformal_softmax_nonconformity

def test_valid():
    assert conformal_softmax_nonconformity(0.8) == 0.2

def test_zero():
    assert conformal_softmax_nonconformity(0.0) == 1.0

def test_one():
    assert conformal_softmax_nonconformity(1.0) == 0.0

def test_out_of_range():
    assert conformal_softmax_nonconformity(1.1) is None

def test_invalid():
    assert conformal_softmax_nonconformity("bad") is None

if __name__ == "__main__":
    test_valid()
    test_zero()
    test_one()
    test_out_of_range()
    test_invalid()
    print("5 tests passed")
