"""Tests for the hierarchical predictive coder (variational free energy).

The load-bearing test here is :func:`test_model_actually_learns`. Shape-and-finiteness
tests are NOT sufficient: a VAE whose decoder is disconnected from its encoder, whose KL
is computed against the wrong distribution, or whose ``mu``/``logvar`` chunking is
transposed still produces correctly-shaped finite tensors forever. The only thing that
separates a working model from one that silently does nothing is that the objective goes
DOWN on data with real structure, and that the reconstruction actually tracks the input.
So that test trains on a fixed seeded synthetic dataset and asserts both.

:func:`test_extreme_magnitude_input_stays_finite` and its counterfactual sibling
:func:`test_clamp_is_load_bearing` pin the numerical-safety property: the log-variance
clamp is what stands between this module and ``inf``/``NaN``.

All randomness is explicitly seeded (``torch.manual_seed`` / an explicit
``torch.Generator``). No wall-clock, no unseeded draws in any assertion.
"""

from __future__ import annotations

import math
from typing import Tuple

import pytest
import torch

from app.models.free_energy_coder import (
    DEFAULT_LOGVAR_MAX,
    DEFAULT_LOGVAR_MIN,
    FreeEnergyOutput,
    HierarchicalPredictiveCoder,
)

INPUT_DIM = 8
Z1_DIM = 4
Z2_DIM = 2


# --------------------------------------------------------------------------------------
# Fixtures / helpers
# --------------------------------------------------------------------------------------
def make_model(seed: int = 0, **overrides: int) -> HierarchicalPredictiveCoder:
    """Construct a small model under an explicit seed so init is reproducible."""
    kwargs = dict(input_dim=INPUT_DIM, hidden_dim=32, z1_dim=Z1_DIM, z2_dim=Z2_DIM)
    kwargs.update(overrides)
    torch.manual_seed(seed)
    return HierarchicalPredictiveCoder(**kwargs)  # type: ignore[arg-type]


def low_rank_gaussian(
    n_samples: int = 200,
    n_features: int = INPUT_DIM,
    rank: int = 2,
    noise: float = 0.05,
    seed: int = 7,
) -> torch.Tensor:
    """A fixed synthetic dataset with genuine low-dimensional structure.

    ``X = C @ L + noise`` with ``C: (n, rank)`` and ``L: (rank, n_features)``, both
    standard normal from a seeded generator. Structure is essential: a model cannot
    lower the free energy on pure isotropic noise, so training on noise would not
    distinguish a working implementation from a broken one.
    """
    gen = torch.Generator().manual_seed(seed)
    loadings = torch.randn(rank, n_features, generator=gen)
    codes = torch.randn(n_samples, rank, generator=gen)
    return codes @ loadings + noise * torch.randn(n_samples, n_features, generator=gen)


def silence_network(net: torch.nn.Module) -> None:
    """Zero every weight and bias in an MLP so its output is a constant.

    With ``tanh`` activations, all-zero parameters make each hidden layer emit exactly
    ``tanh(0) = 0``, so the network's output equals its final bias. Setting that bias then
    lets a test control a density head exactly.
    """
    with torch.no_grad():
        for param in net.parameters():
            param.zero_()


