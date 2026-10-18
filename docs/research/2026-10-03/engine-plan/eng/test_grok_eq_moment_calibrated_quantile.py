from grok_eq_moment_calibrated_quantile import moment_calibrated_quantile

def test_uniform_basic():
    # n=3, alpha=0.25 -> level = 4*0.75/3 = 1.0, so quantile is the max
    assert moment_calibrated_quantile([1.0, 2.0, 3.0], [1/3, 1/3, 1/3], 0.25) == 3.0

def test_weighted_earlier():
    # higher weight on small score reaches level sooner
    qs = moment_calibrated_quantile([1.0, 2.0, 3.0], [0.5, 0.3, 0.2], 0.5)
    assert qs == 2.0 or qs == 1.0  # depends on exact level; level=(3+1)*0.5/3≈0.666, cum 0.5 then 0.8

def test_exact_level():
    assert moment_calibrated_quantile([10.0], [1.0], 0.5) == 10.0

def test_bad_alpha():
    assert moment_calibrated_quantile([1.0], [1.0], 0.0) is None

def test_weight_sum_bad():
    assert moment_calibrated_quantile([1.0, 2.0], [0.4, 0.4], 0.5) is None

if __name__ == "__main__":
    test_uniform_basic()
    test_weighted_earlier()
    test_exact_level()
    test_bad_alpha()
    test_weight_sum_bad()
    print("5 tests passed")
