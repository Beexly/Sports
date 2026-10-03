"""Stated ML/IR identity: BLEU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite matthews_corrcoef, equal-weight JS, or Herbrich margin ranking.

Source:
- Papineni, K., Roukos, S., Ward, T., and Zhu, W.-J., "BLEU: a Method for
  Automatic Evaluation of Machine Translation," Proceedings of the 40th
  Annual Meeting of the Association for Computational Linguistics (ACL),
  Philadelphia, July 2002, pp. 311-318.
  https://aclanthology.org/P02-1040.pdf
  Anthology PDF page 5 (section 2.3):
  BP = 1 if c > r, else e^(1-r/c);
  BLEU = BP · exp(sum_{n=1}^{N} w_n log p_n),
  with modified n-gram precisions p_n and positive weights w_n summing to 1.
  The same page prints the log form
  log BLEU = min(1-r/c, 0) + sum_{n=1}^{N} w_n log p_n.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def bleu_score(
    precisions: Sequence[float] | None,
    weights: Sequence[float] | None,
    candidate_len: float | None,
    reference_len: float | None,
) -> float | None:
    """BLEU = BP * exp(sum w_n log p_n), BP = 1 if c > r else exp(1-r/c).

    Papineni et al. ACL 2002, anthology PDF page 5.
    Missing → null. Non-positive c or r → null.
    Each p_n must lie in (0, 1]. Each w_n must be > 0 and the weights
    must sum to 1. Mismatched or empty sequences → null.
    """
    if (
        precisions is None
        or weights is None
        or candidate_len is None
        or reference_len is None
    ):
        return None
    if isinstance(precisions, (str, bytes)) or isinstance(weights, (str, bytes)):
        return None
    try:
        ps = [float(p) for p in precisions]
        ws = [float(w) for w in weights]
        c = float(candidate_len)
        r = float(reference_len)
    except (TypeError, ValueError):
        return None
    if not ps or len(ps) != len(ws):
        return None
    if not math.isfinite(c) or not math.isfinite(r) or c <= 0.0 or r <= 0.0:
        return None
    log_term = 0.0
    weight_sum = 0.0
    for p, w in zip(ps, ws):
        if not math.isfinite(p) or not math.isfinite(w):
            return None
        if p <= 0.0 or p > 1.0 or w <= 0.0:
            return None
        log_term += w * math.log(p)
        weight_sum += w
    if abs(weight_sum - 1.0) > 1e-9:
        return None
    # Printed: BP = 1 if c > r else e^(1-r/c).
    if c > r:
        bp = 1.0
    else:
        bp = math.exp(1.0 - (r / c))
    return bp * math.exp(log_term)


COLUMN_BACKED_FUNCS: Sequence[str] = ("bleu_score",)
