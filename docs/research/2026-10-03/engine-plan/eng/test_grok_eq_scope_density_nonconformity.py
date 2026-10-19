from grok_eq_scope_density_nonconformity import scope_density_nonconformity
import math

def test_one():
    assert scope_density_nonconformity(1.0) == 0.0

def test_half():
    assert abs(scope_density_nonconformity(0.5) - math.log(2)) < 1e-9

def test_zero():
    assert scope_density_nonconformity(0.0) is None

def test_neg():
    assert scope_density_nonconformity(-0.1) is None

def test_bad():
    assert scope_density_nonconformity("a") is None

if __name__ == "__main__":
    test_one()
    test_half()
    test_zero()
    test_neg()
    test_bad()
    print("5 tests passed")
