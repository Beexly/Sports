"""Fail-closed tests for conformal_mos_gaussian_smooth. Returns None on invalid input."""
from grok_eq_conformal_mos_gaussian_smooth import conformal_mos_gaussian_smooth


def test_basic_two_centers():
    res = conformal_mos_gaussian_smooth(3.0, [1.0, 5.0], 1.0)
    assert res is not None
    assert len(res) == 2
    assert abs(sum(res) - 1.0) < 1e-6
    assert res[0] > 0 and res[1] > 0


def test_single_center():
    res = conformal_mos_gaussian_smooth(2.5, [2.5], 0.5)
    assert res is not None
    assert abs(res[0] - 1.0) < 1e-9


def test_none_on_none():
    assert conformal_mos_gaussian_smooth(None, [1.0], 1.0) is None
    assert conformal_mos_gaussian_smooth(1.0, None, 1.0) is None
    assert conformal_mos_gaussian_smooth(1.0, [1.0], None) is None


def test_none_on_bad_values():
    assert conformal_mos_gaussian_smooth(1.0, [], 1.0) is None
    assert conformal_mos_gaussian_smooth(1.0, [1.0], 0.0) is None
    assert conformal_mos_gaussian_smooth(1.0, [1.0], -1.0) is None
    assert conformal_mos_gaussian_smooth(float("nan"), [1.0], 1.0) is None
    assert conformal_mos_gaussian_smooth(1.0, [float("inf")], 1.0) is None


if __name__ == "__main__":
    test_basic_two_centers()
    test_single_center()
    test_none_on_none()
    test_none_on_bad_values()
    print("4 tests passed")
