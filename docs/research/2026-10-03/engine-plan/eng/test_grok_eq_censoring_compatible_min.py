import math
from grok_eq_censoring_compatible_min import censoring_compatible_min

def test_basic_min():
    psi = [lambda z: z, lambda z: 2*z]
    assert censoring_compatible_min([1.0, 2.0], psi) == 1.0

def test_non_numeric():
    psi = [lambda z: z]
    assert censoring_compatible_min(["a"], psi) is None

def test_mismatch_len():
    psi = [lambda z: z]
    assert censoring_compatible_min([1.0, 2.0], psi) is None

def test_non_finite():
    psi = [lambda z: float("inf")]
    assert censoring_compatible_min([1.0], psi) is None

def test_empty():
    assert censoring_compatible_min([], []) is None

if __name__ == "__main__":
    test_basic_min()
    test_non_numeric()
    test_mismatch_len()
    test_non_finite()
    test_empty()
    print("5 tests passed")
