"""Tests for app.models.free_energy_coder.FreeEnergyCoder.

Wrapped with pytest.importorskip('torch') so the suite degrades gracefully
if torch fails to install in a sandboxed environment.
"""

from __future__ import annotations

import math

import pytest

torch = pytest.importorskip("torch")

from app.models.free_energy_coder import FreeEnergyCoder  # noqa: E402


def test_forward_returns_loss_z1_z2_with_expected_shapes():
    torch.manual_seed(0)
    coder = FreeEnergyCoder(x_dim=6, z1_dim=3, z2_dim=2, hidden_dim=16)
    x = torch.randn(5, 6)
    loss, z1, z2 = coder(x)
    assert loss.dim() == 0
    assert z1.shape == (5, 3)
    assert z2.shape == (5, 2)


def test_loss_is_finite_on_random_input():
    torch.manual_seed(1)
    coder = FreeEnergyCoder(x_dim=4, z1_dim=2, z2_dim=2, hidden_dim=8)
    x = torch.randn(10, 4)
    loss, _, _ = coder(x)
    assert torch.isfinite(loss)


def test_loss_is_finite_on_extreme_input_values():
    # Values large enough to blow up an unclamped exp(logvar) if the soft
    # clamp were missing.
    torch.manual_seed(2)
    coder = FreeEnergyCoder(x_dim=3, z1_dim=2, z2_dim=2, hidden_dim=8)
    x = torch.tensor([[1e4, -1e4, 1e3], [0.0, 0.0, 0.0]])
    loss, z1, z2 = coder(x)
    assert torch.isfinite(loss)
    assert torch.all(torch.isfinite(z1))
    assert torch.all(torch.isfinite(z2))


def test_constructor_rejects_non_positive_dims():
    with pytest.raises(ValueError):
        FreeEnergyCoder(x_dim=0, z1_dim=2, z2_dim=2)
    with pytest.raises(ValueError):
        FreeEnergyCoder(x_dim=4, z1_dim=0, z2_dim=2)
    with pytest.raises(ValueError):
        FreeEnergyCoder(x_dim=4, z1_dim=2, z2_dim=0)


def test_forward_rejects_wrong_shaped_input():
    coder = FreeEnergyCoder(x_dim=5, z1_dim=2, z2_dim=2, hidden_dim=8)
    with pytest.raises(ValueError):
        coder(torch.randn(3, 4))  # wrong feature dim
    with pytest.raises(ValueError):
        coder(torch.randn(5))  # wrong number of dims (not batched)


def test_forward_rejects_empty_batch():
    coder = FreeEnergyCoder(x_dim=3, z1_dim=2, z2_dim=2, hidden_dim=8)
    with pytest.raises(ValueError):
        coder(torch.empty(0, 3))


def test_forward_rejects_nan_input():
    coder = FreeEnergyCoder(x_dim=3, z1_dim=2, z2_dim=2, hidden_dim=8)
    x = torch.tensor([[1.0, float("nan"), 2.0]])
    with pytest.raises(ValueError):
        coder(x)


def test_forward_rejects_inf_input():
    coder = FreeEnergyCoder(x_dim=3, z1_dim=2, z2_dim=2, hidden_dim=8)
    x = torch.tensor([[1.0, float("inf"), 2.0]])
    with pytest.raises(ValueError):
        coder(x)


def test_gaussian_kl_matches_closed_form_standard_normal_special_case():
    # KL(N(mu, sigma^2) || N(0, 1)) closed form:
    # 0.5 * (mu^2 + sigma^2 - 1 - log(sigma^2))
    mu_q = torch.tensor([[0.5, -0.3]])
    logvar_q = torch.tensor([[0.2, -0.1]])
    mu_p = torch.zeros_like(mu_q)
    logvar_p = torch.zeros_like(logvar_q)

    kl = FreeEnergyCoder._gaussian_kl(mu_q, logvar_q, mu_p, logvar_p)

    expected = 0.5 * (mu_q**2 + torch.exp(logvar_q) - 1 - logvar_q)
    expected_sum = expected.sum(dim=-1)
    assert torch.allclose(kl, expected_sum, atol=1e-5)


def test_gaussian_kl_is_zero_when_distributions_are_identical():
    mu = torch.tensor([[0.1, 0.2, -0.3]])
    logvar = torch.tensor([[0.05, -0.2, 0.4]])
    kl = FreeEnergyCoder._gaussian_kl(mu, logvar, mu, logvar)
    assert torch.allclose(kl, torch.zeros_like(kl), atol=1e-6)


def test_gaussian_kl_general_case_differs_from_standard_normal_case():
    # Sanity check that the general-prior KL is NOT the same number as the
    # standard-normal-prior KL for a non-trivial prior -- i.e. this isn't
    # secretly ignoring mu_p/logvar_p.
    mu_q = torch.tensor([[1.0]])
    logvar_q = torch.tensor([[0.0]])
    mu_p_general = torch.tensor([[3.0]])
    logvar_p_general = torch.tensor([[1.0]])
    mu_p_standard = torch.zeros_like(mu_q)
    logvar_p_standard = torch.zeros_like(logvar_q)

    kl_general = FreeEnergyCoder._gaussian_kl(mu_q, logvar_q, mu_p_general, logvar_p_general)
    kl_standard = FreeEnergyCoder._gaussian_kl(mu_q, logvar_q, mu_p_standard, logvar_p_standard)

    assert not torch.allclose(kl_general, kl_standard)


def test_clamp_logvar_bounds_are_respected():
    raw = torch.tensor([-1e6, 1e6, 0.0])
    clamped = FreeEnergyCoder._clamp_logvar(raw)
    assert torch.all(clamped >= -10.0)
    assert torch.all(clamped <= 10.0)
    assert clamped[2] == 0.0


def test_loss_is_reasonable_scalar_not_nan_across_multiple_seeds():
    for seed in range(3):
        torch.manual_seed(seed)
        coder = FreeEnergyCoder(x_dim=5, z1_dim=3, z2_dim=2, hidden_dim=12)
        x = torch.randn(8, 5)
        loss, _, _ = coder(x)
        assert not math.isnan(loss.item())
        assert not math.isinf(loss.item())
