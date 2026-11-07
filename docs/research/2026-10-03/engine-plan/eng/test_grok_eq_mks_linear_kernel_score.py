"""Fail-closed tests for mks_linear_kernel_score. Returns None on invalid input."""
import pytest
from grok_eq_mks_linear_kernel_score import mks_linear_kernel_score


def test_unit_identity():
    # residual = mean + e1, cov=0, λ=1 → score = 1
    assert mks_linear_kernel_score([1.0, 0.0], [0.0, 0.0], [[0.0, 0.0], [0.0, 0.0]], 1.0) == pytest.approx(1.0)


def test_scaled():
    # residual=2, mean=0, cov=0, λ=4 → score = 2^2 / 4 = 1
    assert mks_linear_kernel_score([2.0], [0.0], [[0.0]], 4.0) == pytest.approx(1.0)


def test_none_on_missing():
    assert mks_linear_kernel_score(None, [0.0], [[1.0]], 1.0) is None
    assert mks_linear_kernel_score([0.0], None, [[1.0]], 1.0) is None
    assert mks_linear_kernel_score([0.0], [0.0], None, 1.0) is None
    assert mks_linear_kernel_score([0.0], [0.0], [[1.0]], None) is None


def test_none_on_bad_shapes():
    assert mks_linear_kernel_score([1.0, 2.0], [0.0], [[1.0]], 1.0) is None
    assert mks_linear_kernel_score([1.0], [0.0, 0.0], [[1.0]], 1.0) is None
    assert mks_linear_kernel_score([1.0], [0.0], [[1.0, 0.0], [0.0, 1.0]], 1.0) is None


def test_none_on_nonpositive_lambda():
    assert mks_linear_kernel_score([1.0], [0.0], [[1.0]], 0.0) is None
    assert mks_linear_kernel_score([1.0], [0.0], [[1.0]], -1.0) is None
