"""A two-level hierarchical VAE-style module (`FreeEnergyCoder`).

RESEARCH SIDECAR — NOT PRODUCTION. See gse-ml-service/README.md and
app/main.py's module docstring for the full non-production banner.

Computes a variational free-energy (negative ELBO) loss for a two-level
latent-variable generative model:

    p(z2)          top-level prior, standard normal N(0, I)
    p(z1 | z2)     bottom-level prior, conditioned on z2 (NOT standard normal)
    p(x  | z1)     Gaussian likelihood / decoder

with an amortized inference (encoder) network for the matching posteriors:

    q(z2 | x)
    q(z1 | x, z2)

The trained objective is the standard hierarchical-VAE ELBO, expressed as a
loss to minimize (negative ELBO / variational free energy):

    loss = E_q[ -log p(x | z1) ]                       # Gaussian recon. NLL
         + KL( q(z2 | x)      || p(z2) )                # top-level KL
         + KL( q(z1 | x, z2)  || p(z1 | z2) )            # bottom-level KL

Both KL terms are computed with the SAME general Gaussian-Gaussian KL
formula (`_gaussian_kl`, below). This matters because the two terms are not
interchangeable special cases: the top-level KL compares against a fixed
`N(0, I)` prior (which the general formula reduces to when `mu_p = 0` and
`logvar_p = 0`), but the bottom-level KL compares `q(z1 | x, z2)` against
`p(z1 | z2)` — a *learned*, `z2`-dependent Gaussian prior, not `N(0, I)`. A
common bug in hierarchical-VAE implementations is to reuse the
standard-normal-only KL formula (`-0.5 * sum(1 + logvar - mu^2 - exp(logvar))`)
for the bottom level too, which is silently wrong whenever the prior isn't
`N(0, I)` — that mistake is avoided here by always using the general form.

Numerical stability: every `logvar` produced by the network (posteriors,
prior, and the decoder's reconstruction log-variance) is soft-clamped to
`[-10, 10]` via `torch.clamp` before any `exp()` is applied, preventing
`inf`/`nan` from runaway variance predictions during early, untrained
forward passes.
"""

from __future__ import annotations

import math

import torch
from torch import nn

_LOGVAR_MIN = -10.0
_LOGVAR_MAX = 10.0


