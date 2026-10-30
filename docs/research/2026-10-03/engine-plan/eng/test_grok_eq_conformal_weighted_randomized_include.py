import sys
sys.path.insert(0, '.')
from grok_eq_conformal_weighted_randomized_include import conformal_weighted_randomized_include

def test_include_basic():
    # scores all below candidate, high weight -> include
    assert conformal_weighted_randomized_include([1.0, 1.5], [1.0, 1.0], 2.0, 0.5, 0.1, 1.0) is True
    # high scores, low alpha edge
    assert conformal_weighted_randomized_include([3.0, 4.0], [1.0, 1.0], 2.0, 0.0, 0.7, 1.0) is False

def test_boundary():
    # exact threshold
    scores = [1.0]
    weights = [1.0]
    # A=0, B=1+1=2, W=2, u=0.5 -> (0 + 0.5*2)/2 = 0.5
    assert conformal_weighted_randomized_include(scores, weights, 1.0, 0.5, 0.499, 1.0) is True
    assert conformal_weighted_randomized_include(scores, weights, 1.0, 0.5, 0.501, 1.0) is False

def test_nonfinite():
    assert conformal_weighted_randomized_include([float('nan')], [1.0], 1.0, 0.5, 0.1, 1.0) is None
    assert conformal_weighted_randomized_include([1.0], [float('inf')], 1.0, 0.5, 0.1, 1.0) is None
    assert conformal_weighted_randomized_include([1.0], [1.0], float('nan'), 0.5, 0.1, 1.0) is None

def test_bad_args():
    assert conformal_weighted_randomized_include([1.0], [1.0], 1.0, 1.5, 0.1, 1.0) is None  # u >1
    assert conformal_weighted_randomized_include([1.0], [1.0], 1.0, 0.5, 0.0, 1.0) is None  # alpha=0
    assert conformal_weighted_randomized_include([1.0], [1.0], 1.0, 0.5, 0.1, 0.0) is None  # weight=0
    assert conformal_weighted_randomized_include([], [], 1.0, 0.5, 0.1, 1.0) is None
    assert conformal_weighted_randomized_include([1.0], [1.0, 2.0], 1.0, 0.5, 0.1, 1.0) is None  # mismatch

def test_negative_weight():
    assert conformal_weighted_randomized_include([1.0], [-1.0], 1.0, 0.5, 0.1, 1.0) is None

if __name__ == '__main__':
    test_include_basic()
    test_boundary()
    test_nonfinite()
    test_bad_args()
    test_negative_weight()
    print('all tests passed')
