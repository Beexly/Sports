from grok_eq_conformal_set_loss import conformal_set_loss

def test_hit():
    assert conformal_set_loss(2, True, 0.5) == 2.0

def test_miss():
    assert conformal_set_loss(3, False, 0.5) == 3.0 + 2.0

def test_lambda_one():
    assert conformal_set_loss(1, False, 1.0) == 2.0

def test_bad_size():
    assert conformal_set_loss(-1, True, 0.5) is None

def test_bad_lambda():
    assert conformal_set_loss(1, True, 0.0) is None

if __name__ == "__main__":
    test_hit()
    test_miss()
    test_lambda_one()
    test_bad_size()
    test_bad_lambda()
    print("5 tests passed")
