"""Stated ML identity: Adam bias-corrected second moment (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
Lingxi files, or grok_eq_adam.py. Does not score or mint. Does not touch
mind.jsonl or trainers. Does not rewrite adam_bias_corrected_m,
attention_scale, scaled_dot_product_attention, WER/MER/WIL/nWER/RIL,
GLEU, BERTScore*, smatch, spice_*, PMI, ROUGE-L*, ECE, MCE, CIDEr*,
BLEU, METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Kingma, D. P., & Ba, J., "Adam: A Method for Stochastic Optimization,"
  ICLR 2015 / arXiv:1412.6980.
  https://arxiv.org/pdf/1412.6980
  PDF Algorithm 1 (printed p.2): v̂_t ← v_t / (1 − β_2^t)
  (bias-corrected second raw moment estimate).
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


def adam_bias_corrected_v(v_t: object, beta2: object, t: object) -> float | None:
    """v̂_t = v_t / (1 − β_2^t) (Kingma & Ba 2015, Algorithm 1).

    Missing → null. Non-finite → null. beta2 not in [0,1) → null.
    t not a positive integer → null. Denominator 0 → null.
    """
    v = _as_finite(v_t)
    b2 = _as_finite(beta2)
    step = _as_finite(t)
    if v is None or b2 is None or step is None:
        return None
    if not (0.0 <= b2 < 1.0):
        return None
    if step <= 0 or step != math.floor(step):
        return None
    denom = 1.0 - (b2 ** int(step))
    if denom == 0.0:
        return None
    return v / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("adam_bias_corrected_v",)
