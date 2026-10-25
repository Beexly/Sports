"""Fail-closed tests for heterogeneous_copula_mixture. Returns None on invalid input."""
from grok_eq_heterogeneous_copula_mixture import heterogeneous_copula_mixture


def test_basic_two_components():
    res = heterogeneous_copula_mixture([0.3, 0.7], [1.0, 2.0])
    assert res is not None
    assert abs(res - (0.3 * 1.0 + 0.7 * 2.0)) < 1e-9


def test_single_component():
    res = heterogeneous_copula_mixture([1.0], [5.5])
    assert res is not None
    assert abs(res - 5.5) < 1e-9


def test_none_on_none():
    assert heterogeneous_copula_mixture(None, [1.0]) is None
    assert heterogeneous_copula_mixture([1.0], None) is None


def test_none_on_bad_values():
    assert heterogeneous_copula_mixture([0.5, 0.6], [1.0, 1.0]) is None  # sum != 1
    assert heterogeneous_copula_mixture([-0.1, 1.1], [1.0, 1.0]) is None
    assert heterogeneous_copula_mixture([0.5, 0.5], [-1.0, 2.0]) is None
    assert heterogeneous_copula_mixture([float("nan"), 0.5], [1.0, 1.0]) is None
    assert heterogeneous_copula_mixture([], []) is None
    assert heterogeneous_copula_mixture([1.0], [1.0, 2.0]) is None  # length mismatch


if __name__ == "__main__":
    test_basic_two_components()
    test_single_component()
    test_none_on_none()
    test_none_on_bad_values()
    print("4 tests passed")
