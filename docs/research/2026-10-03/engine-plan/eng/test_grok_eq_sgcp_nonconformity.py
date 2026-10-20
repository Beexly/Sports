from grok_eq_sgcp_nonconformity import sgcp_nonconformity

def test_zero_prob():
    assert sgcp_nonconformity(0.0) == 1.0

def test_one_prob():
    assert sgcp_nonconformity(1.0) == 0.0

def test_mid():
    assert abs(sgcp_nonconformity(0.3) - 0.7) < 1e-9

def test_negative():
    assert sgcp_nonconformity(-0.1) is None

def test_invalid_type():
    assert sgcp_nonconformity("bad") is None

if __name__ == "__main__":
    test_zero_prob()
    test_one_prob()
    test_mid()
    test_negative()
    test_invalid_type()
    print("5 tests passed")