# --------------------------------------------------------------------------------------
# 1. THE REAL TEST: it actually learns
# --------------------------------------------------------------------------------------
def test_model_actually_learns() -> None:
    """Training must materially lower the free energy AND the reconstruction error.

    This is the test that a do-nothing implementation fails. Two independent assertions:

    * the free energy at the end of training is far below where it started, and
    * the deterministic reconstruction ``x_mu`` explains almost all the variance of the
      data, i.e. the decoder is genuinely conditioned on the encoded input rather than
      collapsing to the dataset mean.

    The second assertion is the one that catches a model that "reduces loss" only by
    inflating its output variance or by driving the KL terms to zero.
    """
    torch.manual_seed(1234)
    data = low_rank_gaussian()
    model = HierarchicalPredictiveCoder(
        input_dim=INPUT_DIM, hidden_dim=32, z1_dim=Z1_DIM, z2_dim=Z2_DIM
    )
    optimiser = torch.optim.Adam(model.parameters(), lr=1e-2)

    losses = []
    for _ in range(400):
        optimiser.zero_grad()
        out = model(data)
        out.loss.backward()
        optimiser.step()
        losses.append(out.loss.detach().item())

    first = sum(losses[:10]) / 10.0
    last = sum(losses[-10:]) / 10.0

    assert all(math.isfinite(value) for value in losses), "loss went non-finite during training"
    # Observed on this fixed seed: ~10.9 -> ~-3.0. The margin is deliberately far looser
    # than the observed gap so the test pins "it learns", not "it learns this exact amount".
    assert last < first - 5.0, f"free energy did not fall materially: {first:.3f} -> {last:.3f}"

    with torch.no_grad():
        reconstruction = model(data, sample=False).x_mu
    mse = (reconstruction - data).pow(2).mean().item()
    variance = data.var(unbiased=False).item()
    # Predicting the dataset mean would give mse == variance. Observed ratio here is
    # ~0.002; 0.05 leaves a wide margin while still failing any model that ignores x.
    assert mse < 0.05 * variance, (
        f"reconstruction explains too little variance: mse={mse:.5f} vs var={variance:.5f}"
    )


def test_untrained_model_reconstructs_no_better_than_chance() -> None:
    """The honesty claim in the docstring, as an executable check.

    An untrained instance is noise: its reconstruction is not meaningfully better than
    predicting nothing. This exists so the "untrained instances emit noise" warning cannot
    quietly become false without a test failing.
    """
    torch.manual_seed(99)
    data = low_rank_gaussian()
    model = HierarchicalPredictiveCoder(
        input_dim=INPUT_DIM, hidden_dim=32, z1_dim=Z1_DIM, z2_dim=Z2_DIM
    )
    with torch.no_grad():
        mse = (model(data, sample=False).x_mu - data).pow(2).mean().item()
    variance = data.var(unbiased=False).item()
    assert mse > 0.5 * variance, (
        "an UNTRAINED model reconstructed the data well -- either the dataset has no "
        f"structure or something is leaking the target (mse={mse:.5f}, var={variance:.5f})"
    )


# --------------------------------------------------------------------------------------
# 2. Loss is a finite scalar; latents have the expected shapes
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize("batch", [1, 5, 32])
def test_loss_is_finite_scalar_and_latent_shapes(batch: int) -> None:
    model = make_model()
    torch.manual_seed(11)
    x = torch.randn(batch, INPUT_DIM)

    out = model(x)

    assert isinstance(out, FreeEnergyOutput)
    for name in ("loss", "reconstruction", "kl_z1", "kl_z2"):
        term = getattr(out, name)
        assert term.shape == torch.Size([]), f"{name} must be a scalar, got {tuple(term.shape)}"
        assert torch.isfinite(term), f"{name} is not finite"

    assert out.z1.shape == (batch, Z1_DIM)
    assert out.z2.shape == (batch, Z2_DIM)
    assert out.x_mu.shape == (batch, INPUT_DIM)
    assert out.x_logvar.shape == (batch, INPUT_DIM)
    assert out.q1_mu.shape == (batch, Z1_DIM)
    assert out.q1_logvar.shape == (batch, Z1_DIM)
    assert out.q2_mu.shape == (batch, Z2_DIM)
    assert out.q2_logvar.shape == (batch, Z2_DIM)
    assert out.p1_mu.shape == (batch, Z1_DIM)
    assert out.p1_logvar.shape == (batch, Z1_DIM)

    # The KL terms are non-negative by definition; a sign error in the closed form is the
    # classic way to get a loss that "improves" forever while learning nothing.
    assert out.kl_z1.item() >= -1e-5
    assert out.kl_z2.item() >= -1e-5

    # loss is exactly the sum of its three parts.
    total = out.reconstruction + out.kl_z1 + out.kl_z2
    assert torch.allclose(out.loss, total, atol=1e-6)


def test_free_energy_helper_matches_forward() -> None:
    model = make_model()
    torch.manual_seed(3)
    x = torch.randn(6, INPUT_DIM)
    a = model.free_energy(x, sample=False)
    b = model(x, sample=False).loss
    assert torch.allclose(a, b)


