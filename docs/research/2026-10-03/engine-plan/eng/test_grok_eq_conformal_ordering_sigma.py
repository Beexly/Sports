"""Fail-closed tests for conformal_ordering_sigma from arXiv:2610.40340 eq (1)."""
from grok_eq_conformal_ordering_sigma import conformal_ordering_sigma


def test_none_inputs():
    assert conformal_ordering_sigma(None, 0) is None
    assert conformal_ordering_sigma([1.0], None) is None


def test_invalid_j():
    assert conformal_ordering_sigma([1.0, 2.0], -1) is None
    assert conformal_ordering_sigma([1.0, 2.0], 2) is None
    assert conformal_ordering_sigma([1.0], 0) == 1


def test_non_finite():
    assert conformal_ordering_sigma([1.0, float("nan")], 0) is None
    assert conformal_ordering_sigma([1.0, float("inf")], 0) is None


def test_basic_rank():
    mus = [3.0, 1.0, 2.0]
    assert conformal_ordering_sigma(mus, 0) == 3
    assert conformal_ordering_sigma(mus, 1) == 1
    assert conformal_ordering_sigma(mus, 2) == 2


def test_ties():
    mus = [1.0, 1.0, 2.0]
    assert conformal_ordering_sigma(mus, 0) == 2
    assert conformal_ordering_sigma(mus, 2) == 3


if __name__ == "__main__":
    test_none_inputs()
    test_invalid_j()
    test_non_finite()
    test_basic_rank()
    test_ties()
    print("5 tests passed")