class FreeEnergyCoder(nn.Module):
    """Two-level hierarchical VAE-style encoder/decoder with an ELBO loss.

    Warning
    -------
    This is untrained research scaffolding. With random initialization the
    loss value is meaningful only as a loss (it is a real, correctly-computed
    negative ELBO), but the sampled `z1`/`z2` and any reconstruction carry no
    real predictive signal until the module has been trained on real data.

    Parameters
    ----------
    x_dim:
        Dimensionality of the observed input `x`.
    z1_dim:
        Dimensionality of the bottom-level latent `z1`.
    z2_dim:
        Dimensionality of the top-level latent `z2`.
    hidden_dim:
        Hidden width used in all of the small MLPs (encoders, prior, decoder).
    """

    def __init__(self, x_dim: int, z1_dim: int, z2_dim: int, hidden_dim: int = 64) -> None:
        super().__init__()
        if x_dim < 1 or z1_dim < 1 or z2_dim < 1 or hidden_dim < 1:
            raise ValueError(
                "x_dim, z1_dim, z2_dim, and hidden_dim must all be positive integers "
                f"(got x_dim={x_dim!r}, z1_dim={z1_dim!r}, z2_dim={z2_dim!r}, "
                f"hidden_dim={hidden_dim!r})"
            )

        self.x_dim = x_dim
        self.z1_dim = z1_dim
        self.z2_dim = z2_dim

        # q(z2 | x)
        self.enc2 = nn.Sequential(nn.Linear(x_dim, hidden_dim), nn.ReLU())
        self.enc2_mu = nn.Linear(hidden_dim, z2_dim)
        self.enc2_logvar = nn.Linear(hidden_dim, z2_dim)

        # q(z1 | x, z2)
        self.enc1 = nn.Sequential(nn.Linear(x_dim + z2_dim, hidden_dim), nn.ReLU())
        self.enc1_mu = nn.Linear(hidden_dim, z1_dim)
        self.enc1_logvar = nn.Linear(hidden_dim, z1_dim)

        # p(z1 | z2) -- the "p_z1_given_z2" prior network. Crucially NOT
        # N(0, I): its mean/logvar are functions of z2.
        self.prior1 = nn.Sequential(nn.Linear(z2_dim, hidden_dim), nn.ReLU())
        self.prior1_mu = nn.Linear(hidden_dim, z1_dim)
        self.prior1_logvar = nn.Linear(hidden_dim, z1_dim)

        # p(x | z1) -- Gaussian decoder/likelihood.
        self.dec = nn.Sequential(nn.Linear(z1_dim, hidden_dim), nn.ReLU())
        self.dec_mu = nn.Linear(hidden_dim, x_dim)
        self.dec_logvar = nn.Linear(hidden_dim, x_dim)

    @staticmethod
    def _clamp_logvar(raw_logvar: torch.Tensor) -> torch.Tensor:
        """Soft-clamp a raw logvar prediction before it is ever exp()'d."""
        return torch.clamp(raw_logvar, min=_LOGVAR_MIN, max=_LOGVAR_MAX)

    @staticmethod
    def _gaussian_kl(
        mu_q: torch.Tensor,
        logvar_q: torch.Tensor,
        mu_p: torch.Tensor,
        logvar_p: torch.Tensor,
    ) -> torch.Tensor:
        """General KL divergence between two diagonal Gaussians, per example.

        Computes ``KL( N(mu_q, exp(logvar_q)) || N(mu_p, exp(logvar_p)) )``,
        summed over the last (feature) dimension, for each row in the batch.

        This is the *general* Gaussian-Gaussian KL:

            KL = 0.5 * sum_i [ (logvar_p - logvar_q)
                                + (exp(logvar_q) + (mu_q - mu_p)^2) / exp(logvar_p)
                                - 1 ]

        Setting ``mu_p = 0`` and ``logvar_p = 0`` recovers the familiar
        standard-normal-prior special case
        ``KL = -0.5 * sum_i (1 + logvar_q - mu_q^2 - exp(logvar_q))`` — but
        this function never assumes that special case, so it is correct for
        an arbitrary (e.g. learned, input-dependent) Gaussian prior too.
        """
        return 0.5 * (
            (logvar_p - logvar_q)
            + (torch.exp(logvar_q) + (mu_q - mu_p) ** 2) / torch.exp(logvar_p)
            - 1.0
        ).sum(dim=-1)

    def forward(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Run one forward pass: encode, sample both latents, decode, score.

        Parameters
        ----------
        x:
            Tensor of shape `(batch, x_dim)`.

        Returns
        -------
        (loss, z1, z2):
            `loss` is a scalar tensor (the batch-mean negative ELBO). `z1`
            has shape `(batch, z1_dim)`, `z2` has shape `(batch, z2_dim)` —
            both are samples drawn via the reparameterization trick, so they
            carry gradient.
        """
        if x.dim() != 2 or x.shape[1] != self.x_dim:
            raise ValueError(
                f"expected input of shape (batch, {self.x_dim}), got {tuple(x.shape)}"
            )
        if x.shape[0] < 1:
            raise ValueError("x must have at least one row (empty batch)")
        if not torch.isfinite(x).all():
            raise ValueError("x contains non-finite values (NaN or Inf)")

        # q(z2 | x)
        h2 = self.enc2(x)
        mu_q_z2 = self.enc2_mu(h2)
        logvar_q_z2 = self._clamp_logvar(self.enc2_logvar(h2))
        std_q_z2 = torch.exp(0.5 * logvar_q_z2)
        z2 = mu_q_z2 + torch.randn_like(std_q_z2) * std_q_z2

        # q(z1 | x, z2)
        h1 = self.enc1(torch.cat([x, z2], dim=-1))
        mu_q_z1 = self.enc1_mu(h1)
        logvar_q_z1 = self._clamp_logvar(self.enc1_logvar(h1))
        std_q_z1 = torch.exp(0.5 * logvar_q_z1)
        z1 = mu_q_z1 + torch.randn_like(std_q_z1) * std_q_z1

        # p(z1 | z2) -- learned prior, NOT N(0, I)
        hp1 = self.prior1(z2)
        mu_p_z1 = self.prior1_mu(hp1)
        logvar_p_z1 = self._clamp_logvar(self.prior1_logvar(hp1))

        # p(x | z1) -- Gaussian likelihood
        hd = self.dec(z1)
        mu_x = self.dec_mu(hd)
        logvar_x = self._clamp_logvar(self.dec_logvar(hd))

        # Gaussian reconstruction NLL, summed over feature dim, per example.
        recon_nll = 0.5 * (
            logvar_x
            + (x - mu_x) ** 2 / torch.exp(logvar_x)
            + math.log(2.0 * math.pi)
        ).sum(dim=-1)

        # KL(q(z2|x) || N(0,I)) -- general formula, special-cased via zeros.
        kl_z2 = self._gaussian_kl(
            mu_q_z2, logvar_q_z2, torch.zeros_like(mu_q_z2), torch.zeros_like(logvar_q_z2)
        )

        # KL(q(z1|x,z2) || p(z1|z2)) -- general formula against the LEARNED prior.
        kl_z1 = self._gaussian_kl(mu_q_z1, logvar_q_z1, mu_p_z1, logvar_p_z1)

        loss = (recon_nll + kl_z2 + kl_z1).mean()

        return loss, z1, z2
