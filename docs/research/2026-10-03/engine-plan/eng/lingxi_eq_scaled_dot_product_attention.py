"""Printed scaled dot-product attention (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L.,
Gomez, A. N., Kaiser, Ł., & Polosukhin, I., Attention Is All You
Need, NeurIPS 2017 / arXiv:1706.03762, equation (1), PDF page 4:

    Attention(Q, K, V) = softmax(Q K^T / √d_k) V

Not the scale-only factor 1/√d_k alone (tinkabot_eq_ml_attention_scale),
not multi-head projection, not LayerNorm residual, not R_lcs / WER
cluster / Adam / softmax-as-standalone.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_matrix(x: object) -> list[list[float]] | None:
    if x is None or isinstance(x, (str, bytes, bool)):
        return None
    try:
        rows = list(x)  # type: ignore[arg-type]
    except TypeError:
        return None
    if len(rows) == 0:
        return None
    out: list[list[float]] = []
    width: int | None = None
    for row in rows:
        try:
            cells = [float(v) for v in row]
        except (TypeError, ValueError):
            return None
        if len(cells) == 0:
            return None
        if any(not math.isfinite(v) for v in cells):
            return None
        if width is None:
            width = len(cells)
        elif len(cells) != width:
            return None
        out.append(cells)
    return out


def _matmul(a: list[list[float]], b: list[list[float]]) -> list[list[float]] | None:
    if len(a[0]) != len(b):
        return None
    cols = len(b[0])
    result: list[list[float]] = []
    for row in a:
        out_row: list[float] = []
        for j in range(cols):
            s = 0.0
            for k, a_ik in enumerate(row):
                s += a_ik * b[k][j]
            if not math.isfinite(s):
                return None
            out_row.append(s)
        result.append(out_row)
    return result


def _transpose(m: list[list[float]]) -> list[list[float]]:
    return [[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]


def _softmax_rows(scores: list[list[float]]) -> list[list[float]] | None:
    weights: list[list[float]] = []
    for row in scores:
        m = max(row)
        exps = [math.exp(v - m) for v in row]
        denom = sum(exps)
        if denom == 0.0 or not math.isfinite(denom):
            return None
        weights.append([e / denom for e in exps])
    return weights


def scaled_dot_product_attention(
    q: Sequence[Sequence[float]] | None,
    k: Sequence[Sequence[float]] | None,
    v: Sequence[Sequence[float]] | None,
    d_k: float | None,
) -> list[list[float]] | None:
    """Equation (1), Vaswani et al. 2017 arXiv:1706.03762 PDF page 4."""
    if q is None or k is None or v is None or d_k is None:
        return None
    try:
        dk = float(d_k)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(dk) or dk <= 0.0:
        return None
    qq = _as_matrix(q)
    kk = _as_matrix(k)
    vv = _as_matrix(v)
    if qq is None or kk is None or vv is None:
        return None
    # Q: (n, d), K: (m, d), V: (m, d_v) — last dim of Q/K must match
    if len(qq[0]) != len(kk[0]):
        return None
    if len(kk) != len(vv):
        return None
    kt = _transpose(kk)
    scores = _matmul(qq, kt)
    if scores is None:
        return None
    scale = math.sqrt(dk)
    scaled = [[s_ij / scale for s_ij in row] for row in scores]
    weights = _softmax_rows(scaled)
    if weights is None:
        return None
    return _matmul(weights, vv)


COLUMN_BACKED_FUNCS: Sequence[str] = ("scaled_dot_product_attention",)