import math
from grok_eq_nnm_score import nnm_score

def test_valid_case():
    # 0.3 + 0.8 - 0.2 = 0.9
    res = nnm_score(0.3, 0.8, 0.2)
    assert res is not None
    assert math.isclose(res, 0.9, abs_tol=1e-9)

def test_fail_closed_non_finite():
    assert nnm_score(float('nan'), 0.5, 0.2) is None
    assert nnm_score(0.3, float('inf'), 0.2) is None
    assert nnm_score(0.3, 0.5, float('-inf')) is None

def test_fail_closed_non_numeric():
    assert nnm_score("a", 0.5, 0.2) is None
    assert nnm_score(0.3, None, 0.2) is None
    assert nnm_score(0.3, 0.5, [0.2]) is None

def test_zero_correction():
    res = nnm_score(0.4, 0.4, 0.4)
    assert res is not None
    assert math.isclose(res, 0.4, abs_tol=1e-9)

def test_negative_result_allowed():
    res = nnm_score(0.1, 0.2, 0.5)
    assert res is not None
    assert math.isclose(res, -0.2, abs_tol=1e-9)

if __name__ == "__main__":
    test_valid_case()
    test_fail_closed_non_finite()
    test_fail_closed_non_numeric()
    test_zero_correction()
    test_negative_result_allowed()
    print("all 5 tests passed")
