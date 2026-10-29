import sys
sys.path.insert(0, '.')
from grok_eq_empirical_copula_cpts import empirical_copula_cpts

def test_finite():
    # simple 1d: u_query=0.5, one cal=0.3 -> 1_{0.3<0.5}=1, inf contributes 0, denom=2, result=1/2
    assert empirical_copula_cpts([0.5], [[0.3]]) == 0.5
    # two cal both below
    assert abs(empirical_copula_cpts([0.6], [[0.1], [0.2]]) - 2/3) < 1e-9

def test_empty_cal():
    # n=0, count=0 (inf), /1 =0
    assert empirical_copula_cpts([0.5], []) == 0.0

def test_nonfinite():
    assert empirical_copula_cpts([float('nan')], [[0.1]]) is None
    assert empirical_copula_cpts([0.5], [[float('inf')]]) is None

def test_nonnumeric():
    assert empirical_copula_cpts(['a'], [[0.1]]) is None
    assert empirical_copula_cpts([0.5], None) is None

def test_dim_mismatch():
    assert empirical_copula_cpts([0.5], [[0.1, 0.2]]) is None
    assert empirical_copula_cpts([], [[0.1]]) is None

if __name__ == '__main__':
    test_finite()
    test_empty_cal()
    test_nonfinite()
    test_nonnumeric()
    test_dim_mismatch()
    print('all tests passed')
