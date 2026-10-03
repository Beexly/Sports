"""Stated ML identity: BERTScore precision P_BERT (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BERTScore F, spice_*, ECE, MCE, CIDEr*, BLEU, ROUGE,
METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Zhang, T., Kishore, V., Wu, F., Weinberger, K. Q., and Artzi, Y.,
  "BERTScore: Evaluating Text Generation with BERT,"
  ICLR 2020. arXiv:1904.09675.
  https://arxiv.org/pdf/1904.09675
  arXiv PDF page 4, Section 3 printed form:
  P_BERT = (1 / |x̂|) Σ_{x̂_j ∈ x̂} max_{x_i ∈ x} x_i^⊤ x̂_j,
  where x are reference token embeddings and x̂ are candidate token
  embeddings (pre-normalized; cosine reduces to inner product).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_float(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _as_floats(values: object) -> list[float] | None:
    if values is None or isinstance(values, (str, bytes)):
        return None
    if not isinstance(values, Sequence):
        return None
    out: list[float] = []
    for value in values:
        number = _as_float(value)
        if number is None:
            return None
        out.append(number)
    return out


def bertscore_precision(max_token_sims: Sequence[float] | None) -> float | None:
    """P_BERT = (1/|x̂|) Σ max_i x_i^⊤ x̂_j (Zhang et al. 2020, §3).

    Caller supplies, for each candidate token, the max similarity to a
    reference token. Missing → null. Empty → null. Non-finite → null.
    """
    sims = _as_floats(max_token_sims)
    if sims is None or not sims:
        return None
    return sum(sims) / float(len(sims))


COLUMN_BACKED_FUNCS: Sequence[str] = ("bertscore_precision",)
