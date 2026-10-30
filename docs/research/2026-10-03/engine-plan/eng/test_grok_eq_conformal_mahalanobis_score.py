import sys
sys.path.insert(0, '.')
from grok_eq_conformal_mahalanobis_score import conformal_mahalanobis_score
import math

def test_finite():
    # Identity whitening, residual [3,4] -> 5
    sigma = [[1.0, 0.0], [0.0, 1.0]]
    assert conformal_mahalanobis_score([3.0, 4.0], sigma) == 5.0
    assert conformal_mahalanobis_score([0.0], [[1.0]]) == 0.0

def test_nonfinite():
    sigma = [[1.0, 0.0], [0.0, 1.0]]
    assert conformal_mahalanobis_score([float('nan'), 1.0], sigma) is None
    assert conformal_mahalanobis_score([1.0, 1.0], [[float('inf'), 0], [0, 1]]) is None

def test_shape_mismatch():
    assert conformal_mahalanobis_score([1.0, 2.0], [[1.0]]) is None
    assert conformal_mahalanobis_score([], []) is None

def test_nonnumeric():
    assert conformal_mahalanobis_score(['a'], [[1]]) is None
    assert conformal_mahalanobis_score(None, [[1]]) is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_shape_mismatch()
    test_nonnumeric()
    print('all tests passed')
