import sys
sys.path.insert(0, '.')
from grok_eq_adaptnc_convex_score import adaptnc_convex_nonconformity_score
import math

def test_finite():
    # residual [1,0], A = [[1,0],[0,1]], b=[0,0] -> max(1,0)=1
    A = [[1.0, 0.0], [0.0, 1.0]]
    b = [0.0, 0.0]
    assert adaptnc_convex_nonconformity_score([1.0, 0.0], A, b) == 1.0
    # with b offsets
    assert adaptnc_convex_nonconformity_score([2.0, 3.0], [[1.0,0],[0,1]], [0.5, 1.0]) == 2.0

def test_nonfinite():
    A = [[1.0, 0.0]]
    b = [0.0]
    assert adaptnc_convex_nonconformity_score([float('nan'), 1.0], A, b) is None
    assert adaptnc_convex_nonconformity_score([1.0], [[float('inf')]], [0.0]) is None

def test_shape_mismatch():
    assert adaptnc_convex_nonconformity_score([1.0, 2.0], [[1.0]], [0.0]) is None
    assert adaptnc_convex_nonconformity_score([], [], []) is None
    assert adaptnc_convex_nonconformity_score([1.0], [[1.0, 0.0]], [0.0]) is None

def test_nonnumeric():
    assert adaptnc_convex_nonconformity_score(['a'], [[1]], [0]) is None
    assert adaptnc_convex_nonconformity_score(None, [[1]], [0]) is None
    assert adaptnc_convex_nonconformity_score([1.0], None, [0]) is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_shape_mismatch()
    test_nonnumeric()
    print('all tests passed')
