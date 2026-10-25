"""Fail-closed tests for socc_loss. Returns None on invalid input."""
from grok_eq_socc_loss import socc_loss


def test_basic_equal_weight():
    res = socc_loss(0.5, 10.0, 20.0, 5.0, 10.0)
    assert res is not None
    assert abs(res - (0.5 * 0.5 + 0.5 * 0.5)) < 1e-9


def test_alpha_one():
    res = socc_loss(1.0, 15.0, 10.0, 100.0, 1.0)
    assert res is not None
    assert abs(res - 1.5) < 1e-9


def test_none_on_none():
    assert socc_loss(None, 10.0, 20.0, 5.0, 10.0) is None
    assert socc_loss(0.5, None, 20.0, 5.0, 10.0) is None
    assert socc_loss(0.5, 10.0, None, 5.0, 10.0) is None
    assert socc_loss(0.5, 10.0, 20.0, None, 10.0) is None
    assert socc_loss(0.5, 10.0, 20.0, 5.0, None) is None


def test_none_on_bad_values():
    assert socc_loss(float("nan"), 10.0, 20.0, 5.0, 10.0) is None
    assert socc_loss(0.5, float("inf"), 20.0, 5.0, 10.0) is None
    assert socc_loss(1.5, 10.0, 20.0, 5.0, 10.0) is None
    assert socc_loss(-0.1, 10.0, 20.0, 5.0, 10.0) is None
    assert socc_loss(0.5, 10.0, 0.0, 5.0, 10.0) is None
    assert socc_loss(0.5, 10.0, -1.0, 5.0, 10.0) is None
    assert socc_loss("bad", 10.0, 20.0, 5.0, 10.0) is None


if __name__ == "__main__":
    test_basic_equal_weight()
    test_alpha_one()
    test_none_on_none()
    test_none_on_bad_values()
    print("4 tests passed")
