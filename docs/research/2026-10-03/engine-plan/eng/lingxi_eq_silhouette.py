"""Printed silhouette coefficient (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Spearman ρ, not Pearson, not batch-norm, not JS/KL/Hellinger.
Does not edit grok_eq_adam.

Rousseeuw, P. J., "Silhouettes: a graphical aid to the interpretation
and validation of cluster analysis," Journal of Computational and
Applied Mathematics 20 (1987) 53–65, §2 (definition of s(i)):

    s(i) = (b(i) − a(i)) / max{ a(i), b(i) }

where a(i) is the mean dissimilarity of i to points in its own cluster
and b(i) is the smallest mean dissimilarity of i to another cluster.
Caller supplies a and b (non-negative). When max(a,b)=0, s(i)=0
(Rousseeuw's convention for a singleton / empty comparison).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite_nonneg(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0.0:
        return None
    return number


def silhouette(a: object, b: object) -> float | None:
    """s = (b − a) / max(a, b) (Rousseeuw 1987 §2; s=0 if max=0).

    Missing / non-finite / negative → null.
    """
    aa = _as_finite_nonneg(a)
    bb = _as_finite_nonneg(b)
    if aa is None or bb is None:
        return None
    m = aa if aa >= bb else bb
    if m == 0.0:
        return 0.0
    out = (bb - aa) / m
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("silhouette",)