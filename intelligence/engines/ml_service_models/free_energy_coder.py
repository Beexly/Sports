"""Two-level hierarchical predictive coder (variational free energy / negative ELBO).

What this module IS
-------------------
A small, self-contained hierarchical VAE implemented in ``torch`` (CPU-friendly, no
CUDA-specific code). It defines four diagonal-Gaussian densities:

    q(z2 | x)        -- top-level approximate posterior          (``encode_top``)
    q(z1 | x, z2)    -- bottom-level approximate posterior       (``encode_bottom``)
    p(z1 | z2)       -- learned generative prior over z1         (``prior_bottom``)
    p(x  | z1)       -- Gaussian observation model               (``decode``)

and trains them by minimising the variational free energy (= negative ELBO):

    F = E_q[ -log p(x | z1) ]  +  KL( q(z1|x,z2) || p(z1|z2) )  +  KL( q(z2|x) || N(0, I) )

Each term is computed in closed form for diagonal Gaussians; the expectation over q is a
one-sample Monte-Carlo estimate using the reparameterisation trick, so the whole objective
is differentiable end-to-end. Minimising F is exactly "predictive coding": the top level
predicts the bottom level's prior, the bottom level predicts the observation, and each KL
is the cost of the prediction error the level below could not explain.

WHAT THIS MODULE IS NOT — READ THIS BEFORE USING IT ANYWHERE
------------------------------------------------------------
**A freshly constructed instance is UNTRAINED and emits NOISE.** Its parameters are
random initialisations. ``forward``/``decode`` on an untrained model produce numbers with
no relationship whatsoever to anything in the real world, and ``free_energy`` on an
untrained model is just the free energy of a random function. There is **no training data
in this repository** and this module ships no trained weights, no checkpoint loader, and
no fitted defaults — so unless *you* train it on real data that you supply, every output
is noise.

Consequently:

* **This is not a predictor.** Do not feed its outputs into picks, rankings, confidence
  scores, or published content.
* **This does not emit a probability.** Nothing here returns a value in [0, 1] with
  probabilistic meaning. ``x_mu`` is a conditional mean in the input's own units and
  ``loss`` is a nats-scale quantity that is routinely negative (continuous densities have
  no upper bound of 1). Do not squash any of it through a sigmoid and call it a win
  probability.
* Latent codes ``z1``/``z2`` from a *trained* instance are a legitimate learned
  representation — a feature extractor for a downstream, separately-validated model. That
  is the only intended use, and it is only valid after training and evaluation.

Numerical safety
----------------
Every log-variance produced by a network head is clamped to ``[logvar_min, logvar_max]``
(default ``[-10, 10]``) *before* it is ever exponentiated. This is load-bearing, not
decoration: an unclamped head can emit a large positive log-variance whose ``exp`` is
``inf`` (the KL terms exponentiate the log-variance directly), or a large negative one
whose ``exp(-logvar)`` precision weight in the Gaussian NLL overflows. With the clamp,
``exp(logvar)`` stays in ``[4.54e-5, 2.20e4]`` and the loss stays finite even for
extreme-magnitude inputs. The clamp is applied via ``torch.clamp``, whose gradient is zero
outside the range — a saturated head stops receiving gradient on that unit, which is the
intended trade (finite loss beats an unconstrained variance).

Inputs are **not** clamped or normalised. Feeding raw values spanning many orders of
magnitude will keep the loss finite but will train badly; standardise your features.

Shapes
------
All public entry points take ``x`` of shape ``(batch, input_dim)`` and return latents of
shape ``(batch, z1_dim)`` / ``(batch, z2_dim)``. Per-term losses are reduced by summing
over the feature/latent axis and averaging over the batch, so ``loss`` is a scalar in
nats-per-example.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Tuple

import torch
from torch import Tensor, nn

__all__ = [
    "HierarchicalPredictiveCoder",
    "FreeEnergyOutput",
    "DEFAULT_LOGVAR_MIN",
    "DEFAULT_LOGVAR_MAX",
]

_LOG_TWO_PI = math.log(2.0 * math.pi)

#: Documented clamp range for every log-variance in this module. ``exp`` of these bounds
#: is ``[4.5399e-05, 2.2026e+04]`` — comfortably finite in float32 and float64.
DEFAULT_LOGVAR_MIN = -10.0
DEFAULT_LOGVAR_MAX = 10.0


@dataclass(frozen=True)
class FreeEnergyOutput:
    """Everything one forward pass produces.

    Attributes
    ----------
    loss:
        Scalar variational free energy (negative ELBO), averaged over the batch. This is
        the quantity to call ``.backward()`` on. It is a *density* objective in nats and
        may be negative; that is normal and is not an error.
    reconstruction:
        Scalar ``E_q[-log p(x | z1)]`` term (Gaussian NLL), averaged over the batch.
    kl_z1:
        Scalar ``KL(q(z1|x,z2) || p(z1|z2))``, averaged over the batch.
    kl_z2:
        Scalar ``KL(q(z2|x) || N(0, I))``, averaged over the batch.
    x_mu, x_logvar:
        Parameters of ``p(x | z1)``, shape ``(batch, input_dim)``. ``x_logvar`` is already
        clamped. NOT a prediction unless the model has been trained.
    z1, z2:
        Sampled (or, with ``sample=False``, mean) latent codes, shapes ``(batch, z1_dim)``
        and ``(batch, z2_dim)``.
    q1_mu, q1_logvar, q2_mu, q2_logvar:
        Approximate-posterior parameters (clamped log-variances).
    p1_mu, p1_logvar:
        Learned prior ``p(z1|z2)`` parameters (clamped log-variance).
    """

    loss: Tensor
    reconstruction: Tensor
    kl_z1: Tensor
    kl_z2: Tensor
    x_mu: Tensor
    x_logvar: Tensor
    z1: Tensor
    z2: Tensor
    q1_mu: Tensor
    q1_logvar: Tensor
    q2_mu: Tensor
    q2_logvar: Tensor
    p1_mu: Tensor
    p1_logvar: Tensor


def _mlp(in_dim: int, hidden_dim: int, out_dim: int) -> nn.Sequential:
    """Two-hidden-layer MLP with tanh activations.

    ``tanh`` (rather than ReLU) keeps the pre-clamp head activations bounded per layer,
    which makes the extreme-input behaviour documented in the module docstring much
    tamer. It is not a modelling claim.
    """
    return nn.Sequential(
        nn.Linear(in_dim, hidden_dim),
        nn.Tanh(),
        nn.Linear(hidden_dim, hidden_dim),
        nn.Tanh(),
        nn.Linear(hidden_dim, out_dim),
    )


def _split_gaussian_params(
    head_output: Tensor, logvar_min: float, logvar_max: float
) -> Tuple[Tensor, Tensor]:
    """Split a ``(..., 2 * d)`` head into ``(mu, logvar)``, clamping ``logvar``.

    The head emits mean and log-variance concatenated along the last axis, so the split is
    exactly in half: the FIRST ``d`` channels are the mean and the LAST ``d`` are the
    log-variance. Getting this chunking wrong is silent — shapes still work — so it lives
    in one place.
    """
    if head_output.shape[-1] % 2 != 0:
        raise ValueError(
            f"Gaussian head must emit an even number of channels, got {head_output.shape[-1]}"
        )
    mu, logvar = head_output.chunk(2, dim=-1)
    return mu, torch.clamp(logvar, min=logvar_min, max=logvar_max)


def _reparameterise(mu: Tensor, logvar: Tensor, sample: bool) -> Tensor:
    """Draw ``z = mu + eps * exp(0.5 * logvar)``, ``eps ~ N(0, I)``.

    With ``sample=False`` this returns ``mu`` unchanged (the posterior mean), which makes
    encoding deterministic. Gradients flow through ``mu`` and ``logvar`` in both cases;
    ``eps`` carries no gradient by construction, which is the point of the trick.
    """
    if not sample:
        return mu
    eps = torch.randn_like(mu)
    return mu + eps * torch.exp(0.5 * logvar)


def _diag_gaussian_nll(x: Tensor, mu: Tensor, logvar: Tensor) -> Tensor:
    """``-log N(x | mu, diag(exp(logvar)))``, summed over the last axis.

    Computed as ``0.5 * sum(log(2*pi) + logvar + (x - mu)^2 * exp(-logvar))``. The
    precision ``exp(-logvar)`` is formed from the already-clamped log-variance, never from
    a raw head output.
    """
    precision = torch.exp(-logvar)
    return 0.5 * (_LOG_TWO_PI + logvar + (x - mu).pow(2) * precision).sum(dim=-1)


def _kl_diag_gaussians(
    mu_q: Tensor, logvar_q: Tensor, mu_p: Tensor, logvar_p: Tensor
) -> Tensor:
    """``KL(N(mu_q, exp(logvar_q)) || N(mu_p, exp(logvar_p)))``, summed over the last axis.

    Closed form for diagonal Gaussians::

        0.5 * sum( logvar_p - logvar_q + (exp(logvar_q) + (mu_q - mu_p)^2) / exp(logvar_p) - 1 )

    Division is written as multiplication by ``exp(-logvar_p)`` so no division by a
    possibly-underflowing variance ever happens. Both log-variances must already be
    clamped; ``exp`` of an unclamped value is exactly the ``inf`` this module exists to
    avoid.
    """
    return 0.5 * (
        logvar_p
        - logvar_q
        + (torch.exp(logvar_q) + (mu_q - mu_p).pow(2)) * torch.exp(-logvar_p)
        - 1.0
    ).sum(dim=-1)


def _kl_standard_normal(mu: Tensor, logvar: Tensor) -> Tensor:
    """``KL(N(mu, exp(logvar)) || N(0, I))``, summed over the last axis."""
    return 0.5 * (torch.exp(logvar) + mu.pow(2) - 1.0 - logvar).sum(dim=-1)


class HierarchicalPredictiveCoder(nn.Module):
    """Two-level hierarchical VAE trained by minimising variational free energy.

    **UNTRAINED INSTANCES EMIT NOISE.** See the module docstring: this class ships no
    trained weights and there is no training data in this repository. Outputs of an
    untrained instance are a random function of the input and must never be used as a
    prediction, a score, or a probability.

    Parameters
    ----------
    input_dim:
        Dimensionality of an observation ``x``.
    hidden_dim:
        Width of the hidden layers in every sub-network.
    z1_dim:
        Dimensionality of the bottom latent (the one that generates ``x``).
    z2_dim:
        Dimensionality of the top latent (the one whose prior is ``N(0, I)``).
    logvar_min, logvar_max:
        Clamp range applied to every log-variance before exponentiation. Defaults
        ``[-10, 10]``. Widening this range re-introduces the overflow the clamp prevents.

    Examples
    --------
    >>> import torch
    >>> torch.manual_seed(0)  # doctest: +ELLIPSIS
    <torch._C.Generator object at ...>
    >>> model = HierarchicalPredictiveCoder(input_dim=6, hidden_dim=16, z1_dim=4, z2_dim=2)
    >>> out = model(torch.randn(8, 6))
    >>> out.z1.shape, out.z2.shape
    (torch.Size([8, 4]), torch.Size([8, 2]))
    >>> bool(torch.isfinite(out.loss))
    True
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        z1_dim: int = 16,
        z2_dim: int = 8,
        logvar_min: float = DEFAULT_LOGVAR_MIN,
        logvar_max: float = DEFAULT_LOGVAR_MAX,
    ) -> None:
        super().__init__()

        for name, value in (
            ("input_dim", input_dim),
            ("hidden_dim", hidden_dim),
            ("z1_dim", z1_dim),
            ("z2_dim", z2_dim),
        ):
            if not isinstance(value, int) or isinstance(value, bool) or value < 1:
                raise ValueError(f"{name} must be a positive int, got {value!r}")
        if not (logvar_min < logvar_max):
            raise ValueError(
                f"logvar_min must be < logvar_max, got {logvar_min!r} and {logvar_max!r}"
            )

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.z1_dim = z1_dim
        self.z2_dim = z2_dim
        self.logvar_min = float(logvar_min)
        self.logvar_max = float(logvar_max)

        # q(z2 | x)
        self.encoder_top = _mlp(input_dim, hidden_dim, 2 * z2_dim)
        # q(z1 | x, z2) -- conditioned on BOTH the observation and the top latent.
        self.encoder_bottom = _mlp(input_dim + z2_dim, hidden_dim, 2 * z1_dim)
        # p(z1 | z2) -- the learned generative prior the top level predicts downward.
        self.prior_bottom = _mlp(z2_dim, hidden_dim, 2 * z1_dim)
        # p(x | z1)
        self.decoder = _mlp(z1_dim, hidden_dim, 2 * input_dim)

    # ------------------------------------------------------------------
    # Density heads
    # ------------------------------------------------------------------
    def _check_input(self, x: Tensor) -> None:
        if x.dim() != 2:
            raise ValueError(f"x must be 2-D (batch, input_dim), got shape {tuple(x.shape)}")
        if x.shape[1] != self.input_dim:
            raise ValueError(
                f"x has {x.shape[1]} features but this model was built for {self.input_dim}"
            )

    def encode_top(self, x: Tensor) -> Tuple[Tensor, Tensor]:
        """Return ``(mu, logvar)`` of ``q(z2 | x)``; ``logvar`` is clamped."""
        self._check_input(x)
        return _split_gaussian_params(self.encoder_top(x), self.logvar_min, self.logvar_max)

    def encode_bottom(self, x: Tensor, z2: Tensor) -> Tuple[Tensor, Tensor]:
        """Return ``(mu, logvar)`` of ``q(z1 | x, z2)``; ``logvar`` is clamped."""
        self._check_input(x)
        if z2.shape != (x.shape[0], self.z2_dim):
            raise ValueError(
                f"z2 must have shape {(x.shape[0], self.z2_dim)}, got {tuple(z2.shape)}"
            )
        head = self.encoder_bottom(torch.cat([x, z2], dim=-1))
        return _split_gaussian_params(head, self.logvar_min, self.logvar_max)

    def prior_z1(self, z2: Tensor) -> Tuple[Tensor, Tensor]:
        """Return ``(mu, logvar)`` of the learned prior ``p(z1 | z2)``; ``logvar`` clamped."""
        return _split_gaussian_params(self.prior_bottom(z2), self.logvar_min, self.logvar_max)

    def decode(self, z1: Tensor) -> Tuple[Tensor, Tensor]:
        """Return ``(mu, logvar)`` of the observation model ``p(x | z1)``.

        ``mu`` is a conditional mean in the input's own units. It is NOT a probability and
        is meaningless until the model has been trained.
        """
        return _split_gaussian_params(self.decoder(z1), self.logvar_min, self.logvar_max)

    # ------------------------------------------------------------------
    # Free energy
    # ------------------------------------------------------------------
    def forward(self, x: Tensor, sample: bool = True) -> FreeEnergyOutput:
        """Run one full inference + generation pass and compute the free energy.

        Parameters
        ----------
        x:
            Observations, shape ``(batch, input_dim)``.
        sample:
            ``True`` (default) draws both latents with the reparameterisation trick, which
            is what training needs. ``False`` uses the posterior means, making the pass
            deterministic (useful for extracting stable codes or comparing runs). The KL
            terms are closed-form and identical either way; only the reconstruction term's
            Monte-Carlo estimate is affected.

        Returns
        -------
        FreeEnergyOutput
            ``loss`` is the scalar to backpropagate.
        """
        self._check_input(x)

        q2_mu, q2_logvar = self.encode_top(x)
        z2 = _reparameterise(q2_mu, q2_logvar, sample)

        q1_mu, q1_logvar = self.encode_bottom(x, z2)
        z1 = _reparameterise(q1_mu, q1_logvar, sample)

        p1_mu, p1_logvar = self.prior_z1(z2)
        x_mu, x_logvar = self.decode(z1)

        recon = _diag_gaussian_nll(x, x_mu, x_logvar).mean()
        kl_z1 = _kl_diag_gaussians(q1_mu, q1_logvar, p1_mu, p1_logvar).mean()
        kl_z2 = _kl_standard_normal(q2_mu, q2_logvar).mean()
        loss = recon + kl_z1 + kl_z2

        return FreeEnergyOutput(
            loss=loss,
            reconstruction=recon,
            kl_z1=kl_z1,
            kl_z2=kl_z2,
            x_mu=x_mu,
            x_logvar=x_logvar,
            z1=z1,
            z2=z2,
            q1_mu=q1_mu,
            q1_logvar=q1_logvar,
            q2_mu=q2_mu,
            q2_logvar=q2_logvar,
            p1_mu=p1_mu,
            p1_logvar=p1_logvar,
        )

    def free_energy(self, x: Tensor, sample: bool = True) -> Tensor:
        """Convenience wrapper returning only the scalar free-energy loss."""
        return self.forward(x, sample=sample).loss
