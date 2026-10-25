import sys
sys.path.insert(0, '.')
from grok_eq_conformal_p_function import conformal_p_function

def test_finite():
    assert conformal_p_function(0.5, [0.1, 0.2, 0.6, 0.7]) == 0.6  # 1+2 / 5 = 0.6
    assert conformal_p_function(0.0, [1.0]) == 1.0  # 1+1 / 2
    assert conformal_p_function(2.0, [0.1, 0.2]) == 1.0 / 3

def test_nonfinite():
    assert conformal_p_function(float('nan'), [1.0]) is None
    assert conformal_p_function(1.0, [float('inf')]) is None
    assert conformal_p_function(1.0, None) is None

def test_nonnumeric():
    assert conformal_p_function('a', [1]) is None
    assert conformal_p_function(1.0, ['b']) is None
    assert conformal_p_function(None, [1.0]) is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_nonnumeric()
    print('all tests passed')
