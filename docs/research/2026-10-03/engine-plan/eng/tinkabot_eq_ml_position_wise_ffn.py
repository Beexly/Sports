"""Stated ML identity: Transformer position-wise FFN (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite positional_encoding, attention_scale, scaled Attention,
AdaMax u, Adam m̂/v̂, WIP/WIL, grok_eq_adam, R_lcs, GLEU, BERTScore*,
smatch, spice_*, PMI, ROUGE-L*, ECE, MCE, CIDEr*, BLEU, METEOR, chrF, TER,
cohen_kappa, matthews_corrcoef, equal-weight JS, Herbrich, or grok elastic.

Source:
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N.,
  Kaiser, Ł., & Polosukhin, I., "Attention Is All You Need," NeurIPS 2017 /
  arXiv:1706.03762.
  https://arxiv.org/pdf/1706.03762
  PDF Eq. (2): FFN(x) = max(0, xW1 + b1) W2 + b2.
  This module states that form in scalars (caller supplies the linear coeffs).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def position_wise_ffn(
    x: object,
    w1: object,
    b1: object,
    w2: object,
    b2: object,
) -> float | None:
    """FFN(x)=max(0, x·W1+b1)·W2+b2 (Vaswani et al. 2017, Eq.2, scalars).

    Missing → null. Non-finite → null.
    """
    vals = [_as_finite(v) for v in (x, w1, b1, w2, b2)]
    if any(v is None for v in vals):
        return None
    xf, w1f, b1f, w2f, b2f = vals  # type: ignore[misc]
    hidden = xf * w1f + b1f
    activated = max(0.0, hidden)
    return activated * w2f + b2f


COLUMN_BACKED_FUNCS: Sequence[str] = ("position_wise_ffn",)
