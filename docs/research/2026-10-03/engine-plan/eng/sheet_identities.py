"""Opened identities. None on bad input. No mind.jsonl.

Lin 1991 footer 147 (4.1) and footer 149 (5.1), IEEE Trans. Inf. Theory 37(1).
Body log base 2. js_41_ln is the natural-log path (landed 98afa139 shape).
"""
from __future__ import annotations

import math
from typing import Iterable, Optional, Sequence

import numpy as np
from scipy.stats import norm


def _finite_num(x) -> bool:
    try:
        return bool(np.isfinite(float(x)))
    except (TypeError, ValueError):
        return False


def _entropy(p, base: float) -> Optional[float]:
    arr = np.asarray(p, dtype=float)
    if arr.ndim != 1 or arr.size == 0 or not np.isfinite(arr).all():
        return None
    if np.any(arr < -1e-12) or abs(float(arr.sum()) - 1.0) > 1e-9:
        return None
    arr = np.clip(arr, 0.0, 1.0)
    nz = arr[arr > 0]
    return float(-np.sum(nz * np.log(nz) / np.log(base)))


def _weights(pi, n: int) -> Optional[np.ndarray]:
    w = np.asarray(pi, dtype=float)
    if w.shape != (n,) or not np.isfinite(w).all():
        return None
    if np.any(w < -1e-12) or abs(float(w.sum()) - 1.0) > 1e-9:
        return None
    return w


def js_41(p, q, pi, base: float = 2.0):
    """Lin 1991 (4.1). Footer 147, right column. Weights sum to 1."""
    if not _finite_num(base) or base <= 1:
        return None
    w = _weights(pi, 2)
    if w is None:
        return None
    hp, hq = _entropy(p, base), _entropy(q, base)
    if hp is None or hq is None:
        return None
    pa, qa = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    if pa.shape != qa.shape:
        return None
    hm = _entropy(w[0] * pa + w[1] * qa, base)
    if hm is None:
        return None
    return hm - w[0] * hp - w[1] * hq


def js_41_ln(p, q, pi):
    """Natural-log path. Kept beside the base-2 path."""
    return js_41(p, q, pi, base=math.e)


def js_equal(p, q, base: float = 2.0):
    """Equal-weight case of (4.1). No second formula."""
    return js_41(p, q, [0.5, 0.5], base=base)


def js_51(ps, pi, base: float = 2.0):
    """Lin 1991 (5.1). Footer 149. n >= 2."""
    if not _finite_num(base) or base <= 1:
        return None
    rows = [np.asarray(p, dtype=float) for p in ps]
    if len(rows) < 2:
        return None
    w = _weights(pi, len(rows))
    if w is None:
        return None
    if any(r.shape != rows[0].shape for r in rows):
        return None
    hs = [_entropy(r, base) for r in rows]
    if any(h is None for h in hs):
        return None
    mix = sum(wi * r for wi, r in zip(w, rows))
    hm = _entropy(mix, base)
    if hm is None:
        return None
    return hm - float(sum(wi * h for wi, h in zip(w, hs)))


def chen_h(c, alpha):
    if not _finite_num(c) or not _finite_num(alpha):
        return None
    if alpha <= 0 or alpha >= 1 or c <= 0:
        return None
    lc = abs(math.log(c))
    return lc * (1 + lc ** (-alpha))


def chen_kendall(theta, R, c, T):
    if not _finite_num(c) or not _finite_num(T) or c <= 0 or T < 0:
        return None
    th, rr = list(theta), list(R)
    if len(th) != len(rr) or len(th) < 2:
        return None
    s = 0
    for i in range(len(th)):
        for j in range(i + 1, len(th)):
            s += int(th[i] > th[j] and rr[i] > rr[j]) + int(th[i] < th[j] and rr[i] < rr[j])
    return s + c * T


def divos_next_goal(l1, l2, T, t, side):
    if not all(_finite_num(v) for v in (l1, l2, T, t)):
        return None
    if l1 < 0 or l2 < 0 or t > T or side not in ("home", "away"):
        return None
    den = l1 + l2
    if den == 0:
        return None
    num = l1 if side == "home" else l2
    return (num / den) * (1 - math.exp(-den * (T - t)))


def divos_odd_even(l1, l2):
    if not all(_finite_num(v) for v in (l1, l2)) or l1 < 0 or l2 < 0:
        return None
    s = l1 + l2
    e = math.exp(-s)
    return (e * math.cosh(s), e * math.sinh(s))


def aldous_sigma(x):
    if not _finite_num(x) or x < 0 or x > 1:
        return None
    return math.sin(math.pi * x) / math.pi


def bass_sigma(x):
    if not _finite_num(x) or x <= 0 or x >= 1:
        return None
    return float(norm.pdf(norm.ppf(x)))


def dpo_7(log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta):
    vals = (log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta)
    if not all(_finite_num(v) for v in vals) or beta <= 0:
        return None
    z = beta * ((log_pi_w - log_ref_w) - (log_pi_l - log_ref_l))
    return -math.log(1.0 / (1.0 + math.exp(-z)))


def ppo_clip_7(ratio, adv, eps):
    if not all(_finite_num(v) for v in (ratio, adv, eps)) or eps <= 0:
        return None
    clipped = min(max(ratio, 1 - eps), 1 + eps)
    return min(ratio * adv, clipped * adv)


def lora_3(W0, x, B, A):
    mats = [np.asarray(v, dtype=float) for v in (W0, x, B, A)]
    if any(not np.isfinite(v).all() for v in mats):
        return None
    W0, x, B, A = mats
    return W0 @ x + B @ A @ x


def aci_2(alpha_t, gamma, alpha, err):
    if not all(_finite_num(v) for v in (alpha_t, gamma, alpha, err)) or gamma <= 0:
        return None
    return alpha_t + gamma * (alpha - err)
