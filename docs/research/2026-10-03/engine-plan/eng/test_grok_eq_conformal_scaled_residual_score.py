import sys
sys.path.insert(0, '.')
from grok_eq_conformal_scaled_residual_score import conformal_scaled_residual_score

def test_finite():
    assert abs(conformal_scaled_residual_score(1.0, 0.0, 1.0) - 1.0) < 1e-9
    assert conformal_scaled_residual_score(0.0, 0.0, 4.0) == 0.0

def test_nonfinite():
    assert conformal_scaled_residual_score(float('nan'), 1.0, 1.0) is None
    assert conformal_scaled_residual_score(1.0, float('inf'), 1.0) is None
    assert conformal_scaled_residual_score(1.0, 1.0, float('nan')) is None

def test_bad_variance():
    assert conformal_scaled_residual_score(1.0, 1.0, 0.0) is None
    assert conformal_scaled_residual_score(1.0, 1.0, -1.0) is None

def test_nonnumeric():
    assert conformal_scaled_residual_score('a', 1.0, 1.0) is None
    assert conformal_scaled_residual_score(1.0, None, 1.0) is None
    assert conformal_scaled_residual_score(1.0, 1.0, 'v') is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_bad_variance()
    test_nonnumeric()
    print('all tests passed')