# --------------------------------------------------------------------------------------
# 3. Gradients populate on ALL parameters
# --------------------------------------------------------------------------------------
def test_gradients_populate_on_all_parameters() -> None:
    """Every parameter must receive a finite, non-trivial gradient.

    A hierarchical VAE has a specific failure mode: ``prior_bottom`` (p(z1|z2)) only ever
    gets gradient through the KL term, so if the KL is computed against a fixed N(0, I)
    by mistake, that whole sub-network silently never trains. Requiring a non-zero
    gradient on *every* named parameter catches that.
    """
    model = make_model(seed=21)
    torch.manual_seed(5)
    x = torch.randn(16, INPUT_DIM)

    model.zero_grad(set_to_none=True)
    model(x).loss.backward()

    for name, param in model.named_parameters():
        assert param.grad is not None, f"{name} received no gradient"
        assert torch.isfinite(param.grad).all(), f"{name} has a non-finite gradient"
        assert param.grad.abs().sum().item() > 0.0, f"{name} has an all-zero gradient"

    prior_params = [n for n, _ in model.named_parameters() if n.startswith("prior_bottom")]
    assert prior_params, "the learned prior p(z1|z2) has no parameters -- wrong architecture"


def test_reparameterisation_keeps_gradient_through_logvar() -> None:
    """The trick must pass gradient through the *scale*, not just the mean.

    Sampling ``z = mu + eps * exp(0.5 * logvar)`` is differentiable in ``logvar``;
    ``z = torch.normal(mu, std)`` is not. Both give the right shapes, so only a gradient
    check distinguishes them. The reconstruction term alone is used here because the KL
    terms depend on ``logvar`` analytically and would mask a detached sample.
    """
    model = make_model(seed=4)
    torch.manual_seed(6)
    x = torch.randn(8, INPUT_DIM)

    q2_mu, q2_logvar = model.encode_top(x)
    z2 = q2_mu + torch.randn_like(q2_mu) * torch.exp(0.5 * q2_logvar)
    q1_mu, q1_logvar = model.encode_bottom(x, z2)
    z1 = q1_mu + torch.randn_like(q1_mu) * torch.exp(0.5 * q1_logvar)
    x_mu, _ = model.decode(z1)

    model.zero_grad(set_to_none=True)
    (x_mu - x).pow(2).mean().backward()

    # The final bias of encoder_bottom feeds BOTH mu and logvar channels; the logvar half
    # can only be reached through the sampling path.
    logvar_bias_grad = model.encoder_bottom[-1].bias.grad
    assert logvar_bias_grad is not None
    assert logvar_bias_grad[Z1_DIM:].abs().sum().item() > 0.0, (
        "no gradient reached the log-variance channels -- the sample is detached from scale"
    )


# --------------------------------------------------------------------------------------
# 4. Determinism
# --------------------------------------------------------------------------------------
def test_determinism_under_manual_seed() -> None:
    """Same seed -> byte-identical init and byte-identical sampled forward pass."""

    def run() -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        torch.manual_seed(2024)
        model = HierarchicalPredictiveCoder(
            input_dim=INPUT_DIM, hidden_dim=16, z1_dim=Z1_DIM, z2_dim=Z2_DIM
        )
        x = torch.randn(7, INPUT_DIM)
        out = model(x)
        return out.loss.detach(), out.z1.detach(), out.z2.detach()

    loss_a, z1_a, z2_a = run()
    loss_b, z1_b, z2_b = run()

    assert torch.equal(loss_a, loss_b)
    assert torch.equal(z1_a, z1_b)
    assert torch.equal(z2_a, z2_b)


def test_sample_false_is_deterministic_without_any_seeding() -> None:
    """``sample=False`` must consume no randomness at all, so repeats are identical."""
    model = make_model(seed=13)
    torch.manual_seed(1)
    x = torch.randn(9, INPUT_DIM)

    first = model(x, sample=False)
    second = model(x, sample=False)

    assert torch.equal(first.z1, first.q1_mu), "sample=False must return the posterior mean"
    assert torch.equal(first.z2, first.q2_mu)
    assert torch.equal(first.z1, second.z1)
    assert torch.equal(first.z2, second.z2)
    assert torch.equal(first.loss, second.loss)


