"""Stated ML identity: scaled-dot attention scale 1/√d_k (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite WER, MER, WIL, normalised_wer, GLEU, BERTScore*, smatch,
spice_*, PMI, ROUGE-L*, ECE, MCE, CIDEr*, BLEU, METEOR, chrF, TER,
cohen_kappa, matthews_corrcoef, equal-weight JS, Herbrich, or grok elastic.

Source:
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N.,
  Kaiser, Ł., & Polosukhin, I., "Attention Is All You Need," NeurIPS 2017 /
  arXiv:1706.03762.
  https://arxiv.org/pdf/1706.03762
  PDF around Eq. (1) Scaled Dot-Product Attention: divide scores by √d_k
  (Attention(Q,K,V) = softmax(QK^T / √d_k) V). This module states the
  printed scale factor 1/√d_k alone.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_positive(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0:
        return None
    return number


def attention_scale(d_k: object) -> float | None:
    """1/√d_k (Vaswani et al. 2017, Scaled Dot-Product Attention scale).

    Missing → null. Non-finite or non-positive d_k → null.
    """
    dk = _as_positive(d_k)
    if dk is None:
        return None
    return 1.0 / math.sqrt(dk)


COLUMN_BACKED_FUNCS: Sequence[str] = ("attention_scale",)
