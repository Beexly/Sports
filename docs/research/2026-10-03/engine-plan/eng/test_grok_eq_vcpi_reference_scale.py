"""Fail-closed tests for vcpi_reference_scale. Returns None on invalid input."""
from grok_eq_vcpi_reference_scale import vcpi_reference_scale


def test_gaussian_scale_recovery():
    f = 10.0
    zs = [-1.28155, -0.67449, 0.0, 0.67449, 1.28155]
    qs = [f + 1.0 * z for z in zs]
    res = vcpi_reference_scale(qs, f, zs)
    assert res is not None and abs(res - 1.0) < 1e-4


def test_positive_scale():
    qs = [5.0, 6.0, 7.0]
    zs = [-1.0, 0.0, 1.0]
    res = vcpi_reference_scale(qs, 6.0, zs)
    assert res is not None and abs(res - 1.0) < 1e-9


def test_none_on_mismatch():
    assert vcpi_reference_scale([1.0, 2.0], 1.5, [-1.0]) is None
    assert vcpi_reference_scale([], 1.0, []) is None


def test_none_on_invalid():
    assert vcpi_reference_scale(None, 1.0, [1.0]) is None
    assert vcpi_reference_scale([1.0], None, [1.0]) is None
    assert vcpi_reference_scale([1.0], 1.0, None) is None
    assert vcpi_reference_scale([1.0], 1.0, [0.0]) is None
    assert vcpi_reference_scale(["bad"], 1.0, [1.0]) is None
