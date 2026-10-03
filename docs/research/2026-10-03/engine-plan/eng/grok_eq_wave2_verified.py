"""Wave-2 verified identities. Not a clear. Not a merge. No mind.jsonl. No picks.

Wired only where a printed page or an explicit UNVERIFIED page mark is named.
DPO, PPO clip, LoRA, Kalman update, and conformal Gamma_0.05 are not in this file.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "wave2_verified"


def soft_targets(z: Sequence[float] | None, T: float | None) -> list[float] | None:
    """q_i = exp(z_i/T) / sum_j exp(z_j/T).

    arXiv:1503.02531 equation (1), PDF page 4. Gemini NOT_IN_PDF mark was wrong.
    Combined distillation loss has no printed equation; weights are not invented.
    T <= 0 or empty logits -> None.
    """
    if T is None or z is None:
        return None
    temp = float(T)
    if temp <= 0.0:
        return None
    zs = [float(x) for x in z]
    if not zs:
        return None
    m = max(v / temp for v in zs)
    exps = [math.exp(v / temp - m) for v in zs]
    s = sum(exps)
    if s == 0.0:
        return None
    q = [e / s for e in exps]
    if abs(sum(q) - 1.0) > 1e-8:
        return None
    return q


def ddpm_simple_sqerr(eps: Sequence[float] | None, eps_hat: Sequence[float] | None) -> float | None:
    """Squared error of a supplied pair. Does not sample.

    arXiv:2006.11239v2 equation (14), PDF page 5, not page 2:
    L_simple = E ||eps - eps_theta(...)||^2. Caller supplies both vectors.
    """
    if eps is None or eps_hat is None:
        return None
    e = [float(x) for x in eps]
    h = [float(x) for x in eps_hat]
    if len(e) != len(h) or not e:
        return None
    return sum((a - b) ** 2 for a, b in zip(e, h))


def platt_scaling(s: float | None, b: float | None, c: float | None) -> float | None:
    """P(Y=1|s) = 1 / (1 + exp(-(b*s + c))).

    Survey form (Silva Filho et al.). Page UNVERIFIED (report conflict 63 vs 6).
    Do not cite Platt 1999 until that PDF opens.
    """
    if s is None or b is None or c is None:
        return None
    x = float(b) * float(s) + float(c)
    if x >= 0.0:
        return 1.0 / (1.0 + math.exp(-x))
    ex = math.exp(x)
    return ex / (1.0 + ex)


def murphy_brier(rel: float | None, res: float | None, unc: float | None) -> float | None:
    """BS = REL - RES + UNC. Murphy 1973, named page 595.

    Identity only. Component sums were not extracted. REL < 0 -> None.
    """
    if rel is None or res is None or unc is None:
        return None
    reliability = float(rel)
    if reliability < 0.0:
        return None
    return reliability - float(res) + float(unc)


def vae_elbo(
    expected_log_lik: float | None,
    kl: float | None,
    marginal: float | None = None,
) -> float | None:
    """ELBO = E[log p(x|z)] - KL(q||p). Kingma & Welling 2013, page 3.

    A bound above a supplied marginal returns None.
    """
    if expected_log_lik is None or kl is None:
        return None
    elbo = float(expected_log_lik) - float(kl)
    if marginal is not None and elbo > float(marginal):
        return None
    return elbo


def bradley_terry(p_i: float | None, p_j: float | None) -> float | None:
    """P(i beats j) = p_i / (p_i + p_j). Bradley & Terry 1952, page 324.

    Non-positive strength -> None. Complements of a valid pair sum to 1.
    """
    if p_i is None or p_j is None:
        return None
    a, b = float(p_i), float(p_j)
    if a <= 0.0 or b <= 0.0:
        return None
    return a / (a + b)


def prospect_value(
    x: float | None,
    alpha: float | None,
    beta: float | None,
    lam: float | None,
) -> float | None:
    """v(x) = x^alpha if x >= 0 else -lambda (-x)^beta.

    Kahneman & Tversky 1979, named page 279.
    Alpha or beta above 1, or lambda below 1, returns None.
    """
    if x is None or alpha is None or beta is None or lam is None:
        return None
    a, b, loss_mult = float(alpha), float(beta), float(lam)
    if a > 1.0 or b > 1.0 or loss_mult < 1.0:
        return None
    xx = float(x)
    if xx >= 0.0:
        return xx ** a
    return -loss_mult * ((-xx) ** b)


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "soft_targets",
    "ddpm_simple_sqerr",
    "platt_scaling",
    "murphy_brier",
    "vae_elbo",
    "bradley_terry",
    "prospect_value",
)

UNVERIFIED = (
    "dpo_loss",  # arXiv:2305.18290; printed page not confirmed in this session
    "ppo_clip",  # arXiv:1707.06347; printed page not confirmed in this session
    "lora_adaptation",  # arXiv:2106.09685; printed page not confirmed in this session
    "kalman_update",  # Kalman 1960; printed page not confirmed in this session
    "conformal_gamma",  # Gamma_0.05 is a symbol, not an algorithm; left unwired
)
