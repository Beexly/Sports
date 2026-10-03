"""Stated ML identity: mean squared error (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- scikit-learn User Guide, 3.4. Metrics and scoring — Mean squared error,
  https://scikit-learn.org/stable/modules/model_evaluation.html#mean-squared-error
  prints MSE(y, ŷ) = (1/n_samples) Σ (y_i − ŷ_i)².
  Equal-length sequences; empty → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def mean_squared_error(
    y_true: Sequence[float] | None,
    y_pred: Sequence[float] | None,
) -> float | None:
    """MSE = (1/n) Σ (y_i − ŷ_i)².

    Missing → null. Length mismatch or empty → null.
    """
    if y_true is None or y_pred is None:
        return None
    yt = [float(v) for v in y_true]
    yp = [float(v) for v in y_pred]
    if len(yt) == 0 or len(yt) != len(yp):
        return None
    total = sum((a - b) ** 2 for a, b in zip(yt, yp))
    return total / float(len(yt))


COLUMN_BACKED_FUNCS: Sequence[str] = ("mean_squared_error",)
