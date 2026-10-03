"""Printed odd-total bet value (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Divos, del Bano Rollin, Bihari, and Aste, Risk-Neutral Pricing and
Hedging of In-Play Football Bets, arXiv:1811.03931v1, Table A1 Odd row,
PDF page 20. Caption: Lambda_i = lambda_i * (T - t).

    exp(-(Lambda_1 + Lambda_2)) * cosh(Lambda_1 + Lambda_2)

Not equation (A1) next-goal, not the Even sinh row, and not the Skellam
winning-margin row.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def odd_total_value(
    lam_home: float | None,
    lam_away: float | None,
    remaining: float | None,
) -> float | None:
    """Table A1 Odd row. arXiv:1811.03931v1 PDF page 20. remaining is T-t."""
    if lam_home is None or lam_away is None or remaining is None:
        return None
    home = float(lam_home)
    away = float(lam_away)
    tau = float(remaining)
    if not all(math.isfinite(v) for v in (home, away, tau)):
        return None
    if home < 0.0 or away < 0.0 or tau < 0.0:
        return None
    mu = (home + away) * tau
    return math.exp(-mu) * math.cosh(mu)


COLUMN_BACKED_FUNCS = ("odd_total_value",)