def test_sampling_actually_injects_noise() -> None:
    """The mirror of the previous test: ``sample=True`` must NOT be deterministic."""
    model = make_model(seed=13)
    torch.manual_seed(1)
    x = torch.randn(9, INPUT_DIM)

    torch.manual_seed(100)
    first = model(x).z1
    torch.manual_seed(101)
    second = model(x).z1

    assert not torch.equal(first, second), "sample=True produced identical draws"


def test_reparameterised_draws_match_requested_moments() -> None:
    """Empirically verify ``z ~ N(mu, exp(logvar))`` for a head pinned to known values.

    ``encoder_top`` is silenced so ``q(z2|x)`` is a constant Gaussian with a mean and
    log-variance we choose; the sample moments over many seeded draws must then match.
    This is what catches a scale bug such as using ``exp(logvar)`` instead of
    ``exp(0.5 * logvar)`` as the standard deviation.
    """
    model = make_model(seed=8, z2_dim=2)
    silence_network(model.encoder_top)
    target_mu = torch.tensor([2.0, -1.0])
    target_logvar = torch.tensor([math.log(4.0), math.log(0.25)])  # std 2.0 and 0.5
    with torch.no_grad():
        model.encoder_top[-1].bias.copy_(torch.cat([target_mu, target_logvar]))

    torch.manual_seed(77)
    x = torch.zeros(20000, INPUT_DIM)
    with torch.no_grad():
        z2 = model(x).z2

    assert torch.allclose(z2.mean(dim=0), target_mu, atol=0.05)
    assert torch.allclose(z2.std(dim=0), torch.tensor([2.0, 0.5]), rtol=0.05)


# --------------------------------------------------------------------------------------
# 5. Adversarial / numerical safety -- what the logvar clamp is for
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize("scale", [1e-30, 1e-6, 1e3, 1e6, 1e12, 1e18])
def test_extreme_magnitude_input_stays_finite(scale: float) -> None:
    """Extreme-but-representable inputs must not produce NaN/inf loss or gradients.

    Range note, stated honestly: ``1e18`` is the top of what float32 can survive here,
    because the Gaussian NLL squares the residual (``1e18 ** 2 == 1e36``, just under the
    float32 max of ~3.4e38). Beyond that the overflow is plain dtype range, not a defect
    in this module -- :func:`test_float64_survives_beyond_float32_range` shows the same
    input working in float64.
    """
    model = make_model(seed=31)
    x = torch.full((4, INPUT_DIM), scale)
    x[0, 0] = -scale  # mix signs so the residual cannot cancel by accident

    out = model(x)
    assert torch.isfinite(out.loss), f"loss is not finite at input scale {scale:g}"
    for name in ("reconstruction", "kl_z1", "kl_z2"):
        assert torch.isfinite(getattr(out, name)), f"{name} is not finite at scale {scale:g}"

    model.zero_grad(set_to_none=True)
    out.loss.backward()
    for name, param in model.named_parameters():
        assert param.grad is not None and torch.isfinite(param.grad).all(), (
            f"{name} gradient is not finite at input scale {scale:g}"
        )


def test_float64_survives_beyond_float32_range() -> None:
    """1e30 overflows float32 by squaring alone, but is fine in float64."""
    torch.manual_seed(41)
    model = HierarchicalPredictiveCoder(
        input_dim=INPUT_DIM, hidden_dim=16, z1_dim=Z1_DIM, z2_dim=Z2_DIM
    ).double()
    x = torch.full((3, INPUT_DIM), 1e30, dtype=torch.float64)
    assert torch.isfinite(model(x).loss)


