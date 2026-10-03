"""Stated ML identity: pinball (quantile check) loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Koenker, R. & Bassett, G., "Regression Quantiles," Econometrica, vol. 46,
  no. 1, Jan. 1978, pp. 33–50. Check function (Eq. 2.3, p. 38):
  ρ_τ(u) = u (τ − I(u < 0)), equivalently
  ρ_τ(u) = τ·u if u ≥ 0 and (τ−1)·u if u < 0, for τ ∈ (0,1).
  Here u is the residual y − ŷ (caller-supplied).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def pinball_loss(
    residual: float | None,
    tau: float | None,
) -> float | None:
    """ρ_τ(u) = u (τ − I(u < 0)) (Koenker & Bassett 1978 Eq. 2.3).

    Missing → null. τ not in (0,1) → null.
    """
    if residual is None or tau is None:
        return None
    u = float(residual)
    t = float(tau)
    if not (0.0 < t < 1.0):
        return None
    if u < 0.0:
        return u * (t - 1.0)
    return u * t


COLUMN_BACKED_FUNCS: Sequence[str] = ("pinball_loss",)
