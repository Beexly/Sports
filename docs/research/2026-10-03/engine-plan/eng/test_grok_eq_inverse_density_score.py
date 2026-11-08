import math
from grok_eq_inverse_density_score import inverse_density_score

def test_valid_case():
    res = inverse_density_score(2.0)
    assert res is not None
    assert math.isclose(res, 0.5, rel_tol=1e-9)

def test_fail_closed_zero():
    assert inverse_density_score(0.0) is None

def test_fail_closed_negative():
    assert inverse_density_score(-1.0) is None

def test_fail_closed_inf():
    assert inverse_density_score(float("inf")) is None

def test_fail_closed_nan():
    assert inverse_density_score(float("nan")) is None

def test_non_numeric():
    assert inverse_density_score("a") is None
    assert inverse_density_score(None) is None

if __name__ == "__main__":
    test_valid_case()
    test_fail_closed_zero()
    test_fail_closed_negative()
    test_fail_closed_inf()
    test_fail_closed_nan()
    test_non_numeric()
    print("all 6 tests passed")
