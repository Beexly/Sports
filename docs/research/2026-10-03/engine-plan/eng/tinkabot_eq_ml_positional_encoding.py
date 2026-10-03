"""Stated ML identity: Transformer sinusoidal positional encoding (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite attention_scale, scaled_dot_product_attention, Adam m̂/v̂,
WIP/WIL/WER/MER/nWER/RIL, R_lcs, grok_eq_adam, GLEU, BERTScore*, smatch,
spice_*, PMI, ROUGE-L F/P, ECE, MCE, CIDEr*, BLEU, METEOR, chrF, TER,
cohen_kappa, matthews_corrcoef, equal-weight JS, Herbrich, or grok elastic.

Source:
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N.,
  Kaiser, Ł., & Polosukhin, I., "Attention Is All You Need," NeurIPS 2017 /
  arXiv:1706.03762.
  https://arxiv.org/pdf/1706.03762
  PDF §3.5: PE(pos,2i)=sin(pos/10000^{2i/d_model}),
  PE(pos,2i+1)=cos(pos/10000^{2i/d_model}).
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


def positional_encoding(pos: object, dim: object, d_model: object) -> float | None:
    """Sinusoidal PE at (pos, dim) (Vaswani et al. 2017, §3.5).

    Even dim=2i → sin(pos/10000^{2i/d_model}).
    Odd dim=2i+1 → cos(pos/10000^{2i/d_model}).
    Missing → null. Non-finite → null. dim not a non-negative integer → null.
    d_model not positive → null.
    """
    p = _as_finite(pos)
    d = _as_finite(dim)
    dm = _as_finite(d_model)
    if p is None or d is None or dm is None:
        return None
    if dm <= 0:
        return None
    if d < 0 or d != math.floor(d):
        return None
    dim_i = int(d)
    i = dim_i // 2
    angle = p / (10000.0 ** ((2 * i) / dm))
    if not math.isfinite(angle):
        return None
    if dim_i % 2 == 0:
        return math.sin(angle)
    return math.cos(angle)


COLUMN_BACKED_FUNCS: Sequence[str] = ("positional_encoding",)
