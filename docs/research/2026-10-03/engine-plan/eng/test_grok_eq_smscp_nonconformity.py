from grok_eq_smscp_nonconformity import smscp_nonconformity

def test_zero():
    assert smscp_nonconformity(1.0, 1.0) == 0.0

def test_positive():
    assert smscp_nonconformity(3.0, 1.0) == 2.0

def test_negative():
    assert smscp_nonconformity(1.0, 3.5) == 2.5

def test_bad_str():
    assert smscp_nonconformity("a", 1.0) is None

def test_bad_none():
    assert smscp_nonconformity(None, 1.0) is None

if __name__ == "__main__":
    test_zero()
    test_positive()
    test_negative()
    test_bad_str()
    test_bad_none()
    print("5 tests passed")
