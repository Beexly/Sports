"""Fail-closed tests for conformal_ordering_sigma."""
from grok_eq_conformal_ordering_estimator import conformal_ordering_sigma


def test_valid_distinct():
    assert conformal_ordering_sigma([1.0, 3.0, 2.0]) == [1, 3, 2]


def test_ties():
    assert conformal_ordering_sigma([1.0, 1.0]) == [2, 2]


def test_empty():
    assert conformal_ordering_sigma([]) is None


def test_nan():
    assert conformal_ordering_sigma([1.0, float("nan")]) is None


def test_non_numeric():
    assert conformal_ordering_sigma([1.0, "bad"]) is None


if __name__ == "__main__":
    test_valid_distinct()
    test_ties()
    test_empty()
    test_nan()
    test_non_numeric()
    print("5 tests passed")