def test_clamp_is_load_bearing() -> None:
    """Counterfactual proof that the clamp -- not luck -- is what keeps the loss finite.

    Two structurally identical models are given a log-variance head pinned at +200. With
    the clamp effectively disabled the KL term exponentiates it (``exp(200)`` overflows
    float32) and the loss becomes non-finite; with the documented ``[-10, 10]`` clamp the
    exact same configuration stays finite. If someone widens or removes the clamp, this
    test fails.
    """

    def build(logvar_min: float, logvar_max: float) -> HierarchicalPredictiveCoder:
        torch.manual_seed(5)
        model = HierarchicalPredictiveCoder(
            input_dim=INPUT_DIM,
            hidden_dim=16,
            z1_dim=Z1_DIM,
            z2_dim=Z2_DIM,
            logvar_min=logvar_min,
            logvar_max=logvar_max,
        )
        with torch.no_grad():
            model.encoder_bottom[-1].bias[Z1_DIM:].fill_(200.0)
        return model

    torch.manual_seed(3)
    x = torch.randn(5, INPUT_DIM)

    torch.manual_seed(9)
    unclamped_loss = build(-1e9, 1e9)(x).loss
    torch.manual_seed(9)
    clamped_loss = build(DEFAULT_LOGVAR_MIN, DEFAULT_LOGVAR_MAX)(x).loss

    assert not torch.isfinite(unclamped_loss), (
        "the counterfactual did not blow up -- this test no longer proves anything"
    )
    assert torch.isfinite(clamped_loss)


def test_logvars_are_reported_inside_the_clamp_range() -> None:
    """Every log-variance surfaced to the caller is already clamped."""
    model = make_model(seed=17)
    with torch.no_grad():
        for module in (model.encoder_top, model.encoder_bottom, model.prior_bottom, model.decoder):
            module[-1].bias.fill_(500.0)

    torch.manual_seed(2)
    out = model(torch.randn(4, INPUT_DIM))

    for name in ("x_logvar", "q1_logvar", "q2_logvar", "p1_logvar"):
        values = getattr(out, name)
        assert values.min().item() >= DEFAULT_LOGVAR_MIN
        assert values.max().item() <= DEFAULT_LOGVAR_MAX
        assert torch.allclose(values, torch.full_like(values, DEFAULT_LOGVAR_MAX))


# --------------------------------------------------------------------------------------
# 6. Head chunking, shapes contract, and constructor validation
# --------------------------------------------------------------------------------------
def test_head_chunking_puts_mu_first_and_logvar_second() -> None:
    """The first half of a head's channels is the mean, the second half the log-variance.

    Transposing this is silent -- shapes are unchanged -- so it is pinned explicitly by
    driving the decoder to a known constant output.
    """
    model = make_model(seed=19, input_dim=3, z1_dim=2, z2_dim=2, hidden_dim=8)
    silence_network(model.decoder)
    bias = torch.tensor([1.0, 2.0, 3.0, -0.5, 0.25, 4.0])  # [mu(3) | logvar(3)]
    with torch.no_grad():
        model.decoder[-1].bias.copy_(bias)

    mu, logvar = model.decode(torch.zeros(2, 2))

    assert torch.allclose(mu, bias[:3].expand(2, 3))
    assert torch.allclose(logvar, bias[3:].expand(2, 3))


def test_rejects_wrong_shaped_input() -> None:
    model = make_model()
    with pytest.raises(ValueError, match="2-D"):
        model(torch.randn(INPUT_DIM))
    with pytest.raises(ValueError, match="features"):
        model(torch.randn(4, INPUT_DIM + 1))


def test_rejects_invalid_construction() -> None:
    with pytest.raises(ValueError, match="input_dim"):
        HierarchicalPredictiveCoder(input_dim=0)
    with pytest.raises(ValueError, match="z1_dim"):
        HierarchicalPredictiveCoder(input_dim=4, z1_dim=-1)
    with pytest.raises(ValueError, match="logvar_min"):
        HierarchicalPredictiveCoder(input_dim=4, logvar_min=5.0, logvar_max=-5.0)


def test_encode_bottom_rejects_mismatched_z2() -> None:
    model = make_model()
    torch.manual_seed(0)
    x = torch.randn(4, INPUT_DIM)
    with pytest.raises(ValueError, match="z2 must have shape"):
        model.encode_bottom(x, torch.randn(3, Z2_DIM))
