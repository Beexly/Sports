import math
from grok_eq_clayton_var_beta import clayton_var_beta

def test_valid_case():
    # simple case d=2, beta = u^{-theta-1} * (alpha^{-theta} - u^{-theta})^0 = u^{-theta-1}
    res = clayton_var_beta(0.5, 0.2, 1.0, 2)
    assert res is not None
    assert math.isclose(res, 0.5 ** (-1 - 1), rel_tol=1e-6)

def test_fail_closed_invalid_u():
    assert clayton_var_beta(1.5, 0.2, 1.0, 2) is None
    assert clayton_var_beta(-0.1, 0.2, 1.0, 2) is None

def test_fail_closed_invalid_alpha():
    assert clayton_var_beta(0.5, 1.2, 1.0, 2) is None
    assert clayton_var_beta(0.5, 0.0, 1.0, 2) is None

def test_fail_closed_invalid_theta():
    assert clayton_var_beta(0.5, 0.2, 0.0, 2) is None
    assert clayton_var_beta(0.5, 0.2, -1.0, 2) is None

def test_fail_closed_u_lt_alpha():
    assert clayton_var_beta(0.1, 0.5, 1.0, 2) is None

def test_fail_closed_d_lt_2():
    assert clayton_var_beta(0.5, 0.2, 1.0, 1) is None

def test_non_numeric():
    assert clayton_var_beta("a", 0.2, 1.0, 2) is None
    assert clayton_var_beta(0.5, None, 1.0, 2) is None

if __name__ == "__main__":
    test_valid_case()
    test_fail_closed_invalid_u()
    test_fail_closed_invalid_alpha()
    test_fail_closed_invalid_theta()
    test_fail_closed_u_lt_alpha()
    test_fail_closed_d_lt_2()
    test_non_numeric()
    print("all 7 tests passed")
