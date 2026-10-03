"""Stated scaled dot-product attention. No free coefficients beyond the paper.

Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V
Source: Vaswani et al., Attention Is All You Need, 2017,
https://arxiv.org/pdf/1706.03762 printed p. 4, equation (1).
d_k is supplied by the caller and must be positive (not hard-coded).
No score. No mint. Never main.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np


def _as_array(x: Any) -> np.ndarray | None:
    if x is None:
        return None
    try:
        arr = np.asarray(x, dtype=float)
    except (TypeError, ValueError):
        return None
    if arr.ndim < 2:
        return None
    if not np.isfinite(arr).all():
        return None
    return arr


def _softmax_last(x: np.ndarray) -> np.ndarray:
    shifted = x - np.max(x, axis=-1, keepdims=True)
    ex = np.exp(shifted)
    denom = np.sum(ex, axis=-1, keepdims=True)
    return ex / denom


def scaled_dot_product_attention(
    q: Any, k: Any, v: Any, d_k: float | None
) -> np.ndarray | None:
    """softmax(Q K^T / sqrt(d_k)) V. d_k must be positive and supplied."""
    if d_k is None:
        return None
    try:
        dk = float(d_k)
    except (TypeError, ValueError):
        return None
    if dk <= 0.0 or not math.isfinite(dk):
        return None
    qq = _as_array(q)
    kk = _as_array(k)
    vv = _as_array(v)
    if qq is None or kk is None or vv is None:
        return None
    # Q: (..., n, d), K: (..., m, d), V: (..., m, d_v)
    if qq.shape[-1] != kk.shape[-1]:
        return None
    if kk.shape[-2] != vv.shape[-2]:
        return None
    if qq.shape[:-2] != kk.shape[:-2] or kk.shape[:-2] != vv.shape[:-2]:
        return None
    scores = np.matmul(qq, np.swapaxes(kk, -1, -2)) / math.sqrt(dk)
    weights = _softmax_last(scores)
    return np.matmul(weights, vv)


FUNCTIONS = {
    "scaled_dot_product_attention": scaled_dot_product_attention,
}