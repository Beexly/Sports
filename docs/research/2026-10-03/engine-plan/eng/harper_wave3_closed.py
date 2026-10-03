"""Wave-3 closed identities. Not a pick. Does not write mind.jsonl.

Printed sources verified this session against opened PDFs or HTML:
- distillation softmax: arXiv:1503.02531 eq (1). Softmax only. No combined-loss weights.
- DDPM squared error of a supplied pair: arXiv:2006.11239v2 eq (14). No sampling.
- Platt survey form: AAAI survey PDF eq (6), g_Platt(s)=sigma(bs+c).
  URL https://cdn.aaai.org/ojs/20326/20326-13-24339-1-2-20220628.pdf PDF page 3.
  Do not cite Platt 1999.
- Murphy identity only: BS = REL - RES + UNC. Named page 595. Component sums not extracted.
- VAE bound: -KL + E[log p(x|z)]. Bound above a supplied marginal returns None.
- Bradley-Terry: p_i / (p_i + p_j). Non-positive strength returns None.
- Prospect: x^alpha if x>=0 else -lambda*(-x)^beta. alpha or beta > 1 or lambda < 1 returns None.
- DPO one-pair term: arXiv:2305.18290 eq (7), printed footer page 4.
- PPO clip one-sample: arXiv:1707.06347 eq (7), PDF page 3.
- LoRA forward: arXiv:2106.09685 eq (3), PDF page 4: h = W0x + BAx.
  alpha/r is the following sentence, applied only if both are supplied.
- Kalman 1960 eq (21) via CMU mirror, journal page 40:
  x* = Phi* x* + Delta* y. Caller supplies the two products. Not the modern K form.
- TimeSoccer token NLL: arXiv:2504.17365 eq (2).
- arxiv-deep 1593 eq (1), 1594 accuracy, 1595 PairRank one-neighbor.
- mechanical_power P=W/t: non-finite returns None. Not a new identity.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional


def _finite(*xs: object) -> bool:
    for x in xs:
        if x is None or isinstance(x, bool) or not isinstance(x, (int, float)):
            return False
        if not math.isfinite(float(x)):
            return False
    return True


def distillation_soft_targets(z: Sequence[float], T: float) -> Optional[list[float]]:
    """q_i = exp(z_i/T) / sum_j exp(z_j/T). T<=0 returns None."""
    if not _finite(T) or float(T) <= 0:
        return None
    if not z:
        return None
    vals: list[float] = []
    for zi in z:
        if not _finite(zi):
            return None
        vals.append(float(zi))
    scaled = [math.exp(v / float(T)) for v in vals]
    total = sum(scaled)
    if total == 0.0 or not math.isfinite(total):
        return None
    return [x / total for x in scaled]


def ddpm_squared_error(eps: Sequence[float], eps_hat: Sequence[float]) -> Optional[float]:
    """Squared error of a supplied pair. Does not sample."""
    if len(eps) != len(eps_hat) or len(eps) == 0:
        return None
    acc = 0.0
    for a, b in zip(eps, eps_hat):
        if not _finite(a, b):
            return None
        d = float(a) - float(b)
        acc += d * d
    return acc


def platt_scaling(s: float, b: float, c: float) -> Optional[float]:
    """1 / (1 + exp(-(b*s + c))). Survey form only."""
    if not _finite(s, b, c):
        return None
    x = -(float(b) * float(s) + float(c))
    if x >= 0:
        e = math.exp(-x)
        return 1.0 / (1.0 + e)
    e = math.exp(x)
    return e / (1.0 + e)


def murphy_identity(rel: float, res: float, unc: float) -> Optional[float]:
    """BS = REL - RES + UNC. REL < 0 returns None."""
    if not _finite(rel, res, unc) or float(rel) < 0:
        return None
    return float(rel) - float(res) + float(unc)


def vae_bound(
    expected_log_lik: float, kl: float, marginal: Optional[float] = None
) -> Optional[float]:
    """ELBO = -KL + E[log p]. Bound above a supplied marginal returns None."""
    if not _finite(expected_log_lik, kl) or float(kl) < 0:
        return None
    bound = -float(kl) + float(expected_log_lik)
    if marginal is not None:
        if not _finite(marginal) or bound > float(marginal):
            return None
    return bound


def bradley_terry(p_i: float, p_j: float) -> Optional[float]:
    """P(i beats j) = p_i / (p_i + p_j). Non-positive strength returns None."""
    if not _finite(p_i, p_j) or float(p_i) <= 0 or float(p_j) <= 0:
        return None
    return float(p_i) / (float(p_i) + float(p_j))


def prospect_value(x: float, alpha: float, beta: float, lam: float) -> Optional[float]:
    """x^alpha if x>=0 else -lambda*(-x)^beta."""
    if not _finite(x, alpha, beta, lam):
        return None
    if float(alpha) > 1 or float(beta) > 1 or float(lam) < 1:
        return None
    if float(alpha) <= 0 or float(beta) <= 0:
        return None
    if float(x) >= 0:
        return float(x) ** float(alpha)
    return -float(lam) * ((-float(x)) ** float(beta))


def dpo_loss(log_ratio_w: float, log_ratio_l: float, beta: float) -> Optional[float]:
    """One-pair term of eq (7): -log sigmoid(beta*lw - beta*ll)."""
    if not _finite(log_ratio_w, log_ratio_l, beta) or float(beta) <= 0:
        return None
    z = float(beta) * float(log_ratio_w) - float(beta) * float(log_ratio_l)
    if z >= 0:
        return math.log1p(math.exp(-z))
    return -z + math.log1p(math.exp(z))


def ppo_clip(ratio: float, advantage: float, epsilon: float) -> Optional[float]:
    """One-sample min(r*A, clip(r, 1-eps, 1+eps)*A)."""
    if not _finite(ratio, advantage, epsilon):
        return None
    if float(epsilon) < 0 or float(epsilon) >= 1:
        return None
    clipped = min(max(float(ratio), 1.0 - float(epsilon)), 1.0 + float(epsilon))
    return min(float(ratio) * float(advantage), clipped * float(advantage))


def lora_forward(
    w0x: float,
    bax: float,
    alpha: Optional[float] = None,
    r: Optional[float] = None,
) -> Optional[float]:
    """Eq (3): h = W0x + BAx. Scale alpha/r only if both supplied."""
    if not _finite(w0x, bax):
        return None
    if alpha is None and r is None:
        return float(w0x) + float(bax)
    if alpha is None or r is None or not _finite(alpha, r) or float(r) == 0.0:
        return None
    return float(w0x) + (float(alpha) / float(r)) * float(bax)


def kalman_state_update(phi_x: float, delta_y: float) -> Optional[float]:
    """Eq (21) products already applied by the caller: Phi*x + Delta*y."""
    if not _finite(phi_x, delta_y):
        return None
    return float(phi_x) + float(delta_y)


def timesoccer_token_nll(log_probs: Sequence[float]) -> Optional[float]:
    """L = -sum log P. Positive or non-finite log-prob returns None. Empty returns None."""
    if not log_probs:
        return None
    acc = 0.0
    for lp in log_probs:
        if not _finite(lp) or float(lp) > 0:
            return None
        acc += float(lp)
    return -acc


def event_context(events: Sequence, k: int):
    """arXiv:2402.06820 eq (1): S_k = [e_{-1}, ..., e_{-k}]."""
    if not isinstance(k, int) or isinstance(k, bool) or k <= 0:
        return None
    if len(events) < k:
        return None
    return list(reversed(list(events[-k:])))


def accuracy(correct: float, total: float) -> Optional[float]:
    """arXiv:2307.10303: correct / total. Zero total returns None."""
    if not _finite(correct, total) or float(total) <= 0:
        return None
    if float(correct) < 0 or float(correct) > float(total):
        return None
    return float(correct) / float(total)


def pairrank_step(conf: float, neighbor_rho: float, d: float = 0.5) -> Optional[float]:
    """arXiv:1210.4854 eq (2), one neighbor: (1-d)*Conf + d*rho."""
    if not _finite(conf, neighbor_rho, d) or not (0.0 <= float(d) <= 1.0):
        return None
    return (1.0 - float(d)) * float(conf) + float(d) * float(neighbor_rho)


def mechanical_power(work: float, time: float) -> Optional[float]:
    """P = W/t. Non-finite or zero time returns None. Not a new identity."""
    if not _finite(work, time) or float(time) == 0.0:
        return None
    return float(work) / float(time)
