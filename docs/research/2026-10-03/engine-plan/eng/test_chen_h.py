import math
from sheet_identities import chen_h, chen_kendall

def test_h_finite():
    assert math.isfinite(chen_h(math.e, 0.5))

def test_h_rejects():
    assert chen_h(math.e, 0) is None
    assert chen_h(math.e, 1) is None
    assert chen_h(0, 0.5) is None

def test_kendall():
    assert chen_kendall([2, 1], [2, 1], 0.1, 3) == 1.3
    assert chen_kendall([2, 1], [2, 1], 0, 3) is None
