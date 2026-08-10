"""Tests for app.models.mps_layer.MPSLinear.

Wrapped with pytest.importorskip('torch') so the suite degrades gracefully
if torch fails to install in a sandboxed environment.
"""

from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from app.models.mps_layer import MPSLinear  # noqa: E402


def test_stores_out_features_and_bond_dim():
    # Regression test for the naive-draft bug: forward() referenced
    # self.out_features but __init__ never set it.
    layer = MPSLinear(in_features=8, out_features=5, bond_dim=3)
    assert layer.out_features == 5
    assert layer.bond_dim == 3
    assert layer.in_features == 8


def test_forward_output_shape():
    layer = MPSLinear(in_features=10, out_features=4, bond_dim=6)
    x = torch.randn(7, 10)
    out = layer(x)
    assert out.shape == (7, 4)


def test_forward_output_is_finite():
    torch.manual_seed(0)
    layer = MPSLinear(in_features=6, out_features=3, bond_dim=2)
    x = torch.randn(4, 6)
    out = layer(x)
    assert torch.all(torch.isfinite(out))


def test_forward_rejects_wrong_feature_dim():
    layer = MPSLinear(in_features=5, out_features=2, bond_dim=2)
    with pytest.raises(ValueError):
        layer(torch.randn(3, 4))


def test_forward_rejects_unbatched_input():
    layer = MPSLinear(in_features=5, out_features=2, bond_dim=2)
    with pytest.raises(ValueError):
        layer(torch.randn(5))


def test_constructor_rejects_non_positive_dims():
    with pytest.raises(ValueError):
        MPSLinear(in_features=0, out_features=4)
    with pytest.raises(ValueError):
        MPSLinear(in_features=4, out_features=0)
    with pytest.raises(ValueError):
        MPSLinear(in_features=4, out_features=4, bond_dim=0)


def test_default_bond_dim_is_four():
    layer = MPSLinear(in_features=6, out_features=3)
    assert layer.bond_dim == 4


def test_output_is_deterministic_given_seed_and_eval_mode():
    torch.manual_seed(42)
    layer_a = MPSLinear(in_features=4, out_features=2, bond_dim=3)
    torch.manual_seed(42)
    layer_b = MPSLinear(in_features=4, out_features=2, bond_dim=3)

    x = torch.ones(2, 4)
    out_a = layer_a(x)
    out_b = layer_b(x)
    assert torch.allclose(out_a, out_b)


def test_batch_of_zeros_input_produces_finite_output():
    layer = MPSLinear(in_features=5, out_features=3, bond_dim=2)
    x = torch.zeros(3, 5)
    out = layer(x)
    assert out.shape == (3, 3)
    assert torch.all(torch.isfinite(out))


def test_single_example_batch():
    layer = MPSLinear(in_features=4, out_features=2, bond_dim=2)
    x = torch.randn(1, 4)
    out = layer(x)
    assert out.shape == (1, 2)
