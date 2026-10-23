import sys
sys.path.insert(0, '.')
from grok_eq_conformal_residual_score import conformal_residual_score

def test_finite():
    assert conformal_residual_score(1.0, 2.0) == 1.0
    assert conformal_residual_score(0, 0) == 0.0

def test_nonfinite():
    assert conformal_residual_score(float('nan'), 1.0) is None
    assert conformal_residual_score(1.0, float('inf')) is None

def test_nonnumeric():
    assert conformal_residual_score('a', 1) is None
    assert conformal_residual_score(None, 1.0) is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_nonnumeric()
    print('all tests passed')
