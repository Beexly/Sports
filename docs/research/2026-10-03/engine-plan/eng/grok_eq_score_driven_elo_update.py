"""Score-driven Elo rating update from Holý & Černý arXiv:2604.09143, printed eq (2).

Printed: r_{t+1}^{(A)} = r_t^{(A)} + 16 (y_t^{(A)} - 1/(1+10^{-(rA-rB)/400}))

Fail-closed: non-finite, out-of-range returns None.
"""
from __future__ import annotations

import math
from typing import Optional

IDENTITY = "score_driven_elo_update_holy_cerny_2026"


def _finite_rating(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def score_driven_elo_update(
    r_a: float | None,
    r_b: float | None,
    y_a: float | None,
    k: float | None = 16.0,
) -> Optional[float]:
    """Elo update for player A. Printed in Holý & Černý 2026 eq (2)."""
    if not (_finite_rating(r_a) and _finite_rating(r_b) and _finite_rating(y_a) and _finite_rating(k)):
        return None
    if not (0.0 <= float(y_a) <= 1.0):
        return None
    if float(k) <= 0.0:
        return None
    ra = float(r_a)
    rb = float(r_b)
    ya = float(y_a)
    kk = float(k)
    try:
        expected = 1.0 / (1.0 + 10.0 ** (-(ra - rb) / 400.0))
        return ra + kk * (ya - expected)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None


COLUMN_BACKED_FUNCS: tuple[str, ...] = ("score_driven_elo_update",)
