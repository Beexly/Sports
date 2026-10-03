"""Verified Gemini wave-2 identities. Fail-closed. Not a clear.

Wired only where the wave order confirmed a form:
- distillation soft targets: arXiv:1503.02531 eq (1), PDF page 4.
  q_i = exp(z_i/T) / sum_j exp(z_j/T). T>0. Combined loss weights not printed; not invented.
- DDPM simplified loss: arXiv:2006.11239v2 eq (14), PDF page 5.
  Squared error of a supplied (eps, eps_hat) pair. Does not sample.
- Platt survey form 1/(1+exp(-(b*s+c))). Page UNVERIFIED (report conflicted 63 vs 6).
  Do not cite Platt 1999.
- Murphy identity only: BS = REL - RES + UNC. Named page 595. Not the partition sums.
- VAE ELBO: E[log p(x|z)] - KL. Bound above a supplied marginal returns None.
- Bradley-Terry: p_i/(p_i+p_j). Non-positive strength returns None.
- Prospect: x^alpha if x>=0 else -lambda*(-x)^beta. alpha or beta > 1 returns None. Named page 279.

Not wired as verified: DPO, PPO clip, LoRA, Kalman update, conformal Gamma_0.05.
Does not write mind.jsonl. Does not mint. Picks stay 0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "gemini_wave2"
PLATT_PAGE = "UNVERIFIED"


def distillation_soft_targets(z: Sequence[float] | None, T: float | None) -> list[float] | None:
    """q_i = exp(z_i/T) / sum_j exp(z_j/T). arXiv 1503.02531 eq (1), PDF page 4."""
    if z is None or T is None or len(z) == 0:
        return None
    t = float(T)
    if t <= 0.0:
        return None
    scaled = [float(v) / t for v in z]
    m = max(scaled)
    exps = [math.exp(v - m) for v in scaled]
    s = sum(exps)
    if s == 0.0:
        return None
    q = [e / s for e in exps]
    if abs(sum(q) - 1.0) > 1e-8:
        return None
    return q


def ddpm_simple_squared_error(eps: Sequence[float] | None, eps_hat: Sequence[float] | None) -> float | None:
    """||eps - eps_theta||^2 of a supplied pair. arXiv 2006.11239v2 eq (14), PDF page 5. No sampling."""
    if eps is None or eps_hat is None or len(eps) != len(eps_hat) or len(eps) == 0:
        return None
    return sum((float(a) - float(b)) ** 2 for a, b in zip(eps, eps_hat))


def platt_survey(s: float | None, b: float | None, c: float | None) -> float | None:
    """P(Y=1|s) = 1/(1+exp(-(b*s+c))). Survey form. Printed page UNVERIFIED."""
    if s is None or b is None or c is None:
        return None
    z = float(b) * float(s) + float(c)
    if z >= 0.0:
        ez = math.exp(-z)
        return 1.0 / (1.0 + ez)
    ez = math.exp(z)
    return ez / (1.0 + ez)


def murphy_brier_identity(rel: float | None, res: float | None, unc: float | None) -> float | None:
    """BS = REL - RES + UNC. Identity only. REL < 0 returns None."""
    if rel is None or res is None or unc is None:
        return None
    r = float(rel)
    if r < 0.0:
        return None
    return r - float(res) + float(unc)


def vae_elbo(expected_loglik: float | None, kl: float | None, marginal: float | None = None) -> float | None:
    """ELBO = E[log p(x|z)] - KL. Bound above a supplied marginal returns None."""
    if expected_loglik is None or kl is None:
        return None
    bound = float(expected_loglik) - float(kl)
    if marginal is not None and bound > float(marginal):
        return None
    return bound


def bradley_terry(p_i: float | None, p_j: float | None) -> float | None:
    """P(i beats j) = p_i / (p_i + p_j). Non-positive strength returns None."""
    if p_i is None or p_j is None:
        return None
    pi, pj = float(p_i), float(p_j)
    if pi <= 0.0 or pj <= 0.0:
        return None
    return pi / (pi + pj)


def prospect_value(x: float | None, alpha: float | None, beta: float | None, lam: float | None) -> float | None:
    """v(x)=x^alpha if x>=0 else -lambda*(-x)^beta. alpha or beta > 1 returns None."""
    if x is None or alpha is None or beta is None or lam is None:
        return None
    a, b, l = float(alpha), float(beta), float(lam)
    if a > 1.0 or b > 1.0 or l < 1.0:
        return None
    xx = float(x)
    if xx >= 0.0:
        return xx ** a
    return -l * ((-xx) ** b)


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "distillation_soft_targets",
    "ddpm_simple_squared_error",
    "platt_survey",
    "murphy_brier_identity",
    "vae_elbo",
    "bradley_terry",
    "prospect_value",
)
