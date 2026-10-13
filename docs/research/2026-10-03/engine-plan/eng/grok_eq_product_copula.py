"""Product (independence) copula from Sun & Yu, arXiv:2212.03281, section 3.2.

Printed: when all variables are independent, the copula is the product copula
C(u_1, ..., u_k) = product_{i=1}^k u_i .

Fail-closed: empty, non-finite, or any coordinate outside [0, 1] returns None.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional

IDENTITY = "product_copula_sun_yu_2022"


def _finite_unit(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
        and 0.0 <= float(value) <= 1.0
    )


def product_copula(us: Sequence[float] | None) -> Optional[float]:
    """Independence copula: product of uniform margins. Printed in 3.2."""
    if us is None or len(us) == 0:
        return None
    prod = 1.0
    for raw in us:
        if not _finite_unit(raw):
            return None
        prod *= float(raw)
    return prod


COLUMN_BACKED_FUNCS: Sequence[str] = ("product_copula",)
