import sys
sys.path.insert(0, '.')
from grok_eq_del_recalibrated_p import del_recalibrated_p

def test_finite():
    assert del_recalibrated_p(0.5, [0.1, 0.2, 0.6, 0.7]) == 0.6  # 1+2 / 5 = 0.6
    assert del_recalibrated_p(0.0, [1.0]) == 1.0  # 1+1 / 2
    assert del_recalibrated_p(2.0, [0.1, 0.2]) == 1.0 / 3

def test_nonfinite():
    assert del_recalibrated_p(float('nan'), [1.0]) is None
    assert del_recalibrated_p(1.0, [float('inf')]) is None
    assert del_recalibrated_p(1.0, None) is None

def test_nonnumeric():
    assert del_recalibrated_p('a', [1]) is None
    assert del_recalibrated_p(1.0, ['b']) is None
    assert del_recalibrated_p(None, [1.0]) is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_nonnumeric()
    print('all tests passed')
