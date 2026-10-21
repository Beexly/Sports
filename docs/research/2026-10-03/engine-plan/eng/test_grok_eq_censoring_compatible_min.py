"""Fail-closed tests for censoring_compatible_min. Returns None on invalid input."""
import pytest
from grok_eq_censoring_compatible_min import censoring_compatible_min


def test_identity_psis():
    res = censoring_compatible_min([1.0, 2.0, 0.5], [lambda v: v, lambda v: v, lambda v: v])
    assert res == pytest.approx(0.5)


def test_transformed():
    res = censoring_compatible_min([1.0, 4.0], [lambda v: 2 * v, lambda v: v ** 0.5])
    assert res == pytest.approx(2.0)


def test_none_on_invalid():
    assert censoring_compatible_min(None, [lambda v: v]) is None
    assert censoring_compatible_min([1.0], None) is None
    assert censoring_compatible_min([], [lambda v: v]) is None
    assert censoring_compatible_min([1.0], [lambda v: v, lambda v: v]) is None
    assert censoring_compatible_min([1.0], ["not_callable"]) is None
    assert censoring_compatible_min(["bad"], [lambda v: v]) is None
