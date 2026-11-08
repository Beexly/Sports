import math
from grok_eq_cgrpo_advantage import cgrpo_advantage

def test_valid_case():
    # rewards [0,1,0], r_i=1, r_bar=1/3, sigma~0.4714, A=(1-0.333)/0.4714 ~1.414
    res = cgrpo_advantage(1.0, [0.0, 1.0, 0.0])
    assert res is not None
    assert math.isclose(res, (1.0 - 1/3) / (math.sqrt(2/9) + 1e-8), rel_tol=1e-5)

def test_fail_closed_empty():
    assert cgrpo_advantage(1.0, []) is None

def test_fail_closed_non_finite():
    assert cgrpo_advantage(float('nan'), [0.0, 1.0]) is None
    assert cgrpo_advantage(1.0, [0.0, float('inf')]) is None

def test_fail_closed_non_numeric():
    assert cgrpo_advantage("a", [0.0, 1.0]) is None
    assert cgrpo_advantage(1.0, [0.0, None]) is None

def test_fail_closed_bad_eps():
    assert cgrpo_advantage(1.0, [0.0, 1.0], epsilon=-1) is None
    assert cgrpo_advantage(1.0, [0.0, 1.0], epsilon=0) is None

def test_zero_var():
    # all equal, sigma=0, still divides by eps
    res = cgrpo_advantage(1.0, [1.0, 1.0])
    assert res is not None
    assert math.isclose(res, 0.0, abs_tol=1e-6)

if __name__ == "__main__":
    test_valid_case()
    test_fail_closed_empty()
    test_fail_closed_non_finite()
    test_fail_closed_non_numeric()
    test_fail_closed_bad_eps()
    test_zero_var()
    print("all 6 tests passed")
